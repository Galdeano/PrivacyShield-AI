const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let pythonProcess = null;

function checkBackendHealth(retries = 60, delay = 500) {
  return new Promise((resolve) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const req = http.get('http://127.0.0.1:8765/health', (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          resolve(true);
        }
      });
      req.on('error', () => {
        if (attempts >= retries) {
          clearInterval(interval);
          resolve(false);
        }
      });
      req.end();
    }, delay);
  });
}

function startPythonBackend() {
  const isPackaged = app.isPackaged;
  
  let pythonPath, serverScript, rootDir;

  if (isPackaged) {
    rootDir = process.resourcesPath;
    pythonPath = path.join(process.resourcesPath, 'python_embed', 'python.exe');
    serverScript = path.join(process.resourcesPath, 'engine', 'server.py');
  } else {
    rootDir = path.join(__dirname, '..');
    pythonPath = path.join(rootDir, 'python_embed', 'python.exe');
    serverScript = path.join(rootDir, 'engine', 'server.py');
  }

  pythonProcess = spawn(pythonPath, [serverScript], {
    cwd: rootDir,
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env, PYTHONPATH: rootDir }
  });

  pythonProcess.on('error', (err) => {
    console.error('Failed to start Python backend:', err);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 950,
    minHeight: 650,
    title: 'PrivacyShield AI — Reversible Text Anonymizer',
    backgroundColor: '#020617',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  // 1. Ouvrir immédiatement la fenêtre de l'application
  createWindow();

  // 2. Lancer le moteur Python en arrière-plan (l'interface affiche le statut en direct)
  startPythonBackend();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

function cleanup() {
  if (pythonProcess) {
    try {
      pythonProcess.kill();
    } catch (e) {}
  }
}

app.on('window-all-closed', () => {
  cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', cleanup);
