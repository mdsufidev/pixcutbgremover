import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { app } from 'electron';

export class DaemonManager {
  private daemonProcess: ChildProcess | null = null;
  private port: number = 8765;
  private host: string = '127.0.0.1';

  public get baseUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  public getTargetDownloadPath(): string {
    const binaryName = process.platform === 'win32' ? 'pixcut-ai-daemon.exe' : 'pixcut-ai-daemon';
    // Permanent user data storage: survives app updates without re-downloading
    try {
      return path.join(app.getPath('userData'), 'backend', binaryName);
    } catch {
      const appData = process.env.APPDATA || path.join(process.env.HOME || '', '.config');
      return path.join(appData, 'PixCutBg', 'backend', binaryName);
    }
  }

  public getExecutablePath(): string | null {
    const binaryName = process.platform === 'win32' ? 'pixcut-ai-daemon.exe' : 'pixcut-ai-daemon';
    const rootDir = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..');

    let userDataDir = '';
    try {
      userDataDir = app.getPath('userData');
    } catch {
      userDataDir = '';
    }

    const candidatePaths = [
      // 1. Downloaded to userData backend directory (on-demand install)
      userDataDir ? path.join(userDataDir, 'backend', binaryName) : '',
      process.env.APPDATA ? path.join(process.env.APPDATA, 'PixCutBg', 'backend', binaryName) : '',
      // 2. Bundled in resources or dev tree
      path.join(rootDir, 'backend-dist', binaryName),
      path.join(rootDir, 'backend-dist', 'pixcut-ai-daemon', binaryName),
      path.join(process.resourcesPath, 'backend-dist', binaryName),
      path.join(process.resourcesPath, 'backend-dist', 'pixcut-ai-daemon', binaryName),
      path.join(__dirname, '..', 'resources', 'backend-dist', 'pixcut-ai-daemon', binaryName),
      path.join(__dirname, '..', 'resources', 'backend-dist', binaryName),
    ].filter(Boolean);

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return null;
  }

  public async isInstalled(): Promise<boolean> {
    const healthy = await this.checkHealth();
    if (healthy) return true;
    return this.getExecutablePath() !== null;
  }

  public async start(): Promise<boolean> {
    // 1. Check if daemon is already healthy on port 8765
    const alreadyRunning = await this.checkHealth();
    if (alreadyRunning) {
      console.log('[DaemonManager] Backend daemon already running and responsive on', this.baseUrl);
      return true;
    }

    const foundExecutable = this.getExecutablePath();

    if (foundExecutable) {
      console.log(`[DaemonManager] Spawning standalone AI daemon: ${foundExecutable}`);
      try {
        this.daemonProcess = spawn(
          foundExecutable,
          ['--host', this.host, '--port', this.port.toString()],
          {
            detached: false,
            cwd: path.dirname(foundExecutable),
            stdio: 'ignore',
          }
        );
      } catch (err) {
        console.error('[DaemonManager] Failed to spawn executable:', err);
      }
    } else {
      // Dev mode fallback only: spawn via python if available
      if (!app.isPackaged) {
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const projectRoot = path.resolve(__dirname, '..');
        console.log(`[DaemonManager] Standalone daemon not found. Trying local ${pythonCmd} from ${projectRoot}...`);

        try {
          this.daemonProcess = spawn(
            pythonCmd,
            ['-m', 'uvicorn', 'backend.main:app', '--host', this.host, '--port', this.port.toString()],
            {
              cwd: projectRoot,
              shell: true,
              env: { ...process.env, PYTHONUNBUFFERED: '1' },
            }
          );
        } catch (err) {
          console.warn('[DaemonManager] Python dev spawn failed:', err);
        }
      } else {
        console.log('[DaemonManager] Standalone AI daemon is not installed yet. Prompting user to download.');
        return false;
      }
    }

    if (this.daemonProcess) {
      this.daemonProcess.on('exit', (code, signal) => {
        console.log(`[DaemonManager] Backend process exited (code ${code}, signal ${signal})`);
        this.daemonProcess = null;
      });
    }

    return this.waitForReadiness(20000);
  }

  public checkHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`${this.baseUrl}/health`, { timeout: 1000 }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  private async waitForReadiness(timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const ok = await this.checkHealth();
      if (ok) {
        console.log('[DaemonManager] Backend daemon verified healthy!');
        return true;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    console.warn(`[DaemonManager] Timed out after ${timeoutMs}ms waiting for health.`);
    return false;
  }

  public async stop(): Promise<void> {
    if (this.daemonProcess) {
      console.log('[DaemonManager] Shutting down backend daemon process...');
      try {
        const req = http.request(`${this.baseUrl}/api/shutdown`, { method: 'POST', timeout: 800 });
        req.on('error', () => {});
        req.end();
      } catch {}

      try {
        this.daemonProcess.kill('SIGTERM');
      } catch {}
      this.daemonProcess = null;
    }
  }
}
