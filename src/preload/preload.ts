import { contextBridge, ipcRenderer } from 'electron';

// Define the API that will be exposed to the renderer process
const electronAPI = {
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    onMaximized: (callback: (maximized: boolean) => void) => {
      ipcRenderer.on('window-maximized', (_, maximized) => callback(maximized));
    },
  },

  // File dialogs
  dialog: {
    openFile: (options?: Record<string, unknown>) =>
      ipcRenderer.invoke('dialog:openFile', options),
    saveFile: (options?: Record<string, unknown>) =>
      ipcRenderer.invoke('dialog:saveFile', options),
  },

  // Application info
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  },

  // System utilities
  system: {
    checkFFmpeg: () => ipcRenderer.invoke('system:checkFFmpeg'),
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type definitions for the exposed API
export type ElectronAPI = typeof electronAPI;
