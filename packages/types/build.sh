#!/bin/bash

# Build script for shared types package

echo "Installing dependencies for shared types package..."
cd "$(dirname "$0")" || exit
pnpm install

echo "Building shared types package..."
pnpm build

echo "Types package built successfully ❤️" 