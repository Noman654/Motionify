/** Type declarations for the Electron IPC bridge exposed via preload.cjs */

interface ElectronAPI {
  getFfmpegVersion: () => Promise<string>;
  startRender: (config: { width: number; height: number; fps: number }) => Promise<{ status: string; tempPath: string }>;
  writeFrame: (buffer: ArrayBuffer) => Promise<boolean>;
  endRender: (config: {
    originalVideoPath: string;
    bgMusicPath: string | null;
    bgMusicVolume: number;
    outputPath: string;
  }) => Promise<{ status: string; outputPath: string }>;
  saveDialog: (defaultName: string) => Promise<string | undefined>;
  saveTempFile: (config: { buffer: ArrayBuffer; extension: string }) => Promise<string>;
  onProgress: (callback: (data: { percent?: number; phase?: string }) => void) => () => void;
  removeAllProgressListeners: () => void;
  initOverlayWindow: (config: { htmlContent: string; width: number; height: number }) => Promise<{ success: boolean; width?: number; height?: number; error?: string }>;
  resizeOverlayWindow: (config: { width: number; height: number }) => Promise<{ success: boolean; error?: string }>;
  captureOverlayFrame: (config: { time: number }) => Promise<{ success: boolean; buffer?: ArrayBuffer; error?: string }>;
  closeOverlayWindow: () => Promise<{ success: boolean; error?: string }>;
  saveInlineHtml: (html: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  getInlineHtml: (html: string) => Promise<{ success: boolean; html?: string; error?: string }>;
}

interface Window {
  electron?: ElectronAPI;
}
