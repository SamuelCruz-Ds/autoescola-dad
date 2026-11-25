import { app, BrowserWindow, ipcMain } from 'electron';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from 'dotenv';
import type { CommandName, Database } from '../shared/types';
import { createDatabase } from './database/mysql';
import { AppService } from './service';

if (!app.isPackaged && process.env.AUTOESCOLA_USER_DATA)
  app.setPath('userData', resolve(process.env.AUTOESCOLA_USER_DATA));
config({
  path: app.isPackaged ? join(app.getPath('userData'), '.env') : resolve(process.cwd(), '.env'),
  quiet: true,
});
process.env.TZ = process.env.APP_TIMEZONE || 'America/Sao_Paulo';

// The window remains available when configuration or MySQL is unavailable. Login reports the failure.
let database: Database | undefined;
const getDatabase = (): Database => (database ??= createDatabase());
const lazyDatabase: Database = {
  read: () => getDatabase().read(),
  transaction: (work) => getDatabase().transaction(work),
  close: async () => {
    if (database) await database.close();
  },
};
const service = new AppService(lazyDatabase);
let mainWindow: BrowserWindow | null = null;

function rendererAddress(): string {
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    const address = new URL(process.env.ELECTRON_RENDERER_URL);
    if (
      address.protocol !== 'http:' ||
      !['localhost', '127.0.0.1', '[::1]'].includes(address.hostname) ||
      address.username ||
      address.password
    ) {
      throw new Error('O servidor de desenvolvimento deve ser local.');
    }
    return address.href;
  }
  return pathToFileURL(join(__dirname, '../renderer/index.html')).href;
}

function sameDocument(actual: string, expected: string): boolean {
  try {
    const candidate = new URL(actual);
    const allowed = new URL(expected);
    return (
      candidate.protocol === allowed.protocol &&
      candidate.host === allowed.host &&
      candidate.pathname === allowed.pathname &&
      candidate.search === allowed.search
    );
  } catch {
    return false;
  }
}

async function createWindow(): Promise<void> {
  const address = rendererAddress();
  const development = address.startsWith('http:');
  const origin = development ? new URL(address).origin : '';
  const connect = development ? `${origin} ${origin.replace('http:', 'ws:')}` : "'none'";
  const csp = `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src ${connect}; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 850,
    minHeight: 650,
    title: 'Autoescola — Projeto DAD',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });
  mainWindow = window;
  window.setMenu(null);
  window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [csp] } });
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, target) => {
    if (!sameDocument(target, address)) event.preventDefault();
  });
  window.webContents.on('will-redirect', (event) => event.preventDefault());
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  const sessionId = window.webContents.id;
  window.webContents.on('destroyed', () => service.destroySession(sessionId));
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );
  window.webContents.session.setPermissionCheckHandler(() => false);
  window.once('ready-to-show', () => window.show());
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });
  await window.loadURL(address);
}

app
  .whenReady()
  .then(async () => {
    ipcMain.handle('autoescola:request', async (event, command: CommandName, payload: unknown) => {
      const frame = event.senderFrame;
      if (
        !mainWindow ||
        event.sender !== mainWindow.webContents ||
        !frame ||
        frame !== event.sender.mainFrame ||
        !sameDocument(frame.url, rendererAddress())
      ) {
        return { ok: false, code: 'FORBIDDEN', error: 'Origem da solicitação não autorizada.' };
      }
      return service.request(event.sender.id, command, payload);
    });
    await createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow();
    });
  })
  .catch(() => {
    console.error('Não foi possível iniciar a janela do sistema. Confira a instalação.');
    app.quit();
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
let closingDatabase = false;
app.on('before-quit', (event) => {
  if (!database || closingDatabase) return;
  event.preventDefault();
  closingDatabase = true;
  void lazyDatabase
    .close()
    .catch(() => {
      console.error('Não foi possível encerrar a conexão com o banco.');
    })
    .finally(() => app.quit());
});
