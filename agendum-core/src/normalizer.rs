use crate::parser::RawEvent;
use chrono::{DateTime, FixedOffset, NaiveDate, NaiveDateTime, TimeZone};
#[cfg(not(test))]
use chrono::{Local, Offset};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeSet, HashSet};
use std::sync::OnceLock;

const TYPE_TOKEN: &str = r"(?:CM|TD|TP|CT|DS|CC|EXAM|PROJET|RÉUNION|REUNION)";
const TYPE_SUFFIX: &str = r"(?:\d+(?:[.-]\d+)*[A-G]?|[A-G])?";

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NormalizedEvent {
    pub raw: RawEvent,
    pub subject: String,
    pub type_: String,
    pub start_iso: String,
    pub end_iso: String,
    pub duration_hours: f32, // Duration in hours, computed after TZ conversion
    pub teachers: Vec<String>,
    pub promos: Vec<String>,
    pub cleaned_description: String,
}

fn re_type_subject() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(&format!(
            r"(?i)^\s*({TYPE_TOKEN}){TYPE_SUFFIX}\b[\s-]+(.+)$"
        ))
        .unwrap()
    })
}

fn re_subject_type() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(&format!(
            r"(?i)^\s*(.+?)\s+({TYPE_TOKEN}){TYPE_SUFFIX}(?:\b|\s|$)"
        ))
        .unwrap()
    })
}

fn re_subject_dash_type() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(&format!(
            r"(?i)^\s*(.+?)\s*-\s*({TYPE_TOKEN}){TYPE_SUFFIX}\b.*$"
        ))
        .unwrap()
    })
}

fn re_name_inline() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"(?u)(?:[A-ZÀ-ÖØ-Ý][A-ZÀ-ÖØ-Ý'’-]*\s+){1,3}[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ'’-]+").unwrap()
    })
}

fn re_stuck_name() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"(?u)^([A-ZÀ-ÖØ-Ý'’-]{2,})([A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ'’-]+)$").unwrap()
    })
}

fn re_line_unfold() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\n[ \t]+").unwrap())
}

fn re_modified_paren() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)\([^)]*modifi[eé]\s*le[^)]*\)").unwrap())
}

fn re_modified_suffix() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)modifi[eé]\s*le:?[^\n]*").unwrap())
}

fn re_modified_line() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)modifi[eé]\s*le").unwrap())
}

fn re_split_chunks() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"[;,]+|\s+[\\/|&+]\s+").unwrap())
}

fn re_only_punctuation_line() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"^[.\-–—]+$").unwrap())
}

fn re_mld_level() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)\b[MLD]\d\b").unwrap())
}

fn re_promo_keywords() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(
            r"(?i)\b(master|licence|parcours|groupe|mineure|majeure|promo|promotion|alternant|classique|option|module|semestre|ue)\b",
        )
        .unwrap()
    })
}

fn re_trailing_date() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(
            r"(?u)^(?P<base>.*?)(?:\s*[-–—,:;]?\s*)?\(?\s*(?P<day>\d{1,2})[\/\.-](?P<month>\d{1,2})[\/\.-](?P<year>\d{2}|\d{4})\s*\)?\s*$",
        )
        .unwrap()
    })
}

fn stop_tokens() -> &'static HashSet<&'static str> {
    static TOKENS: OnceLock<HashSet<&'static str>> = OnceLock::new();
    TOKENS.get_or_init(|| {
        HashSet::from([
            "licence",
            "license",
            "master",
            "parcours",
            "promo",
            "promotion",
            "groupe",
            "group",
            "mineure",
            "mineures",
            "majeure",
            "majeures",
            "alternant",
            "alternants",
            "classique",
            "classiques",
            "option",
            "module",
            "semestre",
            "ue",
            "cours",
            "cm",
            "td",
            "tp",
            "exam",
            "examen",
            "projet",
            "reunion",
            "réunion",
            "stage",
            "soutenance",
            "rattrapage",
            "alt",
            "cla",
        ])
    })
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

    // Try explicit Z (UTC) by parsing as naive then assuming UTC
    if let Some(stripped) = trimmed.strip_suffix('Z') {
        if let Ok(naive) = NaiveDateTime::parse_from_str(stripped, "%Y%m%dT%H%M%S") {
            let utc = FixedOffset::east_opt(0)?
                .from_local_datetime(&naive)
                .single()?;
            return Some(utc.with_timezone(&local_offset()));
        }
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

fn collapse_whitespace(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn split_word_parts(word: &str) -> Vec<String> {
    word.replace('’', "'")
        .split(['-', '\''])
        .filter(|part| !part.is_empty())
        .map(|part| part.to_string())
        .collect()
}

fn is_alpha_part(part: &str) -> bool {
    !part.is_empty() && part.chars().all(|ch| ch.is_alphabetic())
}

fn is_upper_part(part: &str) -> bool {
    is_alpha_part(part) && part.chars().all(|ch| ch.is_uppercase())
}

fn is_title_part(part: &str) -> bool {
    if !is_alpha_part(part) {
        return false;
    }
    let mut chars = part.chars();
    let Some(first) = chars.next() else {
        return false;
    };
    first.is_uppercase() && chars.all(|ch| ch.is_lowercase())
}

fn is_upper_word(word: &str) -> bool {
    split_word_parts(word)
        .iter()
        .all(|part| is_upper_part(part))
}

fn is_title_word(word: &str) -> bool {
    split_word_parts(word)
        .iter()
        .all(|part| is_title_part(part))
}

fn normalize_token(token: &str) -> String {
    token
        .replace('’', "'")
        .chars()
        .filter(|ch| ch.is_alphanumeric())
        .collect::<String>()
        .to_lowercase()
}

fn is_likely_promo_line(line: &str) -> bool {
    let words: Vec<&str> = line
        .split_whitespace()
        .map(str::trim)
        .filter(|word| !word.is_empty())
        .collect();
    if words.is_empty() {
        return false;
    }

    for word in words {
        let normalized = normalize_token(word);
        if normalized.is_empty() {
            continue;
        }
        if normalized.chars().any(|ch| ch.is_ascii_digit()) {
            return true;
        }
        if re_mld_level().is_match(&normalized) {
            return true;
        }
        if stop_tokens().contains(normalized.as_str()) {
            return true;
        }
    }
    false
}

fn is_likely_name(token: &str) -> bool {
    let cleaned = collapse_whitespace(token.trim());
    if cleaned.is_empty() {
        return false;
    }
    if cleaned.chars().any(|ch| ch.is_ascii_digit()) {
        return false;
    }

    let lower = cleaned.to_lowercase();
    if lower.contains("http://") || lower.contains("https://") || cleaned.contains('@') {
        return false;
    }
    if cleaned.contains(" - ")
        || cleaned.contains(" – ")
        || cleaned.contains(" — ")
        || cleaned.contains(" / ")
    {
        return false;
    }
    if cleaned.chars().any(|ch| "<>{}()[]".contains(ch)) {
        return false;
    }

    let parts: Vec<&str> = cleaned.split(' ').collect();
    if parts.len() < 2 || parts.len() > 5 {
        return false;
    }

    let mut upper_count = 0;
    let mut title_count = 0;

    for part in &parts {
        let normalized = normalize_token(part);
        if normalized.is_empty() || stop_tokens().contains(normalized.as_str()) {
            return false;
        }
        if !split_word_parts(part)
            .iter()
            .all(|piece| is_alpha_part(piece))
        {
            return false;
        }
        if is_upper_word(part) {
            upper_count += 1;
        }
        if is_title_word(part) {
            title_count += 1;
        }
    }

    if upper_count == 0 || title_count == 0 {
        return false;
    }

    let last = parts[parts.len() - 1];
    is_title_word(last) || is_upper_word(last)
}

fn split_stuck_name(token: &str) -> Option<String> {
    let trimmed = token.trim();
    if trimmed.is_empty() || trimmed.chars().any(|ch| ch.is_whitespace()) {
        return None;
    }
    let cleaned = trimmed.trim_matches(|ch: char| !ch.is_alphabetic());
    if cleaned.is_empty() {
        return None;
    }
    let caps = re_stuck_name().captures(cleaned)?;
    Some(format!("{} {}", &caps[1], &caps[2]))
}

fn extract_names_from_text(text: &str) -> BTreeSet<String> {
    let mut names = BTreeSet::new();
    let cleaned = collapse_whitespace(text.trim());
    if cleaned.is_empty() {
        return names;
    }

    if is_likely_name(&cleaned) {
        names.insert(cleaned.clone());
    }

    if let Some(repaired) = split_stuck_name(&cleaned) {
        if is_likely_name(&repaired) {
            names.insert(repaired);
        }
    }

    for m in re_name_inline().find_iter(&cleaned) {
        let candidate = collapse_whitespace(m.as_str().trim());
        if is_likely_name(&candidate) {
            names.insert(candidate);
        }
    }

    names
}

fn normalize_description(desc: &str) -> String {
    let normalized = desc.replace('\r', "\n");
    let unfolded = re_line_unfold().replace_all(&normalized, "");
    unfolded.replace("\\n", "\n").replace("\\N", "\n")
}

fn strip_modified_noise(desc: &str) -> String {
    let without_paren = re_modified_paren().replace_all(desc, "");
    let without_suffix = re_modified_suffix().replace_all(&without_paren, "");
    without_suffix.trim().to_string()
}

fn score_promo(line: &str) -> i32 {
    let mut score = 0;
    if line.chars().any(|ch| ch.is_ascii_digit()) {
        score += 3;
    }
    if re_mld_level().is_match(line) {
        score += 2;
    }
    if re_promo_keywords().is_match(line) {
        score += 2;
    }
    if !line.trim().is_empty() {
        score += 1;
    }
    score
}

fn extract_teachers_and_promos(description: &str) -> (Vec<String>, Vec<String>, String) {
    let raw_desc = normalize_description(description);
    if raw_desc.trim().is_empty() {
        return (vec!["—".to_string()], Vec::new(), String::new());
    }

    let cleaned_description = strip_modified_noise(raw_desc.trim());
    let lines: Vec<String> = cleaned_description
        .split('\n')
        .map(|line| line.trim().to_string())
        .filter(|line| !line.is_empty())
        .filter(|line| !re_modified_line().is_match(line))
        .filter(|line| !re_only_punctuation_line().is_match(line))
        .collect();

    let mut teacher_set: BTreeSet<String> = BTreeSet::new();
    let mut promo_candidates: Vec<String> = Vec::new();

    for line in lines {
        let line_promo_like = is_likely_promo_line(&line);
        let chunks: Vec<String> = re_split_chunks()
            .split(&line)
            .map(str::trim)
            .filter(|chunk| !chunk.is_empty())
            .map(|chunk| chunk.to_string())
            .collect();

        let mut found_teacher = false;
        for chunk in &chunks {
            let names = if line_promo_like {
                BTreeSet::new()
            } else {
                extract_names_from_text(chunk)
            };

            if names.is_empty() {
                if !line_promo_like {
                    promo_candidates.push(chunk.clone());
                }
                continue;
            }

            found_teacher = true;
            teacher_set.extend(names);
        }

        if line_promo_like {
            promo_candidates.push(line.clone());
        } else if !found_teacher && chunks.is_empty() {
            promo_candidates.push(line.clone());
        }
    }

    if teacher_set.is_empty() {
        teacher_set.insert("—".to_string());
    }

    let mut scored_promos: Vec<(String, i32)> = promo_candidates
        .into_iter()
        .map(|line| {
            let score = score_promo(&line);
            (line, score)
        })
        .collect();
    scored_promos.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));

    let strong_promos: Vec<String> = scored_promos
        .iter()
        .filter(|(_, score)| *score >= 4)
        .map(|(line, _)| line.clone())
        .collect();

    let selected_promos = if strong_promos.is_empty() {
        scored_promos
            .first()
            .map(|(line, _)| vec![line.clone()])
            .unwrap_or_default()
    } else {
        strong_promos
    };

    let promos = selected_promos
        .into_iter()
        .filter(|line| !line.trim().is_empty())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();

    (
        teacher_set.into_iter().collect::<Vec<_>>(),
        promos,
        cleaned_description,
    )
}

fn is_code_like_token(token: &str) -> bool {
    let compact = token
        .chars()
        .filter(|ch| ch.is_alphanumeric())
        .collect::<String>();
    if compact.len() < 2 {
        return false;
    }
    compact
        .chars()
        .all(|ch| ch.is_ascii_digit() || ch.is_uppercase())
}

fn is_code_like_subject(subject: &str) -> bool {
    let cleaned = collapse_whitespace(subject.trim());
    if cleaned.is_empty() {
        return false;
    }
    if cleaned.chars().any(|ch| ch.is_ascii_digit()) {
        return true;
    }
    cleaned.split_whitespace().any(is_code_like_token)
}

fn is_collapsible_trailing_type(detected_type: &str) -> bool {
    detected_type.eq_ignore_ascii_case("projet")
        || detected_type.eq_ignore_ascii_case("project")
        || detected_type.eq_ignore_ascii_case("reunion")
        || detected_type.eq_ignore_ascii_case("réunion")
}

fn should_preserve_trailing_type_suffix(subject_candidate: &str, detected_type: &str) -> bool {
    is_collapsible_trailing_type(detected_type) && !is_code_like_subject(subject_candidate)
}

fn is_valid_calendar_date(day_raw: &str, month_raw: &str, year_raw: &str) -> bool {
    let Ok(day) = day_raw.parse::<u32>() else {
        return false;
    };
    let Ok(month) = month_raw.parse::<u32>() else {
        return false;
    };
    let Ok(raw_year) = year_raw.parse::<i32>() else {
        return false;
    };

    let year = if year_raw.len() == 2 {
        2000 + raw_year
    } else {
        raw_year
    };
    if !(1900..=2200).contains(&year) {
        return false;
    }

    NaiveDate::from_ymd_opt(year, month, day).is_some()
}

fn strip_trailing_date_if_valid(value: &str) -> String {
    let compact = collapse_whitespace(value.trim());
    if compact.is_empty() {
        return compact;
    }

    let Some(caps) = re_trailing_date().captures(&compact) else {
        return compact;
    };

    let day = caps.name("day").map(|m| m.as_str()).unwrap_or("");
    let month = caps.name("month").map(|m| m.as_str()).unwrap_or("");
    let year = caps.name("year").map(|m| m.as_str()).unwrap_or("");

    if !is_valid_calendar_date(day, month, year) {
        return compact;
    }

    let base = caps.name("base").map(|m| m.as_str()).unwrap_or("");
    let stripped = collapse_whitespace(base.trim());
    if stripped.is_empty() {
        compact
    } else {
        stripped
    }
}

pub fn normalize(events: Vec<RawEvent>) -> Vec<NormalizedEvent> {
    let re_type_subject = re_type_subject();
    let re_subject_dash_type = re_subject_dash_type();
    let re_subject_type = re_subject_type();

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
                let detected_type = caps[2].to_string();
                let extracted_subject = caps[1].trim().to_string();
                let subject = if should_preserve_trailing_type_suffix(
                    &extracted_subject,
                    &detected_type,
                ) {
                    summary.to_string()
                } else {
                    extracted_subject
                };
                (detected_type, subject)
            } else {
                ("Autre".to_string(), summary.to_string())
            };

            let (teachers, promos, cleaned_description) =
                extract_teachers_and_promos(&raw.description);

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
                subject: strip_trailing_date_if_valid(subject.trim()),
                type_: type_.to_uppercase(),
                start_iso,
                end_iso,
                duration_hours,
                teachers,
                promos,
                cleaned_description,
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
        let e2 = make_event(
            "BDL2 TD - Coworking space - PNRB",
            "20250103T100000",
            "20250103T120000",
        );
        let e3 = make_event(
            "Réunion pédagogique Responsables formation",
            "20250104T070000",
            "20250104T083000",
        );
        let e4 = make_event("MODX TP3.1", "20250105T070000", "20250105T083000");
        let e5 = make_event("CC1 MODX", "20250106T070000", "20250106T083000");

        let normalized = normalize(vec![e1, e2, e3, e4, e5]);

        assert_eq!(normalized[0].type_, "TD");
        assert_eq!(normalized[0].subject, "PPAR");

        assert_eq!(normalized[1].type_, "TD");
        assert_eq!(normalized[1].subject, "BDL2");

        assert!(normalized[2].type_.contains("RÉUNION") || normalized[2].type_.contains("REUNION"));
        assert!(normalized[2].subject.to_lowercase().contains("pédagogique"));

        assert_eq!(normalized[3].type_, "TP");
        assert_eq!(normalized[3].subject, "MODX");

        assert_eq!(normalized[4].type_, "CC");
        assert_eq!(normalized[4].subject, "MODX");
    }

    #[test]
    fn test_project_and_reunion_suffix_preserved_for_natural_language_titles() {
        let e1 = make_event(
            "Présentation projet",
            "20250107T080000",
            "20250107T100000",
        );
        let e2 = make_event("IPD Projet", "20250107T100000", "20250107T120000");
        let e3 = make_event(
            "Présentation réunion",
            "20250107T130000",
            "20250107T140000",
        );
        let e4 = make_event("IPD Réunion", "20250107T140000", "20250107T150000");

        let normalized = normalize(vec![e1, e2, e3, e4]);

        assert_eq!(normalized[0].type_, "PROJET");
        assert_eq!(normalized[0].subject, "Présentation projet");

        assert_eq!(normalized[1].type_, "PROJET");
        assert_eq!(normalized[1].subject, "IPD");

        assert!(
            normalized[2].type_.contains("RÉUNION") || normalized[2].type_.contains("REUNION")
        );
        assert_eq!(normalized[2].subject, "Présentation réunion");

        assert!(
            normalized[3].type_.contains("RÉUNION") || normalized[3].type_.contains("REUNION")
        );
        assert_eq!(normalized[3].subject, "IPD");
    }

    #[test]
    fn test_strip_trailing_dates_only_when_valid() {
        let e1 = make_event(
            "Conseil des études 11/12/25",
            "20250108T080000",
            "20250108T090000",
        );
        let e2 = make_event(
            "Conseil des études 31/02/25",
            "20250108T100000",
            "20250108T110000",
        );
        let e3 = make_event(
            "Présentation projet 11/12/25",
            "20250108T120000",
            "20250108T130000",
        );
        let e4 = make_event(
            "Présentation projet 45/12/25",
            "20250108T140000",
            "20250108T150000",
        );

        let normalized = normalize(vec![e1, e2, e3, e4]);

        assert_eq!(normalized[0].type_, "AUTRE");
        assert_eq!(normalized[0].subject, "Conseil des études");

        assert_eq!(normalized[1].type_, "AUTRE");
        assert_eq!(normalized[1].subject, "Conseil des études 31/02/25");

        assert_eq!(normalized[2].type_, "PROJET");
        assert_eq!(normalized[2].subject, "Présentation projet");

        assert_eq!(normalized[3].type_, "PROJET");
        assert_eq!(normalized[3].subject, "Présentation projet 45/12/25");
    }

    #[test]
    fn test_metadata_extraction() {
        let mut e1 = make_event("CM Algo", "20250101T080000", "20250101T100000");
        e1.description =
            "DUPONT Jean\nM1 Informatique Groupe A\nModifié le: 01/01/2025".to_string();

        let mut e2 = make_event("TD Maths", "20250101T100000", "20250101T120000");
        e2.description = "MARTINPaul\nL3 MIAGE".to_string();

        let normalized = normalize(vec![e1, e2]);

        assert_eq!(normalized[0].teachers, vec!["DUPONT Jean"]);
        assert_eq!(normalized[0].promos, vec!["M1 Informatique Groupe A"]);
        assert!(!normalized[0]
            .cleaned_description
            .to_lowercase()
            .contains("modifié le"));

        assert_eq!(normalized[1].teachers, vec!["MARTIN Paul"]);
        assert_eq!(normalized[1].promos, vec!["L3 MIAGE"]);
    }

    #[test]
    fn test_metadata_fallback_when_description_missing() {
        let e = make_event("CM Algo", "20250101T080000", "20250101T100000");
        let normalized = normalize(vec![e]);

        assert_eq!(normalized[0].teachers, vec!["—"]);
        assert!(normalized[0].promos.is_empty());
        assert!(normalized[0].cleaned_description.is_empty());
    }
}
