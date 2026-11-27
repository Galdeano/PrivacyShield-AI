const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  getApiPort: () => ipcRenderer.invoke('get-api-port'),
  onApiPortChanged: (callback) => {
    ipcRenderer.on('api-port-changed', (_event, port) => callback(port));
  }
});
