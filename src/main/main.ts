import { app, BrowserWindow, ipcMain } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { isDev } from './utils/environment.js';
import { setupIPC } from './ipc/ipcHandlers.js';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  // Create the browser window with security settings
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false, // Custom title bar
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false, // Security: disable node integration
      contextIsolation: true, // Security: enable context isolation
      // __dirname points to dist/main/main at runtime; preload is built to dist/preload/preload.js
      preload: join(__dirname, '../../preload/preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Load the app
  mainWindow.webContents.openDevTools();
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
  } else {
    mainWindow.loadFile(join(__dirname, '../../renderer/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();

    if (isDev) {
      mainWindow?.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window controls for custom title bar
  setupWindowControls();
};

const setupWindowControls = (): void => {
  if (!mainWindow) return;

  // Handle window minimize
  ipcMain.handle('window-minimize', () => {
    mainWindow?.minimize();
  });

  // Handle window maximize/restore
  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow?.maximize();
    }
  });

  // Handle window close
  ipcMain.handle('window-close', () => {
    mainWindow?.close();
  });

  // Handle window state changes
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized', false);
  });
};

// App event handlers
app.whenReady().then(() => {
  createWindow();
  setupIPC();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});

// Security: Prevent navigation to external URLs
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (navigationEvent, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (parsedUrl.origin !== 'http://localhost:5173' && !isDev) {
      navigationEvent.preventDefault();
    }
  });
});

export { mainWindow };
