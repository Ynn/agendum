use serde::Serialize;
use wasm_bindgen::prelude::*;
mod normalizer;
mod parser;
use normalizer::normalize;
use parser::{parse_ics_content, parse_ics_content_with_diagnostics, ParseDiagnostics, RawEvent};

#[derive(Serialize)]
struct ParseAndNormalizeDetailedResult {
    events: Vec<normalizer::NormalizedEvent>,
    diagnostics: ParseDiagnostics,
}

#[derive(Serialize)]
struct ParseOnlyDetailedResult {
    events: Vec<RawEvent>,
    diagnostics: ParseDiagnostics,
}

#[wasm_bindgen]
pub fn parse_and_normalize(content: &str) -> JsValue {
    let raw_events = parse_ics_content(content);
    let normalized = normalize(raw_events);
    serde_wasm_bindgen::to_value(&normalized).unwrap()
}

#[wasm_bindgen]
pub fn parse_and_normalize_detailed(content: &str) -> Result<JsValue, JsValue> {
    let parsed = parse_ics_content_with_diagnostics(content);
    let normalized = normalize(parsed.events);
    let payload = ParseAndNormalizeDetailedResult {
        events: normalized,
        diagnostics: parsed.diagnostics,
    };
    serde_wasm_bindgen::to_value(&payload).map_err(|e| {
        JsValue::from_str(&format!("Failed to serialize normalized parse result: {e}"))
    })
}

#[wasm_bindgen]
pub fn parse_ics(content: &str) -> JsValue {
    let events = parse_ics_content(content);
    serde_wasm_bindgen::to_value(&events).unwrap()
}

#[wasm_bindgen]
pub fn parse_ics_detailed(content: &str) -> Result<JsValue, JsValue> {
    let parsed = parse_ics_content_with_diagnostics(content);
    let payload = ParseOnlyDetailedResult {
        events: parsed.events,
        diagnostics: parsed.diagnostics,
    };
    serde_wasm_bindgen::to_value(&payload)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize raw parse result: {e}")))
}

#[wasm_bindgen]
pub fn renormalize_raw_events(raw_events: JsValue) -> Result<JsValue, JsValue> {
    let raw: Vec<RawEvent> = serde_wasm_bindgen::from_value(raw_events)
        .map_err(|e| JsValue::from_str(&format!("Failed to deserialize raw events: {e}")))?;
    let normalized = normalize(raw);
    serde_wasm_bindgen::to_value(&normalized)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize normalized events: {e}")))
}

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Agendum Core is ready.", name)
}
