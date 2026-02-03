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

fn unescape_ical(s: &str) -> String {
    s.replace("\\n", "\n")
        .replace("\\N", "\n")
        .replace("\\,", ",")
        .replace("\\;", ";")
        .replace("\\\\", "\\")
}

pub fn parse_ics_content(content: &str) -> Vec<RawEvent> {
    let buf = BufReader::new(content.as_bytes());
    let parser = IcalParser::new(buf);
    let mut events = Vec::new();

    for line in parser {
        match line {
            Ok(calendar) => {
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
                    }
                }
            }
            Err(_e) => {
                // Log error or skip
            }
        }
    }

    events
}
