#!/bin/bash

# Time Tracking App - Development Startup Script (Unix/Linux/macOS)

echo "🚀 Starting Time Tracking App Development Environment..."

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Check npm version compatibility
NPM_VERSION=$(npm --version)
echo "📦 Using npm version: $NPM_VERSION"

# Function to install dependencies if node_modules doesn't exist
install_deps() {
    local dir=$1
    local name=$2
    
    if [ ! -d "$dir/node_modules" ]; then
        echo "📥 Installing $name dependencies..."
        cd "$dir"
        npm install
        cd ..
    else
        echo "✅ $name dependencies already installed"
    fi
}

# Install frontend dependencies
install_deps "frontend" "frontend"

# Install infrastructure dependencies
install_deps "infrastructure" "infrastructure"

echo ""
echo "🎯 Development environment setup complete!"
echo ""
echo "Available commands:"
echo "  Frontend development server:"
echo "    cd frontend && npm run dev"
echo ""
echo "  Infrastructure deployment:"
echo "    cd infrastructure && npm run deploy"
echo ""
echo "  Infrastructure synthesis (dry-run):"
echo "    cd infrastructure && npm run synth"
echo ""

# Start frontend development server
echo "🌐 Starting frontend development server..."
cd frontend
npm run dev