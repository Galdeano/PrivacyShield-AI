const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let pythonProcess = null;

function checkBackendHealth(retries = 30, delay = 500) {
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
  const rootDir = path.join(__dirname, '..');
  const pythonPath = path.join(rootDir, 'venv', 'Scripts', 'python.exe');
  const serverScript = path.join(rootDir, 'engine', 'server.py');

  pythonProcess = spawn(pythonPath, [serverScript], {
    cwd: rootDir,
    stdio: 'inherit',
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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // Directly load production build of React app
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

app.whenReady().then(async () => {
  startPythonBackend();
  // Wait briefly for the backend engine to start up
  await checkBackendHealth(20, 300);
  createWindow();

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
