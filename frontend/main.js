const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let pythonProcess = null;

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

  // Ensure log directory exists in user profile (always writable)
  const logDir = app.getPath('userData');
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  } catch (e) {}

  const logFile = path.join(logDir, 'backend_engine.log');
  let logFd;
  try {
    logFd = fs.openSync(logFile, 'a');
    fs.appendFileSync(logFile, `\n--- [${new Date().toISOString()}] Launching Python Backend ---\n`);
    fs.appendFileSync(logFile, `Python path: ${pythonPath}\nScript path: ${serverScript}\nWorking dir: ${rootDir}\n`);
  } catch (e) {
    console.error('Could not open log file:', e);
  }

  const stdioOption = logFd !== undefined ? ['ignore', logFd, logFd] : 'pipe';

  pythonProcess = spawn(pythonPath, [serverScript], {
    cwd: rootDir,
    stdio: stdioOption,
    windowsHide: true,
    env: {
      ...process.env,
      PYTHONPATH: rootDir,
      PYTHONUNBUFFERED: '1'
    }
  });

  if (stdioOption === 'pipe' && pythonProcess) {
    pythonProcess.stdout?.on('data', (d) => console.log('[Python STDOUT]', d.toString()));
    pythonProcess.stderr?.on('data', (d) => console.error('[Python STDERR]', d.toString()));
  }

  pythonProcess.on('error', (err) => {
    console.error('Failed to start Python backend:', err);
    try {
      if (logFile) fs.appendFileSync(logFile, `[ERROR] Failed to start Python backend: ${err.message}\n`);
    } catch (e) {}
  });

  pythonProcess.on('exit', (code, signal) => {
    console.log(`Python process exited with code ${code}, signal ${signal}`);
    try {
      if (logFile) fs.appendFileSync(logFile, `[INFO] Python process exited with code ${code}, signal ${signal}\n`);
    } catch (e) {}
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
