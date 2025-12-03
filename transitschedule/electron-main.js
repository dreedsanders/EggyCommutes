const { app, BrowserWindow, screen, nativeImage } = require("electron");
const path = require("path");
const { spawn, exec } = require("child_process");
const fs = require("fs");

let mainWindow = null;
let reactServer = null;
const PORT = 3000;
const URL = `http://127.0.0.1:${PORT}`; // Use 127.0.0.1 to avoid IPv6 resolution issues

// Check if React server is already running
function isServerRunning() {
  return new Promise((resolve) => {
    const http = require("http");
    // Use 127.0.0.1 directly to avoid IPv6 resolution issues
    const req = http.get(
      URL,
      {
        timeout: 3000,
        family: 4, // Force IPv4
      },
      (res) => {
        // Server is running if we get any response (even 404 is fine)
        console.log(`Server check: Got response with status ${res.statusCode}`);
        resolve(true);
      }
    );
    req.on("error", (err) => {
      // Connection error means server is not running
      console.log(
        `Server check: Connection error - ${err.code}: ${err.message}`
      );
      resolve(false);
    });
    req.on("timeout", () => {
      console.log("Server check: Request timed out");
      req.destroy();
      resolve(false);
    });
    req.setTimeout(3000);
  });
}

// Start React development server
function startReactServer() {
  return new Promise((resolve, reject) => {
    const reactScriptsPath = path.join(
      __dirname,
      "node_modules",
      ".bin",
      "react-scripts"
    );

    // Check if react-scripts exists
    if (!fs.existsSync(reactScriptsPath)) {
      reject(new Error("react-scripts not found. Please run npm install."));
      return;
    }

    console.log("Starting React server...");
    reactServer = spawn("node", [reactScriptsPath, "start"], {
      cwd: __dirname,
      env: { ...process.env, BROWSER: "none" }, // Don't auto-open browser
      stdio: ["ignore", "pipe", "pipe"], // Capture output for debugging
    });

    let serverOutput = "";
    let serverError = "";

    reactServer.stdout.on("data", (data) => {
      serverOutput += data.toString();
      // Check for common success messages
      if (
        data.toString().includes("webpack compiled") ||
        data.toString().includes("Compiled successfully")
      ) {
        console.log("React server compiled successfully");
      }
    });

    reactServer.stderr.on("data", (data) => {
      serverError += data.toString();
      console.error("React server error:", data.toString());
    });

    reactServer.on("error", (error) => {
      console.error("Failed to spawn React server:", error);
      reject(error);
    });

    // Wait for server to be ready
    let attempts = 0;
    const maxAttempts = 120; // 120 seconds max wait (React can take a while to compile)

    const checkServer = setInterval(async () => {
      attempts++;
      const running = await isServerRunning();

      if (running) {
        clearInterval(checkServer);
        console.log(`React server started after ${attempts} seconds`);
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkServer);
        console.error("React server output:", serverOutput);
        console.error("React server errors:", serverError);
        if (reactServer) {
          reactServer.kill();
        }
        reject(
          new Error(
            `React server failed to start within ${maxAttempts} seconds`
          )
        );
      } else if (attempts % 10 === 0) {
        console.log(
          `Waiting for React server... (${attempts}/${maxAttempts} seconds)`
        );
      }
    }, 1000);
  });
}

function createWindow() {
  // Get primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    fullscreen: true,
    frame: false,
    transparent: false,
    backgroundColor: "#000000",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    show: false, // Don't show until ready
  });

  // Set window to stay behind other windows
  if (process.platform === "darwin") {
    mainWindow.setAlwaysOnTop(false);
  }

  // Load the React app
  mainWindow.loadURL(URL);

  // Function to capture window and set as desktop background
  function updateDesktopBackground() {
    if (process.platform !== "darwin" || !mainWindow) {
      console.log(
        "Skipping desktop background update - not macOS or window not ready"
      );
      return;
    }

    // Ensure window is visible and focused for capture
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.focus();

    // Wait a moment for content to render
    setTimeout(() => {
      console.log("Capturing window...");
      mainWindow
        .capturePage()
        .then((image) => {
          // Save to temp file
          const tempDir = require("os").tmpdir();
          const bgPath = path.join(tempDir, "eggycommutes-bg.png");
          const pngData = image.toPNG();
          fs.writeFileSync(bgPath, pngData);

          console.log("Screenshot saved to:", bgPath);
          console.log("File exists:", fs.existsSync(bgPath));
          console.log("File size:", fs.statSync(bgPath).size, "bytes");

          // Set as desktop background using AppleScript
          // Use POSIX file format for the path
          const script = `tell application "System Events"
  tell every desktop
    set picture to POSIX file "${bgPath}"
  end tell
end tell`;

          // Write script to temp file to avoid escaping issues
          const scriptPath = path.join(tempDir, "set-bg.scpt");
          fs.writeFileSync(scriptPath, script);

          console.log("Executing AppleScript to set desktop background...");
          exec(`osascript "${scriptPath}"`, (error, stdout, stderr) => {
            if (error) {
              console.error("Error setting desktop background:", error);
              console.error("Error code:", error.code);
              console.error("stderr:", stderr);
              console.error("stdout:", stdout);
              console.error("Path attempted:", bgPath);
              console.error("Script path:", scriptPath);
            } else {
              console.log("Desktop background updated successfully!");
              console.log("Background image:", bgPath);
            }
            // Clean up script file
            try {
              fs.unlinkSync(scriptPath);
            } catch (e) {
              // Ignore cleanup errors
            }
          });
        })
        .catch((err) => {
          console.error("Could not capture window:", err);
        });
    }, 2000); // Wait 2 seconds for content to render
  }

  // Show window when ready
  mainWindow.once("ready-to-show", () => {
    // Show window initially so we can capture it
    mainWindow.show();
    // Ensure window stays behind others
    if (process.platform === "darwin") {
      mainWindow.setAlwaysOnTop(false);
    }

    // Wait for page to fully load, then set as desktop background
    mainWindow.webContents.once("did-finish-load", () => {
      // Wait for React to fully render and API calls to complete
      // React apps need time to render after the page loads
      setTimeout(() => {
        console.log("Page loaded, waiting for React to render...");

        // Wait for React to finish rendering (check if root element has content)
        const checkReactReady = setInterval(() => {
          mainWindow.webContents
            .executeJavaScript(
              `
            document.getElementById('root') && 
            document.getElementById('root').children.length > 0
          `
            )
            .then((isReady) => {
              if (isReady) {
                clearInterval(checkReactReady);
                console.log("React content rendered, capturing...");

                // Wait a bit more for any animations or final rendering
                setTimeout(() => {
                  // Initial capture after page loads
                  updateDesktopBackground();

                  // Hide window completely after first capture so it doesn't interfere
                  // The desktop background will show the content, not the window
                  setTimeout(() => {
                    if (process.platform === "darwin") {
                      console.log("Hiding window after background is set...");
                      mainWindow.hide(); // Hide completely so other apps can use the screen
                      // Also set window to be completely behind everything
                      mainWindow.setAlwaysOnTop(false);
                    }
                  }, 2000); // Wait 2 seconds after capture to ensure it's set as background
                }, 2000); // Wait 2 seconds for final rendering
              }
            })
            .catch(() => {
              // If check fails, proceed anyway after timeout
            });
        }, 500); // Check every 500ms

        // Fallback: proceed after 15 seconds even if React check doesn't work
        setTimeout(() => {
          clearInterval(checkReactReady);
          console.log("Fallback: Proceeding with capture after timeout...");
          updateDesktopBackground();
          setTimeout(() => {
            if (process.platform === "darwin") {
              mainWindow.hide();
              mainWindow.setAlwaysOnTop(false);
            }
          }, 2000);
        }, 15000);

        // Update desktop background periodically (every 5 minutes)
        // Set this up once, outside the React ready check
        setInterval(() => {
          // Show window briefly to capture (it will be hidden again)
          mainWindow.show();
          // Bring to front temporarily for capture
          mainWindow.focus();
          setTimeout(() => {
            updateDesktopBackground();
            // Hide again after capture
            setTimeout(() => {
              if (process.platform === "darwin") {
                mainWindow.hide(); // Hide so it doesn't interfere with other apps
              }
            }, 1000);
          }, 2000); // Wait 2 seconds for content to render
        }, 300000); // Update every 5 minutes (300000 milliseconds)
      }, 2000); // Initial 2 second wait
    });
  });

  // Prevent window from being closed accidentally
  mainWindow.on("close", (event) => {
    // On macOS, just hide the window instead of closing
    if (process.platform === "darwin") {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Open DevTools in development (optional)
  if (process.env.ELECTRON_IS_DEV) {
    mainWindow.webContents.openDevTools();
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Check if server is already running
  console.log(`Checking if React server is running at ${URL}...`);
  const serverRunning = await isServerRunning();

  if (serverRunning) {
    console.log(
      "✓ React server is already running! Proceeding to create window..."
    );
    createWindow();
  } else {
    console.log("✗ React server not detected. Starting new server...");
    console.log(
      "Note: If server is running, it may not be responding yet. Starting anyway..."
    );
    try {
      await startReactServer();
      console.log("✓ React server started successfully!");
      createWindow();
    } catch (error) {
      console.error("✗ Failed to start React server:", error.message);
      console.error("Full error:", error);
      console.log("\nTroubleshooting:");
      console.log(
        "1. Check if server is already running: curl http://localhost:3000"
      );
      console.log("2. Start server manually: cd transitschedule && npm start");
      console.log("3. Then run eggycommutes again");
      app.quit();
      return;
    }
  }

  app.on("activate", () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      // Show existing window
      mainWindow.show();
      if (process.platform === "darwin") {
        mainWindow.setAlwaysOnTop(false);
      }
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Kill React server if we started it
    if (reactServer) {
      reactServer.kill();
    }
    app.quit();
  }
});

// Cleanup on app quit
app.on("before-quit", () => {
  if (reactServer) {
    reactServer.kill();
  }
});

// Handle app termination
process.on("SIGTERM", () => {
  if (reactServer) {
    reactServer.kill();
  }
  app.quit();
});

process.on("SIGINT", () => {
  if (reactServer) {
    reactServer.kill();
  }
  app.quit();
});
