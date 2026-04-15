//main.js
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { runExtraction } from './extractor.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const w = new BrowserWindow({
    width: 800, height: 600,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true }
  });
  w.loadFile(path.join(__dirname, 'render.html'));
  // w.webContents.openDevTools();
}

app.whenReady().then(createWindow);

ipcMain.handle('select-file', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openFile', 'openDirectory'] });
  if (res.canceled) return null;
  return res.filePaths[0];
});

ipcMain.handle('save-file', async (_e, defaultName, filters) => {
  const res = await dialog.showSaveDialog({ defaultPath: defaultName, filters });
  if (res.canceled) return null;
  return res.filePath;
});

ipcMain.handle('run-extract', async (_e, opts) => {
  try {
    const result = await runExtraction(opts);
    return { ok: true, info: result };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});
