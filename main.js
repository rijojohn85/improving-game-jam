const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

// Enable remote module for easier file system access
require('@electron/remote/main').initialize();

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 820,
    backgroundColor: "#0d0f1a",
    resizable: false,
    webPreferences: {
      contextIsolation: false, // Allow require in renderer
      nodeIntegration: true, // Enable Node.js in renderer
      sandbox: false, // keep this simple for Phaser
      // Enable hardware acceleration for high refresh rates
      hardwareAcceleration: true,
      // Disable VSync to allow uncapped frame rates
      disableVSync: true,
      enableRemoteModule: true, // Enable remote module
    },
  });

  // Enable remote module for this window
  require('@electron/remote/main').enable(win.webContents);

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Handle quit-app message from renderer
ipcMain.on("quit-app", () => {
  app.quit();
});
