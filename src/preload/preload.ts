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

  // FFmpeg integration
  ffmpeg: {
    detect: () => ipcRenderer.invoke('ffmpeg:detect'),
    setCustomPath: (customPath: string) =>
      ipcRenderer.invoke('ffmpeg:setCustomPath', customPath),
    getFormats: () => ipcRenderer.invoke('ffmpeg:getFormats'),
    getCodecs: () => ipcRenderer.invoke('ffmpeg:getCodecs'),
    getFilters: () => ipcRenderer.invoke('ffmpeg:getFilters'),
    validateCommand: (command: string) =>
      ipcRenderer.invoke('ffmpeg:validateCommand', command),
    executeCommand: (command: string) =>
      ipcRenderer.invoke('ffmpeg:executeCommand', command),
  },

  // File handling
  file: {
    getInfo: (filePath: string) => ipcRenderer.invoke('file:getInfo', filePath),
    validate: (filePath: string) =>
      ipcRenderer.invoke('file:validate', filePath),
    validateMultiple: (filePaths: string[]) =>
      ipcRenderer.invoke('file:validateMultiple', filePaths),
    isSupported: (filePath: string) =>
      ipcRenderer.invoke('file:isSupported', filePath),
    getSupportedExtensions: () =>
      ipcRenderer.invoke('file:getSupportedExtensions'),
    generateThumbnail: (
      filePath: string,
      outputPath: string,
      timeOffset?: number
    ) =>
      ipcRenderer.invoke(
        'file:generateThumbnail',
        filePath,
        outputPath,
        timeOffset
      ),
  },

  // Enhanced file dialogs
  dialog: {
    // Legacy methods (for backward compatibility)
    openFile: (options?: Record<string, unknown>) =>
      ipcRenderer.invoke('dialog:openFile', options),
    saveFile: (options?: Record<string, unknown>) =>
      ipcRenderer.invoke('dialog:saveFile', options),

    // New enhanced methods
    selectFiles: (options?: Record<string, unknown>) =>
      ipcRenderer.invoke('dialog:selectFiles', options),
    selectOutputPath: (options?: Record<string, unknown>) =>
      ipcRenderer.invoke('dialog:selectOutputPath', options),
    selectOutputDirectory: (options?: Record<string, unknown>) =>
      ipcRenderer.invoke('dialog:selectOutputDirectory', options),
  },

  // Application info
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  },

  // Filter system
  filter: {
    getDefinitions: () => ipcRenderer.invoke('filter:getDefinitions'),
    getCategories: () => ipcRenderer.invoke('filter:getCategories'),
  },

  // Command generation
  command: {
    generate: (command: any, options?: unknown) =>
      ipcRenderer.invoke('command:generate', command, options),
    validate: (command: unknown) => ipcRenderer.invoke('command:validate', command),
    parse: (commandString: string) =>
      ipcRenderer.invoke('command:parse', commandString),
  },

  // System utilities (legacy)
  system: {
    checkFFmpeg: () => ipcRenderer.invoke('system:checkFFmpeg'),
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type definitions for the exposed API
export type ElectronAPI = typeof electronAPI;
