#!/bin/bash
set -e

echo "🦀 Building Rust/WASM Core (Release)..."
cd agendum-core
wasm-pack build --target web --out-dir ../frontend/src/pkg --release
cd ..

echo "🏗️  Building Frontend for Production..."
cd frontend
npm run build

echo "✅ Build complete! Serve the 'frontend/dist' folder."
