use wasm_bindgen::prelude::*;
mod normalizer;
mod parser;
use normalizer::normalize;
use parser::parse_ics_content;

#[wasm_bindgen]
pub fn parse_and_normalize(content: &str) -> JsValue {
    let raw_events = parse_ics_content(content);
    let normalized = normalize(raw_events);
    serde_wasm_bindgen::to_value(&normalized).unwrap()
}

#[wasm_bindgen]
pub fn parse_ics(content: &str) -> JsValue {
    let events = parse_ics_content(content);
    serde_wasm_bindgen::to_value(&events).unwrap()
}

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Agendum Core is ready.", name)
}
