const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

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
    },
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, "index.html"));

  // Tip: open DevTools if you ever need to debug
  win.webContents.openDevTools();
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Handle quit-app message from renderer
ipcMain.on("quit-app", () => {
  app.quit();
});
