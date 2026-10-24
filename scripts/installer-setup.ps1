# FileWala TOOL Post-Install Downloader & Setup Script
# Automatically downloads and sets up pixcut-ai-daemon.exe and Real-ESRGAN enhancer during installation

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  FileWala TOOL AI Engine Setup" -ForegroundColor Cyan
Write-Host "  Configuring Background Removal & Real-ESRGAN Enhancer..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$appData = [Environment]::GetFolderPath([Environment+SpecialFolder]::ApplicationData)
$pixcutBgDir = Join-Path $appData "PixCutBg"
$pixcutDesktopDir = Join-Path $appData "pixcut-desktop"
$filewalaDir = Join-Path $appData "FileWalaTool"

$backendDir1 = Join-Path $pixcutBgDir "backend"
$backendDir2 = Join-Path $pixcutDesktopDir "backend"
$backendDir3 = Join-Path $filewalaDir "backend"
$enhancerDir1 = Join-Path $pixcutBgDir "enhancer"
$enhancerDir2 = Join-Path $pixcutDesktopDir "enhancer"
$enhancerDir3 = Join-Path $filewalaDir "enhancer"

New-Item -ItemType Directory -Force -Path $backendDir1 | Out-Null
New-Item -ItemType Directory -Force -Path $backendDir2 | Out-Null
New-Item -ItemType Directory -Force -Path $backendDir3 | Out-Null
New-Item -ItemType Directory -Force -Path $enhancerDir1 | Out-Null
New-Item -ItemType Directory -Force -Path $enhancerDir2 | Out-Null
New-Item -ItemType Directory -Force -Path $enhancerDir3 | Out-Null

$daemonTarget1 = Join-Path $backendDir1 "pixcut-ai-daemon.exe"
$daemonTarget2 = Join-Path $backendDir2 "pixcut-ai-daemon.exe"
$enhancerExe1 = Join-Path $enhancerDir1 "realesrgan-ncnn-vulkan.exe"
$enhancerExe2 = Join-Path $enhancerDir2 "realesrgan-ncnn-vulkan.exe"

$daemonUrl = "https://github.com/mdsufidev/pixcutbgremover/releases/download/v1.0.0/pixcut-ai-daemon.exe"
$enhancerUrl = "https://github.com/mdsufidev/pixcutbgremover/releases/download/v1.0.0/pixcut-enhancer-vulkan.zip"

function Download-FileWithProgress($url, $targetPath, $label) {
    Write-Host "[PixCut Setup] Downloading $label..." -ForegroundColor Yellow
    Write-Host "               From: $url" -ForegroundColor DarkGray
    Write-Host "               To:   $targetPath" -ForegroundColor DarkGray

    try {
        $handler = New-Object System.Net.Http.HttpClientHandler
        $handler.AllowAutoRedirect = $true
        $client = New-Object System.Net.Http.HttpClient($handler)
        $client.Timeout = [TimeSpan]::FromMinutes(10)
        $client.DefaultRequestHeaders.Add("User-Agent", "PixCut-Installer/1.0")

        $response = $client.GetAsync($url, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
        if (-not $response.IsSuccessStatusCode) {
            Write-Host "[PixCut Setup] Warning: Server returned HTTP $($response.StatusCode)" -ForegroundColor Red
            return $false
        }

        $totalBytes = $response.Content.Headers.ContentLength
        $totalMB = if ($totalBytes) { [math]::Round($totalBytes / 1MB, 1) } else { 0 }

        $stream = $response.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
        $tempPath = "$targetPath.tmp"
        $fileStream = [System.IO.File]::Create($tempPath)

        $buffer = New-Object byte[] 65536
        $downloadedBytes = 0
        $lastReport = [DateTime]::MinValue

        while (($bytesRead = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
            $fileStream.Write($buffer, 0, $bytesRead)
            $downloadedBytes += $bytesRead

            if (([DateTime]::Now - $lastReport).TotalMilliseconds -ge 1000) {
                $downloadedMB = [math]::Round($downloadedBytes / 1MB, 1)
                $pct = if ($totalBytes) { [math]::Round(($downloadedBytes / $totalBytes) * 100) } else { 0 }
                Write-Host "`r[PixCut Setup] $label : $downloadedMB MB / $totalMB MB ($pct%)" -NoNewline -ForegroundColor Green
                $lastReport = [DateTime]::Now
            }
        }

        $fileStream.Flush()
        $fileStream.Close()
        $stream.Close()
        $client.Dispose()

        if (Test-Path $targetPath) {
            Remove-Item -Force $targetPath
        }
        Move-Item -Force $tempPath $targetPath
        Write-Host "`n[PixCut Setup] SUCCESS: $label downloaded successfully!" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "`n[PixCut Setup] Error downloading $label : $_" -ForegroundColor Red
        return $false
    }
}

# 1. Download & configure pixcut-ai-daemon.exe
$daemonNeeded = $true
if (Test-Path $daemonTarget1) {
    $size = (Get-Item $daemonTarget1).Length
    if ($size -gt 100MB) {
        Write-Host "[PixCut Setup] AI Daemon already present ($([math]::Round($size/1MB, 1)) MB). Skipping download." -ForegroundColor Green
        $daemonNeeded = $false
    }
}

if ($daemonNeeded) {
    $ok = Download-FileWithProgress $daemonUrl $daemonTarget1 "FileWala TOOL AI Daemon (~293 MB)"
    if ($ok -and (Test-Path $daemonTarget1)) {
        Copy-Item -Force $daemonTarget1 $daemonTarget2 -ErrorAction SilentlyContinue
        Copy-Item -Force $daemonTarget1 $backendDir3 -ErrorAction SilentlyContinue
    }
} else {
    Copy-Item -Force $daemonTarget1 $daemonTarget2 -ErrorAction SilentlyContinue
    Copy-Item -Force $daemonTarget1 $backendDir3 -ErrorAction SilentlyContinue
}

# 2. Download & configure Real-ESRGAN & CodeFormer Enhancer
$enhancerNeeded = $true
if ((Test-Path $enhancerExe1) -and (Test-Path (Join-Path $enhancerDir1 "models\codeformer.onnx"))) {
    Write-Host "[FileWala Setup] Real-ESRGAN & CodeFormer Enhancer already present. Skipping download." -ForegroundColor Green
    $enhancerNeeded = $false
}

if ($enhancerNeeded) {
    $zipTemp = Join-Path $env:TEMP "pixcut-enhancer-vulkan.zip"
    $ok = Download-FileWithProgress $enhancerUrl $zipTemp "Real-ESRGAN & CodeFormer Enhancer (~396 MB)"
    if ($ok -and (Test-Path $zipTemp)) {
        Write-Host "[FileWala Setup] Extracting Real-ESRGAN Enhancer to $enhancerDir1..." -ForegroundColor Yellow
        Expand-Archive -Path $zipTemp -DestinationPath $enhancerDir1 -Force
        Expand-Archive -Path $zipTemp -DestinationPath $enhancerDir2 -Force
        Expand-Archive -Path $zipTemp -DestinationPath $enhancerDir3 -Force
        Remove-Item -Force $zipTemp -ErrorAction SilentlyContinue
        Write-Host "[FileWala Setup] SUCCESS: Real-ESRGAN Enhancer extracted & ready!" -ForegroundColor Green
    }
} else {
    Copy-Item -Recurse -Force "$enhancerDir1\*" $enhancerDir2 -ErrorAction SilentlyContinue
    Copy-Item -Recurse -Force "$enhancerDir1\*" $enhancerDir3 -ErrorAction SilentlyContinue
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  FileWala TOOL AI Engines Ready! Setup Finished." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
