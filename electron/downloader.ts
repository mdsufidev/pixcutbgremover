import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';

export interface DownloadProgress {
  percent: number;
  downloadedMB: number;
  totalMB: number;
  speedMBs: number;
}

export function downloadFileWithRedirects(
  fileUrl: string,
  destPath: string,
  onProgress?: (p: DownloadProgress) => void,
  maxRedirects: number = 6
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      return reject(new Error('Too many redirects while downloading backend'));
    }

    let parsed: URL;
    try {
      parsed = new URL(fileUrl);
    } catch (e) {
      return reject(new Error(`Invalid URL: ${fileUrl}`));
    }

    const client = parsed.protocol === 'http:' ? http : https;

    const request = client.get(
      fileUrl,
      {
        headers: {
          'User-Agent': 'PixCutBg-Desktop-Installer/1.0',
          Accept: '*/*',
        },
      },
      (res) => {
        // Handle 301, 302, 303, 307, 308 redirects (GitHub releases redirect to AWS S3)
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let redirectUrl = res.headers.location;
          if (!redirectUrl.startsWith('http')) {
            redirectUrl = new URL(redirectUrl, fileUrl).toString();
          }
          res.resume();
          return downloadFileWithRedirects(redirectUrl, destPath, onProgress, maxRedirects - 1)
            .then(resolve)
            .catch(reject);
        }

        if (res.statusCode !== 200) {
          res.resume();
          return reject(
            new Error(`Failed to download backend: Server returned HTTP ${res.statusCode} ${res.statusMessage}`)
          );
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        let lastTime = Date.now();
        let lastBytes = 0;
        let currentSpeedMBs = 0;

        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        const tempPath = destPath + '.tmp';
        const fileStream = fs.createWriteStream(tempPath);

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          fileStream.write(chunk);

          const now = Date.now();
          const diff = (now - lastTime) / 1000;
          if (diff >= 0.2) {
            const bytesDiff = downloadedBytes - lastBytes;
            currentSpeedMBs = Number(((bytesDiff / diff) / (1024 * 1024)).toFixed(1));
            lastTime = now;
            lastBytes = downloadedBytes;

            if (onProgress) {
              const percent = totalBytes > 0 ? Number(((downloadedBytes / totalBytes) * 100).toFixed(1)) : 0;
              const downloadedMB = Number((downloadedBytes / (1024 * 1024)).toFixed(1));
              const totalMB = Number((totalBytes / (1024 * 1024)).toFixed(1));
              onProgress({
                percent,
                downloadedMB,
                totalMB,
                speedMBs: currentSpeedMBs,
              });
            }
          }
        });

        res.on('end', () => {
          fileStream.end(() => {
            try {
              if (fs.existsSync(destPath)) {
                fs.unlinkSync(destPath);
              }
              fs.renameSync(tempPath, destPath);

              // Final 100% progress callback
              if (onProgress) {
                const totalMB = Number((downloadedBytes / (1024 * 1024)).toFixed(1));
                onProgress({
                  percent: 100,
                  downloadedMB: totalMB,
                  totalMB: totalMB,
                  speedMBs: 0,
                });
              }
              resolve();
            } catch (err) {
              reject(err);
            }
          });
        });

        res.on('error', (err) => {
          fileStream.destroy();
          if (fs.existsSync(tempPath)) {
            try {
              fs.unlinkSync(tempPath);
            } catch {}
          }
          reject(err);
        });
      }
    );

    request.on('error', (err) => {
      reject(err);
    });
  });
}
