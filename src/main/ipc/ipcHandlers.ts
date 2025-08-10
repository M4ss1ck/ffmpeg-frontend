import { ipcMain, dialog } from 'electron';
import { mainWindow } from '../main.js';

export const setupIPC = (): void => {
  // File dialog handlers
  ipcMain.handle('dialog:openFile', async (_, options) => {
    if (!mainWindow) return { canceled: true, filePaths: [] };

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Video Files',
          extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
        },
        {
          name: 'Audio Files',
          extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'],
        },
        { name: 'All Files', extensions: ['*'] },
      ],
      ...options,
    });

    return result;
  });

  ipcMain.handle('dialog:saveFile', async (_, options) => {
    if (!mainWindow) return { canceled: true, filePath: '' };

    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [
        {
          name: 'Video Files',
          extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
        },
        {
          name: 'Audio Files',
          extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'],
        },
        { name: 'All Files', extensions: ['*'] },
      ],
      ...options,
    });

    return result;
  });

  // Application info handlers
  ipcMain.handle('app:getVersion', () => {
    return process.env.npm_package_version || '1.0.0';
  });

  ipcMain.handle('app:getPlatform', () => {
    return process.platform;
  });

  // System handlers (placeholder for future FFmpeg integration)
  ipcMain.handle('system:checkFFmpeg', async () => {
    // This will be implemented in task 2
    return { found: false, path: '', version: '' };
  });
};
