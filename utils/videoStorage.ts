// Video Storage using IndexedDB (for large files)

const DB_NAME = 'reel_composer_videos';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

// Open or create IndexedDB
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
};

// Save video file to IndexedDB
export const saveVideoFile = async (projectId: string, videoFile: File): Promise<void> => {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        // Store the file blob
        store.put(videoFile, projectId);

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    } catch (error) {
        console.error('Failed to save video:', error);
        throw error;
    }
};

// Load video file from IndexedDB
export const loadVideoFile = async (projectId: string): Promise<File | null> => {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(projectId);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const file = request.result;
                resolve(file || null);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Failed to load video:', error);
        return null;
    }
};

// Delete video file from IndexedDB
export const deleteVideoFile = async (projectId: string): Promise<void> => {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(projectId);

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    } catch (error) {
        console.error('Failed to delete video:', error);
        throw error;
    }
};

// Get all video IDs
export const getAllVideoIds = async (): Promise<string[]> => {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAllKeys();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result as string[]);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Failed to get video IDs:', error);
        return [];
    }
};

// Get storage info
export const getVideoStorageInfo = async (): Promise<{
    count: number;
    estimatedSize: string;
}> => {
    try {
        const ids = await getAllVideoIds();

        // Try to estimate storage (not all browsers support this)
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const usedMB = ((estimate.usage || 0) / 1024 / 1024).toFixed(2);
            const quotaMB = ((estimate.quota || 0) / 1024 / 1024).toFixed(2);

            return {
                count: ids.length,
                estimatedSize: `${usedMB} MB / ${quotaMB} MB`
            };
        }

        return {
            count: ids.length,
            estimatedSize: 'Unknown'
        };
    } catch (error) {
        console.error('Failed to get storage info:', error);
        return {
            count: 0,
            estimatedSize: 'Unknown'
        };
    }
};

// Clean up orphaned videos (videos without matching projects)
export const cleanupOrphanedVideos = async (activeProjectIds: string[]): Promise<number> => {
    try {
        const allVideoIds = await getAllVideoIds();
        const orphaned = allVideoIds.filter(id => !activeProjectIds.includes(id));

        for (const id of orphaned) {
            await deleteVideoFile(id);
        }

        return orphaned.length;
    } catch (error) {
        console.error('Failed to cleanup videos:', error);
        return 0;
    }
};
