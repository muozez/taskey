import { app, BrowserWindow, nativeImage } from "electron";
import * as path from "path";
import { initDatabase, closeDatabase } from "./database/index";
import { registerIpcHandlers } from "./ipc/handlers";
import { initSyncEngine, shutdownSyncEngine } from "./sync/sync-engine";

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
  try {
    // Initialize SQLite database
    initDatabase();

    // Register IPC handlers for renderer <-> main process communication
    registerIpcHandlers();

    // Initialize sync engine (resumes active connections)
    initSyncEngine();
  } catch (err) {
    console.error('[Taskey] Critical initialization error:', err);
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Taskey Ba\u015flat\u0131lamad\u0131',
      `Veritaban\u0131 ba\u015flat\u0131l\u0131rken hata olu\u015ftu:\n${err instanceof Error ? err.message : String(err)}`
    );
    app.quit();
    return;
  }

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
  shutdownSyncEngine();
  closeDatabase();
});
