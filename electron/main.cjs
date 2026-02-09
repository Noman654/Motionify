const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { processHtml } = require('./htmlInliner.cjs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked');

// Setup FFmpeg Path
ffmpeg.setFfmpegPath(ffmpegPath);

let mainWindow;
let overlayWindow = null;

// --- OVERLAY CAPTURE HANDLERS (for HTML content with external resources) ---

// Initialize a hidden browser window for overlay capture
ipcMain.handle('init-overlay-window', async (event, { htmlContent, width, height }) => {
    try {
        // Close any existing overlay window
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.destroy();
        }

        // Create hidden window with exact dimensions for pixel-perfect capture
        overlayWindow = new BrowserWindow({
            show: false,
            width: width,
            height: height,
            frame: false,
            transparent: true,
            webPreferences: {
                offscreen: true,
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: false, // Allow loading cross-origin resources (fonts, CDNs)
            }
        });

        // Enable offscreen rendering for consistent capture
        overlayWindow.webContents.setFrameRate(60);

        // Detect if htmlContent is already a complete HTML document
        const isCompleteDoc = htmlContent.trim().toLowerCase().startsWith('<!doctype') ||
                              htmlContent.trim().toLowerCase().startsWith('<html');

        let finalHtml;
        if (isCompleteDoc) {
            // Inject sizing overrides into the existing document
            const sizeOverride = `<style>html,body{width:${width}px;height:${height}px;overflow:hidden;margin:0;padding:0;}</style>`;
            // Insert after <head> if present, otherwise prepend
            if (htmlContent.includes('<head>')) {
                finalHtml = htmlContent.replace('<head>', '<head>' + sizeOverride);
            } else {
                finalHtml = sizeOverride + htmlContent;
            }
        } else {
            // Wrap in a full HTML shell
            finalHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
                <style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:${width}px;height:${height}px;overflow:hidden;background:transparent;}</style>
                </head><body>${htmlContent}</body></html>`;
        }

        await overlayWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(finalHtml)}`);

        // Wait for content to fully load (including external resources like fonts/CDNs)
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log('Overlay window initialized:', width, 'x', height);
        return { success: true, width, height };
    } catch (err) {
        console.error('Failed to init overlay window:', err);
        return { success: false, error: err.message };
    }
});

// Resize the overlay window (e.g. when layout mode changes during export)
ipcMain.handle('resize-overlay-window', async (event, { width, height }) => {
    try {
        if (!overlayWindow || overlayWindow.isDestroyed()) {
            return { success: false, error: 'No overlay window' };
        }
        overlayWindow.setSize(width, height);
        // Also update the DOM sizing
        await overlayWindow.webContents.executeJavaScript(`
            document.documentElement.style.width = '${width}px';
            document.documentElement.style.height = '${height}px';
            document.body.style.width = '${width}px';
            document.body.style.height = '${height}px';
        `);
        // Small delay for layout reflow
        await new Promise(resolve => setTimeout(resolve, 16));
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// Capture a single frame from the overlay window
ipcMain.handle('capture-overlay-frame', async (event, { time }) => {
    try {
        if (!overlayWindow || overlayWindow.isDestroyed()) {
            throw new Error('Overlay window not initialized');
        }

        // Sync time using postMessage (matches the GSAP listener pattern in generated HTML)
        await overlayWindow.webContents.executeJavaScript(`
            window.postMessage({ type: 'timeupdate', time: ${time} }, '*');
        `);

        // Small delay to allow GSAP animations to update
        await new Promise(resolve => setTimeout(resolve, 16));

        // Capture the full page via Chromium's native renderer
        const image = await overlayWindow.webContents.capturePage();

        // Return as PNG buffer for maximum quality (lossless)
        const pngBuffer = image.toPNG();
        return { success: true, buffer: pngBuffer };
    } catch (err) {
        console.error('Failed to capture overlay frame:', err);
        return { success: false, error: err.message };
    }
});

// Close the overlay window when done
ipcMain.handle('close-overlay-window', async () => {
    try {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.destroy();
            console.log('Overlay window closed');
        }
        overlayWindow = null;
        return { success: true };
    } catch (err) {
        console.error('Failed to close overlay window:', err);
        return { success: false, error: err.message };
    }
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true
            // webSecurity left at default (true) for the main window.
            // The offscreen overlay window uses webSecurity:false for cross-origin resources.
        },
        titleBarStyle: 'hiddenInset',
    });

    const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`;

    if (process.env.ELECTRON_START_URL) {
        mainWindow.loadURL(startUrl);
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadURL(startUrl);
    }

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// --- NATIVE FFMPEG HANDLERS ---

let renderStream = null;
let tempVideoPath = null;
let pass1FinishedPromise = null; // Promise that resolves when Pass 1 FFmpeg finishes
let tempFilePaths = []; // Track all temp files for cleanup

// Cleanup helper — removes all tracked temp files
function cleanupTempFiles() {
    for (const p of tempFilePaths) {
        try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) { /* ignore */ }
    }
    tempFilePaths = [];
}

// Pass 1: Start video-only render (no audio)
ipcMain.handle('start-render', async (event, { width, height, fps }) => {
    return new Promise((resolve, reject) => {
        try {
            // Create temp file for video-only output
            tempVideoPath = path.join(os.tmpdir(), `reel_temp_${Date.now()}.mp4`);
            tempFilePaths.push(tempVideoPath);
            renderStream = new require('stream').PassThrough();

            // Create a Promise that resolves when Pass 1 FFmpeg encoding finishes
            pass1FinishedPromise = new Promise((resolvePass1, rejectPass1) => {
                ffmpeg(renderStream)
                    .inputFormat('image2pipe')
                    .inputOptions([
                        `-r ${fps}`,
                        '-f image2pipe',
                        '-vcodec mjpeg'
                    ])
                    .outputOptions([
                        '-c:v libx264',
                        '-pix_fmt yuv420p',
                        '-preset fast',
                        '-crf 23'
                    ])
                    .save(tempVideoPath)
                    .on('start', (cmd) => {
                        console.log('FFmpeg Pass 1 Started:', cmd);
                        resolve({ status: 'started', tempPath: tempVideoPath });
                    })
                    .on('error', (err) => {
                        console.error('FFmpeg Pass 1 Error:', err);
                        if (renderStream) renderStream.end();
                        rejectPass1(err);
                        reject(err.message);
                    })
                    .on('end', () => {
                        console.log('FFmpeg Pass 1 Finished (Video Only)');
                        resolvePass1();
                    });
            });

        } catch (e) {
            reject(e.message);
        }
    });
});

ipcMain.handle('write-frame', async (event, buffer) => {
    if (renderStream && !renderStream.destroyed) {
        const nodeBuffer = Buffer.from(buffer);
        renderStream.write(nodeBuffer);
        return true;
    }
    return false;
});

// Pass 2: End video stream and merge with audio
ipcMain.handle('end-render', async (event, { originalVideoPath, bgMusicPath, bgMusicVolume, outputPath }) => {
    // End the frame input stream
    if (renderStream) {
        renderStream.end();
    }

    // Wait for Pass 1 FFmpeg to actually finish encoding (event-driven, not a timer)
    try {
        if (pass1FinishedPromise) {
            console.log('Waiting for Pass 1 to finish...');
            await pass1FinishedPromise;
        }
    } catch (err) {
        console.error('Pass 1 failed, cannot proceed to Pass 2:', err);
        cleanupTempFiles();
        throw new Error('Pass 1 encoding failed: ' + (err.message || err));
    }

    console.log('Starting Pass 2: Audio Merge');
    console.log('Temp Video:', tempVideoPath);
    console.log('Original Audio Source:', originalVideoPath);
    console.log('Output:', outputPath);

    return new Promise((resolve, reject) => {
        const command = ffmpeg();

        // Input 1: Temp video (frames we rendered)
        command.input(tempVideoPath);

        // Input 2: Original video (for audio)
        if (originalVideoPath && fs.existsSync(originalVideoPath)) {
            command.input(originalVideoPath);
        }

        // Input 3: Background music (optional)
        if (bgMusicPath && fs.existsSync(bgMusicPath)) {
            command.input(bgMusicPath);
        }

        // Build filter complex for audio mixing
        let filterComplex = '';
        let audioMap = '';

        if (originalVideoPath && bgMusicPath) {
            // Mix original audio [1:a] with bg music [2:a]
            const vol = bgMusicVolume || 0.2;
            filterComplex = `[1:a]volume=1.0[a1];[2:a]volume=${vol}[a2];[a1][a2]amix=inputs=2:duration=shortest[aout]`;
            audioMap = '[aout]';
        } else if (originalVideoPath) {
            // Just use original video audio
            audioMap = '1:a?';
        }

        command
            .outputOptions([
                '-c:v copy',  // Copy video stream (no re-encode)
                '-c:a aac',
                '-b:a 192k',
                '-shortest',
                '-movflags +faststart'
            ]);

        if (filterComplex) {
            command.complexFilter(filterComplex);
            command.outputOptions(['-map', '0:v', '-map', audioMap]);
        } else if (audioMap) {
            command.outputOptions(['-map', '0:v', '-map', audioMap]);
        }

        command
            .save(outputPath)
            .on('start', (cmd) => {
                console.log('FFmpeg Pass 2 Started:', cmd);
            })
            .on('progress', (progress) => {
                console.log('Processing: ' + progress.percent + '% done');
                event.sender.send('ffmpeg-progress', { percent: progress.percent, phase: 'merging' });
            })
            .on('error', (err) => {
                console.error('FFmpeg Pass 2 Error:', err);
                cleanupTempFiles();
                reject(err.message);
            })
            .on('end', () => {
                console.log('FFmpeg Pass 2 Finished - Export Complete!');
                cleanupTempFiles();
                resolve({ status: 'done', outputPath });
            });
    });
});

ipcMain.handle('save-dialog', async (event, defaultName) => {
    const { filePath } = await dialog.showSaveDialog({
        defaultPath: defaultName,
        filters: [{ name: 'Movies', extensions: ['mp4'] }]
    });
    return filePath;
});

ipcMain.handle('save-inline-html', async (event, htmlContent) => {
    try {
        const { filePath } = await dialog.showSaveDialog({
            defaultPath: 'Reel_With_Assets.html',
            filters: [{ name: 'HTML File', extensions: ['html'] }]
        });

        if (!filePath) return { success: false };

        console.log('Starting HTML Inlining process...');
        const inlinedHtml = await processHtml(htmlContent);

        fs.writeFileSync(filePath, inlinedHtml, 'utf-8');
        console.log('HTML Saved to:', filePath);

        return { success: true, filePath };
    } catch (e) {
        console.error('HTML Inline Error:', e);
        return { success: false, error: e.message };
    }
});

// Just return the string, don't save
ipcMain.handle('get-inline-html', async (event, htmlContent) => {
    try {
        const inlinedHtml = await processHtml(htmlContent);
        return { success: true, html: inlinedHtml };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// Save temp file from renderer (for original video/audio)
ipcMain.handle('save-temp-file', async (event, { buffer, extension }) => {
    const tempPath = path.join(os.tmpdir(), `reel_asset_${Date.now()}.${extension}`);
    fs.writeFileSync(tempPath, Buffer.from(buffer));
    tempFilePaths.push(tempPath); // Track for cleanup
    return tempPath;
});

ipcMain.handle('get-ffmpeg-version', async () => {
    return 'FFmpeg Ready: ' + ffmpegPath;
});

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
