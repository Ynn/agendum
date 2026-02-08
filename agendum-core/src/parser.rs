use ical::IcalParser;
use serde::{Deserialize, Serialize};
use std::io::BufReader;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RawEvent {
    pub uid: String,
    pub summary: String,
    pub description: String,
    pub location: String,
    pub start: String,
    pub end: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ParseDiagnostics {
    pub calendars_parsed: u32,
    pub parser_errors: u32,
    pub skipped_events_without_uid: u32,
    pub parser_error_messages: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ParseOutput {
    pub events: Vec<RawEvent>,
    pub diagnostics: ParseDiagnostics,
}

fn unescape_ical(s: &str) -> String {
    s.replace("\\n", "\n")
        .replace("\\N", "\n")
        .replace("\\,", ",")
        .replace("\\;", ";")
        .replace("\\\\", "\\")
}

pub fn parse_ics_content(content: &str) -> Vec<RawEvent> {
    parse_ics_content_with_diagnostics(content).events
}

pub fn parse_ics_content_with_diagnostics(content: &str) -> ParseOutput {
    let buf = BufReader::new(content.as_bytes());
    let parser = IcalParser::new(buf);
    let mut events = Vec::new();
    let mut diagnostics = ParseDiagnostics::default();

    for line in parser {
        match line {
            Ok(calendar) => {
                diagnostics.calendars_parsed += 1;
                for component in calendar.events {
                    let mut uid = String::new();
                    let mut summary = String::new();
                    let mut description = String::new();
                    let mut location = String::new();
                    let mut start = String::new();
                    let mut end = String::new();

                    for property in component.properties {
                        let val = property.value.unwrap_or_default();
                        match property.name.as_str() {
                            "UID" => uid = val,
                            "SUMMARY" => summary = unescape_ical(&val),
                            "DESCRIPTION" => description = unescape_ical(&val),
                            "LOCATION" => location = unescape_ical(&val),
                            "DTSTART" => start = val,
                            "DTEND" => end = val,
                            _ => {}
                        }
                    }

                    if !uid.is_empty() {
                        events.push(RawEvent {
                            uid,
                            summary,
                            description,
                            location,
                            start,
                            end,
                        });
                    } else {
                        diagnostics.skipped_events_without_uid += 1;
                    }
                }
            }
            Err(e) => {
                diagnostics.parser_errors += 1;
                if diagnostics.parser_error_messages.len() < 5 {
                    diagnostics.parser_error_messages.push(e.to_string());
                }
            }
        }
    }

    ParseOutput {
        events,
        diagnostics,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_reports_skipped_events_without_uid_and_unescapes_fields() {
        let ics = "BEGIN:VCALENDAR\r\n\
VERSION:2.0\r\n\
BEGIN:VEVENT\r\n\
UID:evt-1\r\n\
SUMMARY:CM Algo\r\n\
DESCRIPTION:L1\\nGroupe A\r\n\
LOCATION:Salle\\, B12\r\n\
DTSTART:20250101T080000\r\n\
DTEND:20250101T100000\r\n\
END:VEVENT\r\n\
BEGIN:VEVENT\r\n\
SUMMARY:No UID\r\n\
DTSTART:20250101T110000\r\n\
DTEND:20250101T120000\r\n\
END:VEVENT\r\n\
END:VCALENDAR\r\n";

        let parsed = parse_ics_content_with_diagnostics(ics);

        assert_eq!(parsed.diagnostics.calendars_parsed, 1);
        assert_eq!(parsed.diagnostics.parser_errors, 0);
        assert_eq!(parsed.diagnostics.skipped_events_without_uid, 1);
        assert_eq!(parsed.events.len(), 1);

        let event = &parsed.events[0];
        assert_eq!(event.uid, "evt-1");
        assert_eq!(event.summary, "CM Algo");
        assert!(event.description.starts_with("L1"));
        assert!(event.description.contains('\n'));
        assert!(event.description.ends_with("Groupe A"));
        assert_eq!(event.location, "Salle, B12");
    }

    #[test]
    fn parse_reports_parser_errors_for_malformed_ics() {
        let malformed = "BEGIN:VCALENDAR\r\n\
BEGIN:VEVENT\r\n\
UID:evt-1\r\n\
SUMMARY:Broken\r\n\
DTSTART:20250101T080000\r\n";

        let parsed = parse_ics_content_with_diagnostics(malformed);

        assert!(parsed.diagnostics.parser_errors >= 1);
        assert!(parsed.events.is_empty());
        assert!(!parsed.diagnostics.parser_error_messages.is_empty());
    }
}
