const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getFfmpegVersion: () => ipcRenderer.invoke('get-ffmpeg-version'),
    startRender: (config) => ipcRenderer.invoke('start-render', config),
    writeFrame: (buffer) => ipcRenderer.invoke('write-frame', buffer),
    endRender: (config) => ipcRenderer.invoke('end-render', config),
    saveDialog: (defaultName) => ipcRenderer.invoke('save-dialog', defaultName),
    saveTempFile: (config) => ipcRenderer.invoke('save-temp-file', config),
    onProgress: (callback) => ipcRenderer.on('ffmpeg-progress', (_, data) => callback(data)),
    // Native overlay capture (for external resources like icons)
    initOverlayWindow: (config) => ipcRenderer.invoke('init-overlay-window', config),
    captureOverlayFrame: (config) => ipcRenderer.invoke('capture-overlay-frame', config),
    closeOverlayWindow: () => ipcRenderer.invoke('close-overlay-window'),
    saveInlineHtml: (html) => ipcRenderer.invoke('save-inline-html', html),
});
