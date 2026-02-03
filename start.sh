#!/bin/bash
set -e

echo "🦀 Building Rust/WASM Core..."
cd agendum-core
wasm-pack build --target web --out-dir ../frontend/src/pkg
cd ..

echo "⚡ Starting Frontend Dev Server..."
cd frontend
npm run dev
