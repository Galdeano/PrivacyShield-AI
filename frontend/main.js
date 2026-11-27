const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawn, execSync } = require('child_process');
const http = require('http');

let mainWindow = null;
let pythonProcess = null;
let assignedPort = 8765;

ipcMain.handle('get-api-port', () => assignedPort);

function tryKillStaleProcessOnPort(port) {
  if (process.platform !== 'win32') return;
  try {
    const out = execSync(`netstat -ano -p tcp | findstr :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lines = out.split('\r\n');
    for (const line of lines) {
      if (line.includes('LISTENING') || line.includes('CLOSE_WAIT')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && parseInt(pid) > 0 && parseInt(pid) !== process.pid) {
          try {
            execSync(`taskkill /F /PID ${pid} /T`, { stdio: 'ignore' });
            console.log(`Killed stale process on port ${port}: PID ${pid}`);
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
}

function getFreePort(startPort = 8765) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(getFreePort(startPort + 1));
      } else {
        resolve(startPort);
      }
    });
    server.once('listening', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.listen(startPort, '127.0.0.1');
  });
}

async function startPythonBackend() {
  const isPackaged = app.isPackaged;
  
  // Try freeing default port from any zombie process left from an earlier run
  tryKillStaleProcessOnPort(8765);

  // Find guaranteed available port (8765 or next free: 8766, 8767...)
  assignedPort = await getFreePort(8765);
  console.log(`Assigned local engine port: ${assignedPort}`);

  // Notify frontend if window is already loaded
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('api-port-changed', assignedPort);
  }
  
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
    fs.appendFileSync(logFile, `\n--- [${new Date().toISOString()}] Launching Python Backend on Port ${assignedPort} ---\n`);
    fs.appendFileSync(logFile, `Python path: ${pythonPath}\nScript path: ${serverScript}\nWorking dir: ${rootDir}\n`);
  } catch (e) {
    console.error('Could not open log file:', e);
  }

  const stdioOption = logFd !== undefined ? ['ignore', logFd, logFd] : 'pipe';

  pythonProcess = spawn(pythonPath, [serverScript, '--port', assignedPort.toString()], {
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

  // 2. Lancer le moteur Python en arrière-plan avec port dynamique
  startPythonBackend();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

function cleanup() {
  if (pythonProcess && pythonProcess.pid) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', pythonProcess.pid.toString(), '/f', '/t']);
      } else {
        pythonProcess.kill('SIGKILL');
      }
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
