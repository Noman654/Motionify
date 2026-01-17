// COMPLETE Project Storage with Video Support
// This replaces the existing projectStorage.ts

import { saveVideoFile, loadVideoFile, deleteVideoFile } from './videoStorage';

export interface SavedProject {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    thumbnail?: string;

    // Content
    html: string;
    layoutConfig: any[];
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
}

const STORAGE_KEY = 'reel_composer_projects';
const MAX_PROJECTS = 50;

export const getAllProjects = (): SavedProject[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        return JSON.parse(data);
    } catch (e) {
        console.error('Failed to load projects:', e);
        return [];
    }
};

// NEW: Save project WITH video file
export const saveProjectWithVideo = async (
    project: Omit<SavedProject, 'id' | 'createdAt' | 'updatedAt' | 'hasVideo'>,
    videoFile?: File
): Promise<SavedProject> => {
    const projects = getAllProjects();

    const newProject: SavedProject = {
        ...project,
        id: generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        hasVideo: !!videoFile
    };

    // Save video to IndexedDB
    if (videoFile) {
        try {
            await saveVideoFile(newProject.id, videoFile);
            console.log('✅ Video saved:', videoFile.name);
        } catch (e) {
            console.error('❌ Video save failed:', e);
            newProject.hasVideo = false;
        }
    }

    projects.unshift(newProject);
    const trimmed = projects.slice(0, MAX_PROJECTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

    return newProject;
};

// NEW: Load project WITH video file
export const loadProjectWithVideo = async (id: string): Promise<{
    project: SavedProject | null;
    videoFile: File | null;
}> => {
    const project = getProject(id);
    if (!project) return { project: null, videoFile: null };

    let videoFile: File | null = null;

    if (project.hasVideo) {
        try {
            videoFile = await loadVideoFile(id);
            if (videoFile) {
                console.log('✅ Video loaded:', videoFile.name);
            }
        } catch (e) {
            console.error('❌ Video load failed:', e);
        }
    }

    return { project, videoFile };
};

// OLD: Backwards compatible save (no video)
export const saveProject = (project: Omit<SavedProject, 'id' | 'createdAt' | 'updatedAt'>): SavedProject => {
    const projects = getAllProjects();

    const newProject: SavedProject = {
        ...project,
        id: generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    projects.unshift(newProject);
    const trimmed = projects.slice(0, MAX_PROJECTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return newProject;
};

export const updateProject = (id: string, updates: Partial<SavedProject>): boolean => {
    const projects = getAllProjects();
    const index = projects.findIndex(p => p.id === id);

    if (index === -1) return false;

    projects[index] = {
        ...projects[index],
        ...updates,
        updatedAt: Date.now()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return true;
};

export const deleteProject = async (id: string): Promise<boolean> => {
    const projects = getAllProjects();
    const project = projects.find(p => p.id === id);

    // Delete video from IndexedDB
    if (project?.hasVideo) {
        try {
            await deleteVideoFile(id);
            console.log('✅ Video deleted');
        } catch (e) {
            console.error('❌ Video delete failed:', e);
        }
    }

    const filtered = projects.filter(p => p.id !== id);
    if (filtered.length === projects.length) return false;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
};

export const getProject = (id: string): SavedProject | null => {
    const projects = getAllProjects();
    return projects.find(p => p.id === id) || null;
};

const generateId = (): string => {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const getStorageStats = () => {
    const projects = getAllProjects();
    const data = localStorage.getItem(STORAGE_KEY) || '';

    return {
        projectCount: projects.length,
        storageUsed: new Blob([data]).size,
        storageUsedMB: (new Blob([data]).size / 1024 / 1024).toFixed(2)
    };
};

export const exportProjectToFile = (project: SavedProject) => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const importProjectFromFile = async (file: File): Promise<SavedProject> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const project = JSON.parse(e.target?.result as string);

                if (!project.html || !project.layoutConfig) {
                    throw new Error('Invalid project file');
                }

                const saved = saveProject({
                    name: project.name || 'Imported Project',
                    html: project.html,
                    layoutConfig: project.layoutConfig,
                    srtText: project.srtText || '',
                    topicContext: project.topicContext || '',
                    bgMusicVolume: project.bgMusicVolume || 0.2,
                    bgMusicName: project.bgMusicName,
                    tags: project.tags || []
                });

                resolve(saved);
            } catch (e) {
                reject(e);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

export const searchProjects = (query: string): SavedProject[] => {
    const projects = getAllProjects();
    const lowerQuery = query.toLowerCase();

    return projects.filter(p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.topicContext.toLowerCase().includes(lowerQuery) ||
        p.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
};

export const autoSaveProject = (
    name: string,
    html: string,
    layoutConfig: any[],
    srtText: string,
    topicContext: string,
    options: {
        bgMusicName?: string;
        bgMusicVolume?: number;
        videoFileName?: string;
    } = {}
) => {
    const projects = getAllProjects();
    const autoSaveProject = projects.find(p => p.name === `[AutoSave] ${name}`);

    if (autoSaveProject) {
        updateProject(autoSaveProject.id, {
            html,
            layoutConfig,
            srtText,
            topicContext,
            ...options
        });
    } else {
        saveProject({
            name: `[AutoSave] ${name}`,
            html,
            layoutConfig,
            srtText,
            topicContext,
            bgMusicVolume: options.bgMusicVolume || 0.2,
            ...options
        });
    }
};
