import { ipcMain, dialog } from 'electron';
import { mainWindow } from '../main.js';
import { ffmpegService } from '../services/ffmpegService.js';
import { fileService } from '../services/fileService.js';

export const setupIPC = (): void => {
  // FFmpeg integration handlers
  ipcMain.handle('ffmpeg:detect', async () => {
    try {
      const info = await ffmpegService.detectFFmpeg();
      return { success: true, data: info };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ffmpeg:setCustomPath', async (_, customPath: string) => {
    try {
      const info = await ffmpegService.setCustomFFmpegPath(customPath);
      return { success: true, data: info };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ffmpeg:getFormats', async () => {
    try {
      const formats = await ffmpegService.getFormats();
      return { success: true, data: formats };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ffmpeg:getCodecs', async () => {
    try {
      const codecs = await ffmpegService.getCodecs();
      return { success: true, data: codecs };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ffmpeg:getFilters', async () => {
    try {
      const filters = await ffmpegService.getFilters();
      return { success: true, data: filters };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ffmpeg:validateCommand', async (_, command: string) => {
    try {
      const result = await ffmpegService.validateCommand(command);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ffmpeg:executeCommand', async (_, command: string) => {
    try {
      const result = await ffmpegService.executeCommand(command);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // File handling services
  ipcMain.handle('file:getInfo', async (_, filePath: string) => {
    try {
      const info = await fileService.getFileInfo(filePath);
      return { success: true, data: info };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:validate', async (_, filePath: string) => {
    try {
      const result = await fileService.validateFile(filePath);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:validateMultiple', async (_, filePaths: string[]) => {
    try {
      const results = await fileService.validateFiles(filePaths);
      // Convert Map to Object for JSON serialization
      const resultsObj = Object.fromEntries(results);
      return { success: true, data: resultsObj };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:isSupported', async (_, filePath: string) => {
    try {
      const isSupported = fileService.isFileSupported(filePath);
      const fileType = fileService.getFileType(filePath);
      return { success: true, data: { isSupported, fileType } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:getSupportedExtensions', async () => {
    try {
      const extensions = fileService.getSupportedExtensions();
      return { success: true, data: extensions };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    'file:generateThumbnail',
    async (_, filePath: string, outputPath: string, timeOffset?: number) => {
      try {
        const thumbnailPath = await fileService.generateThumbnail(
          filePath,
          outputPath,
          timeOffset
        );
        return { success: true, data: thumbnailPath };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );

  // Enhanced file dialog handlers
  ipcMain.handle('dialog:selectFiles', async (_, options) => {
    if (!mainWindow)
      return { success: false, error: 'No main window available' };

    try {
      const filePaths = await fileService.selectFiles(mainWindow, options);
      return { success: true, data: filePaths };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('dialog:selectOutputPath', async (_, options) => {
    if (!mainWindow)
      return { success: false, error: 'No main window available' };

    try {
      const outputPath = await fileService.selectOutputPath(
        mainWindow,
        options
      );
      return { success: true, data: outputPath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Legacy file dialog handlers (for backward compatibility)
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

  // Legacy system handler (updated)
  ipcMain.handle('system:checkFFmpeg', async () => {
    try {
      const info = await ffmpegService.detectFFmpeg();
      return { found: true, path: info.path, version: info.version };
    } catch (error) {
      return { found: false, path: '', version: '' };
    }
  });
};
