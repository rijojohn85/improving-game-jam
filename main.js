const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 820,
    backgroundColor: "#0d0f1a",
    resizable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false, // no Node in renderer
      sandbox: false, // keep this simple for Phaser
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
