use crate::parser::RawEvent;
use chrono::{DateTime, FixedOffset, Local, NaiveDateTime, Offset, TimeZone};
use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NormalizedEvent {
    pub raw: RawEvent,
    pub subject: String,
    pub type_: String,
    pub start_iso: String,
    pub end_iso: String,
    pub duration_hours: f32, // Duration in hours, computed after TZ conversion
}

fn local_offset() -> FixedOffset {
    #[cfg(test)]
    {
        // Deterministic offset in tests (UTC) to keep expectations stable
        FixedOffset::east_opt(0).unwrap()
    }

    #[cfg(not(test))]
    {
        Local::now().offset().fix()
    }
}

fn parse_ical_datetime(s: &str) -> Option<DateTime<FixedOffset>> {
    let trimmed = s.trim();

    // Try explicit Z (UTC)
    if let Ok(dt) = DateTime::parse_from_str(trimmed, "%Y%m%dT%H%M%SZ") {
        return Some(dt.with_timezone(&local_offset()));
    }

    // Try explicit offset
    if let Ok(dt) = DateTime::parse_from_str(trimmed, "%Y%m%dT%H%M%S%z") {
        return Some(dt.with_timezone(&local_offset()));
    }

    // Fallback: naive local datetime
    if let Ok(naive) = NaiveDateTime::parse_from_str(trimmed, "%Y%m%dT%H%M%S") {
        // Convert naive to local offset; if ambiguous, pick the first
        return local_offset().from_local_datetime(&naive).single();
    }

    None
}

pub fn normalize(events: Vec<RawEvent>) -> Vec<NormalizedEvent> {
    // Heuristic Regexes (ordered rules)
    // 1) TYPE + SUBJECT  e.g. "CM PRORES", "TD EXPO IA"
    let re_type_subject = Regex::new(
        r"(?i)^\s*(CM|TD|TP|CT|DS|EXAM|PROJET|RÉUNION|REUNION)\b[\s-]+(.+)$",
    )
    .unwrap();

    // 2) SUBJECT + TYPE  e.g. "PPAR TD", "IPD TP Cla 1"
    let re_subject_type = Regex::new(
        r"(?i)^\s*(.+?)\s+(CM|TD|TP|CT|DS|EXAM|PROJET|RÉUNION|REUNION)(?:\b|\s|$)",
    )
    .unwrap();

    // 3) SUBJECT - TYPE  e.g. "BDL2 TD - Coworking space"
    let re_subject_dash_type = Regex::new(
        r"(?i)^\s*(.+?)\s*-\s*(CM|TD|TP|CT|DS|EXAM|PROJET|RÉUNION|REUNION)\b.*$",
    )
    .unwrap();

    events
        .into_iter()
        .map(|raw| {
            let summary = raw.summary.trim();

            // Determine type/subject with ordered rules
            let (type_, subject) = if let Some(caps) = re_type_subject.captures(summary) {
                (caps[1].to_string(), caps[2].to_string())
            } else if let Some(caps) = re_subject_dash_type.captures(summary) {
                (caps[2].to_string(), caps[1].to_string())
            } else if let Some(caps) = re_subject_type.captures(summary) {
                (caps[2].to_string(), caps[1].to_string())
            } else {
                ("Autre".to_string(), summary.to_string())
            };

            // Calculate Duration and ISO strings (converted to local time)
            let start_dt = parse_ical_datetime(&raw.start);
            let end_dt = parse_ical_datetime(&raw.end);

            let mut duration_hours = 0.0;
            let mut start_iso = raw.start.clone();
            let mut end_iso = raw.end.clone();

            if let (Some(s), Some(e)) = (start_dt, end_dt) {
                let diff = e - s;
                duration_hours = diff.num_minutes() as f32 / 60.0;

                // Local ISO without timezone suffix (browser treats as local time)
                start_iso = s.format("%Y-%m-%dT%H:%M:%S").to_string();
                end_iso = e.format("%Y-%m-%dT%H:%M:%S").to_string();
            }

            NormalizedEvent {
                subject: subject.trim().to_string(),
                type_: type_.to_uppercase(),
                start_iso,
                end_iso,
                duration_hours,
                raw,
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::RawEvent;

    fn make_event(summary: &str, start: &str, end: &str) -> RawEvent {
        RawEvent {
            summary: summary.to_string(),
            start: start.to_string(),
            end: end.to_string(),
            uid: "uid".to_string(),
            description: "".to_string(),
            location: "".to_string(),
        }
    }

    #[test]
    fn test_heuristics_and_duration() {
        // 08:00 to 10:00 -> 2 hours
        let e1 = make_event("CM PRORES", "20250101T080000", "20250101T100000");
        let e2 = make_event("IPD TP Cla 1", "20250101T100000Z", "20250101T113000Z"); // 1.5 hours
        let e3 = make_event(
            "TD Standard résidentiel",
            "20250101T140000",
            "20250101T170000",
        ); // 3 hours
        let e4 = make_event(
            "Réunion pédagogique Responsables formation",
            "20250101T090000",
            "20250101T094500",
        ); // 0.75 hours
        let e5 = make_event("Autre chose", "20250101T120000", "20250101T120000"); // 0 hours

        let events = vec![e1, e2, e3, e4, e5];
        let normalized = normalize(events);

        assert_eq!(normalized[0].type_, "CM");
        assert_eq!(normalized[0].subject, "PRORES");
        assert_eq!(normalized[0].duration_hours, 2.0);
        assert_eq!(normalized[0].start_iso, "2025-01-01T08:00:00");
        assert_eq!(normalized[0].end_iso, "2025-01-01T10:00:00");

        assert_eq!(normalized[1].type_, "TP");
        assert_eq!(normalized[1].subject, "IPD");
        assert_eq!(normalized[1].duration_hours, 1.5);
        // With test offset fixed to UTC, the local times match UTC inputs
        assert_eq!(normalized[1].start_iso, "2025-01-01T10:00:00");
        assert_eq!(normalized[1].end_iso, "2025-01-01T11:30:00");

        assert_eq!(normalized[2].type_, "TD");
        assert_eq!(normalized[2].subject, "Standard résidentiel");
        assert_eq!(normalized[2].duration_hours, 3.0);

        assert_eq!(normalized[3].type_, "RÉUNION"); // Uppercase logic
        assert_eq!(normalized[3].subject, "pédagogique Responsables formation");
        assert_eq!(normalized[3].duration_hours, 0.75);

        assert_eq!(normalized[4].type_, "AUTRE");
        assert_eq!(normalized[4].subject, "Autre chose");
        assert_eq!(normalized[4].duration_hours, 0.0);
    }

    #[test]
    fn test_additional_patterns() {
        let e1 = make_event("PPAR TD", "20250102T080000", "20250102T093000");
        let e2 = make_event("BDL2 TD - Coworking space - PNRB", "20250103T100000", "20250103T120000");
        let e3 = make_event("Réunion pédagogique Responsables formation", "20250104T070000", "20250104T083000");

        let normalized = normalize(vec![e1, e2, e3]);

        assert_eq!(normalized[0].type_, "TD");
        assert_eq!(normalized[0].subject, "PPAR");

        assert_eq!(normalized[1].type_, "TD");
        assert_eq!(normalized[1].subject, "BDL2");

        assert!(normalized[2].type_.contains("RÉUNION") || normalized[2].type_.contains("REUNION"));
        assert!(normalized[2].subject.to_lowercase().contains("pédagogique"));
    }
}
