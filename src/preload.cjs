//preload.cjs
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  saveFile: (defaultName, filters) => ipcRenderer.invoke('save-file', defaultName, filters),
  runExtract: (opts) => ipcRenderer.invoke('run-extract', opts)
});
