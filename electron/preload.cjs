const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  pickFolder: (defaultPath) => ipcRenderer.invoke('botchase:pick-folder', defaultPath),
  openFolder: (dirPath) => ipcRenderer.invoke('botchase:open-folder', dirPath),
  openFile: (filePath) => ipcRenderer.invoke('botchase:open-file', filePath),
  minimizeToTray: () => ipcRenderer.invoke('botchase:minimize-to-tray'),
  syncTrayState: (payload) => ipcRenderer.send('botchase:sync-tray-state', payload),
});
