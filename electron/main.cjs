const { app, BrowserWindow, Menu, Tray, dialog, ipcMain, nativeImage, shell } = require('electron');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const SERVER_PORT = process.env.PORT || 3000;
const SERVER_URL = `http://127.0.0.1:${SERVER_PORT}`;

let mainWindow = null;
let tray = null;
let serverProcess = null;
let isQuitting = false;

let trayState = {
  watching: false,
  currentStep: 'Iniciando BotChase...',
  minimizeToTray: true,
};

// Minimal 16x16 PNG icon encoded as data URL (solid soft-blue badge with inner mark)
// Avoids missing icon file crashes across Windows/macOS/Linux
function createTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill="#171B26"/>
      <rect x="2" y="2" width="28" height="28" rx="6" fill="none" stroke="#6B93F5" stroke-width="2"/>
      <text x="16" y="21" text-anchor="middle" fill="#6B93F5" font-size="13" font-weight="bold" font-family="sans-serif">BC</text>
    </svg>
  `.trim();
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return nativeImage.createFromDataURL(dataUrl).resize({ width: 18, height: 18 });
}

function postToBackend(apiPath, bodyObj) {
  return new Promise((resolve) => {
    const payload = bodyObj ? JSON.stringify(bodyObj) : '{}';
    const req = http.request(
      `${SERVER_URL}${apiPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode || 200);
      }
    );
    req.on('error', () => resolve(500));
    req.write(payload);
    req.end();
  });
}

function waitForServer(retries = 40) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts += 1;
      const req = http.get(`${SERVER_URL}/api/bootstrap`, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
        } else if (attempts < retries) {
          setTimeout(check, 250);
        } else {
          reject(new Error('El servidor local de BotChase no respondió a tiempo.'));
        }
      });
      req.on('error', () => {
        if (attempts < retries) {
          setTimeout(check, 250);
        } else {
          reject(new Error('No se pudo conectar con el servidor local de BotChase.'));
        }
      });
    };
    check();
  });
}

function startBackendServer() {
  const rootDir = path.resolve(__dirname, '..');
  const isProd = app.isPackaged || fs.existsSync(path.join(rootDir, 'dist', 'index.html'));
  const tsxBin = path.join(
    rootDir,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'tsx.cmd' : 'tsx'
  );

  const env = {
    ...process.env,
    NODE_ENV: app.isPackaged ? 'production' : process.env.NODE_ENV || 'development',
    PORT: String(SERVER_PORT),
  };

  if (fs.existsSync(tsxBin)) {
    serverProcess = spawn(tsxBin, [path.join(rootDir, 'server.ts')], {
      cwd: rootDir,
      env,
      stdio: 'pipe',
      shell: process.platform === 'win32',
    });
  } else {
    serverProcess = spawn(process.execPath, [path.join(rootDir, 'server.ts')], {
      cwd: rootDir,
      env: { ...env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: 'pipe',
    });
  }

  serverProcess.stdout?.on('data', (chunk) => {
    process.stdout.write(`[BotChase Server] ${chunk}`);
  });
  serverProcess.stderr?.on('data', (chunk) => {
    process.stderr.write(`[BotChase Server] ${chunk}`);
  });

  return isProd;
}

function rebuildTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    {
      label: 'Abrir BotChase',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Revisar calendario ahora',
      click: () => {
        void postToBackend('/api/bot/run-once');
      },
    },
    {
      label: trayState.watching ? 'Pausar vigilancia' : 'Activar vigilancia',
      click: () => {
        const endpoint = trayState.watching ? '/api/bot/watch/stop' : '/api/bot/watch/start';
        void postToBackend(endpoint);
      },
    },
    { type: 'separator' },
    {
      label: 'Salir de BotChase',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.setToolTip(`BotChase — ${trayState.currentStep}`);
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
  rebuildTrayMenu();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#12151E',
    title: 'BotChase — ITLAVIRTUAL Desktop',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('minimize', (event) => {
    if (trayState.minimizeToTray && tray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting && trayState.minimizeToTray && tray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  void mainWindow.loadURL(SERVER_URL);
}

function registerIpcHandlers() {
  ipcMain.handle('botchase:pick-folder', async (_event, defaultPath) => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar carpeta de salida para PDFs y DOCX',
      defaultPath: typeof defaultPath === 'string' && defaultPath ? defaultPath : app.getPath('documents'),
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('botchase:open-folder', async (_event, dirPath) => {
    if (typeof dirPath !== 'string' || !dirPath.trim()) return false;
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const err = await shell.openPath(dirPath);
    return err === '';
  });

  ipcMain.handle('botchase:open-file', async (_event, filePath) => {
    if (typeof filePath !== 'string' || !filePath.trim()) return false;
    if (!fs.existsSync(filePath)) return false;
    const err = await shell.openPath(filePath);
    return err === '';
  });

  ipcMain.handle('botchase:minimize-to-tray', () => {
    if (mainWindow && tray) {
      mainWindow.hide();
      return true;
    }
    return false;
  });

  ipcMain.on('botchase:sync-tray-state', (_event, nextState) => {
    if (nextState && typeof nextState === 'object') {
      trayState = {
        watching: Boolean(nextState.watching),
        currentStep: String(nextState.currentStep || 'En espera'),
        minimizeToTray:
          typeof nextState.minimizeToTray === 'boolean'
            ? nextState.minimizeToTray
            : trayState.minimizeToTray,
      };
      rebuildTrayMenu();
    }
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    registerIpcHandlers();
    startBackendServer();
    try {
      await waitForServer();
    } catch (err) {
      dialog.showErrorBox(
        'BotChase — Error de inicio',
        err instanceof Error ? err.message : String(err)
      );
      app.quit();
      return;
    }
    createTray();
    createWindow();
  });

  app.on('before-quit', () => {
    isQuitting = true;
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && !trayState.minimizeToTray) {
      app.quit();
    }
  });
}
