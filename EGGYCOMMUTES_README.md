# eggycommutes - Desktop Background Transit Display

## Overview

`eggycommutes` is a command-line tool that starts the transit display app and shows it as a fullscreen window positioned behind other windows, creating a live desktop background effect.

## Installation

### Make Command Accessible (Optional)

To run `eggycommutes` from anywhere in your terminal, create a symlink:

```bash
sudo ln -s /Users/donovansanders/personal/googlemaps/eggycommutes /usr/local/bin/eggycommutes
```

Or add the directory to your PATH in `~/.zshrc` or `~/.bash_profile`:

```bash
export PATH="$PATH:/Users/donovansanders/personal/googlemaps"
```

## Usage

### Start the Display

Simply run:

```bash
eggycommutes
```

This will:
1. Start the React development server (if not already running)
2. Launch an Electron window in fullscreen mode
3. Position the window behind other windows (desktop background effect)

### Stop the Display

To stop the server:

```bash
eggycommutes --stop
```

Or close the Electron window and the server will continue running. To fully stop everything, use `--stop`.

## How It Works

1. **Electron (Preferred)**: If Electron is installed, it creates a fullscreen window that loads `http://localhost:3000` and positions it behind other windows using macOS window level APIs.

2. **Browser Fallback**: If Electron is not available, it falls back to opening Chrome or Safari in kiosk mode. Note: Browser method may not support "behind windows" positioning as well as Electron.

## Requirements

- Node.js and npm installed
- React app dependencies installed (`npm install` in `transitschedule/` directory)
- Electron (will be installed automatically when you first run the script, or install manually: `npm install electron --save-dev` in `transitschedule/`)

## Troubleshooting

- **Port 3000 already in use**: The script will detect if the server is already running and use it.
- **Window not appearing behind others**: On macOS, Electron's window level control may have limitations. The window should appear behind other windows, but if it doesn't, you may need to manually adjust window ordering.
- **Electron not found**: Run `npm install` in the `transitschedule/` directory to install Electron.

## Notes

- The React server runs on `http://localhost:3000`
- The Electron window is set to fullscreen and positioned behind other windows
- On macOS, the window level is set to -1 to keep it behind other windows
- The window will hide (not close) when you try to close it, to prevent accidental termination

