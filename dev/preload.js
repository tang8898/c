const { contextBridge, ipcRenderer } = require('electron/renderer')


contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron
})



contextBridge.exposeInMainWorld('electronAPI', {
  onSocketStatusUpdated: (callback) => ipcRenderer.on('socket-status-updated', callback),
  clearCache: () => ipcRenderer.invoke('clear-cache')
});

