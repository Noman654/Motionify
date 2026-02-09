const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getFfmpegVersion: () => ipcRenderer.invoke('get-ffmpeg-version'),
    startRender: (config) => ipcRenderer.invoke('start-render', config),
    writeFrame: (buffer) => ipcRenderer.invoke('write-frame', buffer),
    endRender: (config) => ipcRenderer.invoke('end-render', config),
    saveDialog: (defaultName) => ipcRenderer.invoke('save-dialog', defaultName),
    saveTempFile: (config) => ipcRenderer.invoke('save-temp-file', config),
    onProgress: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('ffmpeg-progress', handler);
        // Return an unsubscribe function so the caller can clean up
        return () => ipcRenderer.removeListener('ffmpeg-progress', handler);
    },
    removeAllProgressListeners: () => ipcRenderer.removeAllListeners('ffmpeg-progress'),
    initOverlayWindow: (config) => ipcRenderer.invoke('init-overlay-window', config),
    resizeOverlayWindow: (config) => ipcRenderer.invoke('resize-overlay-window', config),
    captureOverlayFrame: (config) => ipcRenderer.invoke('capture-overlay-frame', config),
    closeOverlayWindow: () => ipcRenderer.invoke('close-overlay-window'),
    saveInlineHtml: (html) => ipcRenderer.invoke('save-inline-html', html),
    getInlineHtml: (html) => ipcRenderer.invoke('get-inline-html', html)
});
