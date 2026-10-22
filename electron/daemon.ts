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
    // 1. Check if daemon is already running (e.g. manually started by user)
    const alreadyRunning = await this.checkHealth();
    if (alreadyRunning) {
      console.log('[DaemonManager] Backend daemon already running on', this.baseUrl);
      return true;
    }

    const binaryName = process.platform === 'win32' ? 'pixcut-ai-daemon.exe' : 'pixcut-ai-daemon';
    const rootDir = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..');

    // Candidate locations for the compiled standalone daemon
    const candidatePaths = [
      path.join(rootDir, 'backend-dist', 'pixcut-ai-daemon', binaryName),
      path.join(rootDir, 'backend-dist', binaryName),
      path.join(process.resourcesPath, 'backend-dist', 'pixcut-ai-daemon', binaryName),
      path.join(process.resourcesPath, 'backend-dist', binaryName),
      path.join(__dirname, '..', 'resources', 'backend-dist', 'pixcut-ai-daemon', binaryName),
    ];

    let foundExecutable: string | null = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        foundExecutable = p;
        break;
      }
    }

    if (foundExecutable) {
      console.log(`[DaemonManager] Spawning bundled standalone daemon from ${foundExecutable}...`);
      this.daemonProcess = spawn(
        foundExecutable,
        ['--host', this.host, '--port', this.port.toString()],
        {
          detached: false,
          stdio: 'ignore'
        }
      );
    } else {
      // Fallback: spawn via local python on system
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const projectRoot = path.resolve(__dirname, '..');
      console.log(`[DaemonManager] Standalone binary not found. Spawning via ${pythonCmd} from ${projectRoot}...`);
      
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
      this.daemonProcess.stdout?.on('data', (data) => {
        console.log(`[Daemon stdout]: ${data}`);
      });

      this.daemonProcess.stderr?.on('data', (data) => {
        console.error(`[Daemon stderr]: ${data}`);
      });

      this.daemonProcess.on('exit', (code, signal) => {
        console.log(`[DaemonManager] Backend process exited with code ${code}, signal ${signal}`);
        this.daemonProcess = null;
      });
    }

    // Wait until daemon health check responds (up to 20 seconds for cold AI model load)
    return this.waitForReadiness(20000);
  }

  public checkHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`${this.baseUrl}/health`, { timeout: 1200 }, (res) => {
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
    console.warn('[DaemonManager] Daemon health check timed out. Proceeding...');
    return false;
  }

  public async stop(): Promise<void> {
    console.log('[DaemonManager] Stopping backend daemon...');
    
    // Attempt graceful shutdown endpoint
    try {
      await new Promise<void>((resolve) => {
        const req = http.request(
          `${this.baseUrl}/api/shutdown`,
          { method: 'POST', timeout: 800 },
          () => resolve()
        );
        req.on('error', () => resolve());
        req.end();
      });
    } catch {
      // Ignore
    }

    // Force kill if still lingering
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
