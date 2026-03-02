
export interface SRTItem {
  id: number;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
}

export interface MediaAsset {
  id: string;
  file: File;
  name: string;
  type: 'image' | 'video';
  url: string; // Blob URL
}

export interface LayoutConfigStep {
  startTime: number;
  endTime: number;
  layoutMode: 'split' | 'full-video' | 'full-html' | 'pip-html';
  splitRatio?: number; // 0 to 1 (percentage of height given to HTML/Animation layer)
  captionPosition?: 'top' | 'bottom' | 'center' | 'hidden';
}

export interface GeneratedContent {
  html: string;
  layoutConfig: LayoutConfigStep[];
  reasoning?: string;
}

export enum AppState {
  WELCOME = 'WELCOME',
  UPLOAD = 'UPLOAD',
  GENERATING = 'GENERATING',
  EDITOR = 'EDITOR',
  PREVIEW = 'PREVIEW'
}

// Unified project storage interface (used by both projectStorage and projectStorageWithVideo)
export interface SavedProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;

  // Content
  html: string;
  layoutConfig: LayoutConfigStep[];
  srtText: string;
  topicContext: string;

  // Settings
  bgMusicName?: string;
  bgMusicVolume: number;

  // Metadata
  videoFileName?: string;
  hasVideo?: boolean;
  duration?: number;
  tags?: string[];
  captionStyleId?: string;
}
