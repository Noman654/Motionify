// Project Storage System - Save and load your reel projects

export interface SavedProject {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    thumbnail?: string; // Base64 screenshot

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
    duration?: number;
    tags?: string[];
}

const STORAGE_KEY = 'reel_composer_projects';
const MAX_PROJECTS = 50; // Limit to prevent storage overflow

// Get all saved projects
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

// Save a new project
export const saveProject = (project: Omit<SavedProject, 'id' | 'createdAt' | 'updatedAt'>): SavedProject => {
    const projects = getAllProjects();

    const newProject: SavedProject = {
        ...project,
        id: generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    // Add to beginning (most recent first)
    projects.unshift(newProject);

    // Keep only last MAX_PROJECTS
    const trimmed = projects.slice(0, MAX_PROJECTS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return newProject;
};

// Update existing project
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

// Delete a project
export const deleteProject = (id: string): boolean => {
    const projects = getAllProjects();
    const filtered = projects.filter(p => p.id !== id);

    if (filtered.length === projects.length) return false;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
};

// Get project by ID
export const getProject = (id: string): SavedProject | null => {
    const projects = getAllProjects();
    return projects.find(p => p.id === id) || null;
};

// Generate unique ID
const generateId = (): string => {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get storage stats
export const getStorageStats = () => {
    const projects = getAllProjects();
    const data = localStorage.getItem(STORAGE_KEY) || '';

    return {
        projectCount: projects.length,
        storageUsed: new Blob([data]).size,
        storageUsedMB: (new Blob([data]).size / 1024 / 1024).toFixed(2)
    };
};

// Export project as JSON file
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

// Import project from JSON file
export const importProjectFromFile = async (file: File): Promise<SavedProject> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const project = JSON.parse(e.target?.result as string);

                // Validate required fields
                if (!project.html || !project.layoutConfig) {
                    throw new Error('Invalid project file');
                }

                // Save as new project
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

// Search projects
export const searchProjects = (query: string): SavedProject[] => {
    const projects = getAllProjects();
    const lowerQuery = query.toLowerCase();

    return projects.filter(p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.topicContext.toLowerCase().includes(lowerQuery) ||
        p.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
};

// Auto-save feature (call this periodically)
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
    // Check if an auto-save already exists
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
