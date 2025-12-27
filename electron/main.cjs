// electron/main.cjs
// Electron Main Process - CommonJS format for Electron compatibility
const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

// ============================================
// V8 MEMORY CONFIGURATION FOR LARGE FILES
// ============================================
// 고해상도 이미지/PDF 처리 시 메모리 부족 크래시 방지 (8GB 할당)
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=8192');
// 교차 출처 문제 방지
app.commandLine.appendSwitch('disable-site-isolation-trials');
// (선택) 하드웨어 가속 문제 발생 시 아래 주석 해제
// app.disableHardwareAcceleration();

let mainWindow;
let tray;
let isQuitting = false;

// Check if running in development mode
const isDev = !app.isPackaged;

// ============================================
// AUTO-START ON LOGIN CONFIGURATION
// ============================================
function setupAutoStart() {
    // Only set auto-start for packaged (production) builds
    if (!isDev) {
        app.setLoginItemSettings({
            openAtLogin: true,
            openAsHidden: true, // Start hidden in tray
        });
    }
}

// ============================================
// CREATE MAIN WINDOW
// ============================================
function createWindow() {
    const iconPath = path.join(__dirname, '../public/logo.png');

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        show: false, // Don't show until ready
        icon: iconPath,
        title: '물리치료학과 대시보드',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            sandbox: false,       // 메모리 격리 비활성화 (대용량 파일 처리)
            webSecurity: false,   // 로컬 파일(PDF) 접근 허용
        },
    });

    // Load the app URL
    // Dev: Use VITE_DEV_SERVER_URL env var or default to 8080
    // Production: Load from dist folder using app.getAppPath()
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:8080';

    let startUrl;
    if (isDev) {
        startUrl = devUrl;
    } else {
        // In packaged app, app.getAppPath() returns the app.asar or app folder path
        const appPath = app.getAppPath();
        startUrl = `file://${path.join(appPath, 'dist', 'index.html')}`;
        console.log('Production URL:', startUrl);
    }

    mainWindow.loadURL(startUrl).catch(err => {
        console.error('Failed to load URL:', startUrl, err);
    });

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        // Check if started with --hidden flag (auto-start scenario)
        const startHidden = process.argv.includes('--hidden');
        if (!startHidden) {
            mainWindow.show();
        }
    });

    // Hide to tray instead of closing
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            return false;
        }
    });

    // Open DevTools in development
    if (isDev) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
}

// ============================================
// CREATE SYSTEM TRAY
// ============================================
function createTray() {
    const iconPath = path.join(__dirname, '../public/logo.png');

    // Create tray icon (resize for proper display)
    let trayIcon = nativeImage.createFromPath(iconPath);

    // macOS uses template images, resize to appropriate size
    if (process.platform === 'darwin') {
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
    } else {
        trayIcon = trayIcon.resize({ width: 24, height: 24 });
    }

    tray = new Tray(trayIcon);
    tray.setToolTip('물리치료학과 대시보드');

    // Context menu for tray icon
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '열기',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            },
        },
        { type: 'separator' },
        {
            label: '완전히 종료',
            click: () => {
                isQuitting = true;
                app.quit();
            },
        },
    ]);

    tray.setContextMenu(contextMenu);

    // Double-click to open (Windows)
    tray.on('double-click', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });

    // Single click to open (macOS behavior)
    tray.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        }
    });
}

// ============================================
// APP LIFECYCLE
// ============================================

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // Someone tried to run a second instance, focus our window
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });

    // App is ready
    app.whenReady().then(() => {
        setupAutoStart();
        createTray();
        createWindow();

        // macOS: Re-create window when dock icon is clicked
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            } else if (mainWindow) {
                mainWindow.show();
            }
        });
    });
}

// Don't quit when all windows are closed (keep in tray)
app.on('window-all-closed', () => {
    // On macOS, apps typically stay active until explicit quit
    // On Windows/Linux, we also stay active in tray
    // Do nothing - app stays in tray
});

// Handle before-quit to properly close
app.on('before-quit', () => {
    isQuitting = true;
});
