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

  public async start(): Promise<boolean> {
    // 1. Check if daemon is already healthy on 8765
    const alreadyRunning = await this.checkHealth();
    if (alreadyRunning) {
      console.log('[DaemonManager] Backend daemon already running and responsive on', this.baseUrl);
      return true;
    }

    const binaryName = process.platform === 'win32' ? 'pixcut-ai-daemon.exe' : 'pixcut-ai-daemon';
    const rootDir = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..');

    const candidatePaths = [
      path.join(rootDir, 'backend-dist', binaryName),
      path.join(rootDir, 'backend-dist', 'pixcut-ai-daemon', binaryName),
      path.join(process.resourcesPath, 'backend-dist', binaryName),
      path.join(process.resourcesPath, 'backend-dist', 'pixcut-ai-daemon', binaryName),
      path.join(__dirname, '..', 'resources', 'backend-dist', 'pixcut-ai-daemon', binaryName),
      path.join(__dirname, '..', 'resources', 'backend-dist', binaryName),
    ];

    let foundExecutable: string | null = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        foundExecutable = p;
        break;
      }
    }

    if (foundExecutable) {
      console.log(`[DaemonManager] Spawning bundled standalone daemon: ${foundExecutable}`);
      this.daemonProcess = spawn(
        foundExecutable,
        ['--host', this.host, '--port', this.port.toString()],
        {
          detached: false,
          cwd: path.dirname(foundExecutable),
          stdio: 'ignore'
        }
      );
    } else {
      // Fallback: spawn via local python
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const projectRoot = path.resolve(__dirname, '..');
      console.log(`[DaemonManager] Standalone daemon not found. Spawning via ${pythonCmd} from ${projectRoot}...`);

      this.daemonProcess = spawn(
        pythonCmd,
        ['-m', 'uvicorn', 'backend.main:app', '--host', this.host, '--port', this.port.toString()],
        {
          cwd: projectRoot,
          shell: true,
          env: { ...process.env, PYTHONUNBUFFERED: '1' }
        }
      );
    }

    if (this.daemonProcess) {
      this.daemonProcess.on('exit', (code, signal) => {
        console.log(`[DaemonManager] Backend process exited (code ${code}, signal ${signal})`);
        this.daemonProcess = null;
      });
    }

    return this.waitForReadiness(25000);
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
    console.warn('[DaemonManager] Daemon health check timed out.');
    return false;
  }

  public async stop(): Promise<void> {
    console.log('[DaemonManager] Stopping backend daemon...');
    try {
      await new Promise<void>((resolve) => {
        const req = http.request(
          `${this.baseUrl}/api/shutdown`,
          { method: 'POST', timeout: 600 },
          () => resolve()
        );
        req.on('error', () => resolve());
        req.end();
      });
    } catch {
      // Ignore
    }

    if (this.daemonProcess && this.daemonProcess.pid) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', this.daemonProcess.pid.toString(), '/f', '/t']);
        } else {
          process.kill(-this.daemonProcess.pid, 'SIGKILL');
        }
      } catch (err) {
        console.warn('[DaemonManager] Process kill exception:', err);
      }
      this.daemonProcess = null;
    }
  }
}
