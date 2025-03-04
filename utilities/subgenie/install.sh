#!/bin/bash

echo "Installing dependencies..."

# Install FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "FFmpeg not found. Installing..."
    brew install ffmpeg
else
    echo "FFmpeg already installed."
fi

# Create a virtual environment (optional, but recommended)
if [ ! -d "venv" ]; then
    echo "Creating a virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
echo "Installing Python packages..."
pip install --upgrade pip
pip install openai-whisper googletrans==4.0.0-rc1 srt

# # Make script executable and move it to /usr/local/bin
# echo "Setting up the CLI tool..."

# SCRIPT_NAME="generate-subtitles"
# INSTALL_PATH="/usr/local/bin/$SCRIPT_NAME"

# # Copy script to /usr/local/bin and make it executable
# cp main.py $INSTALL_PATH
# chmod +x $INSTALL_PATH

# echo "Installation complete! You can now use 'generate-subtitles' anywhere."
