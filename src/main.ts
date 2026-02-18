import { app, BrowserWindow, nativeImage } from "electron";
import * as path from "path";
import { initDatabase, closeDatabase } from "./database/index";
import { registerIpcHandlers } from "./ipc/handlers";

function createWindow(): void {
  const iconPath = path.join(__dirname, "..", "public", "logo256.png");
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: nativeImage.createFromPath(iconPath),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile(path.join(__dirname, "..", "index.html"));
}

app.whenReady().then(() => {
  // Initialize SQLite database
  initDatabase();

  // Register IPC handlers for renderer <-> main process communication
  registerIpcHandlers();

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  closeDatabase();
});
