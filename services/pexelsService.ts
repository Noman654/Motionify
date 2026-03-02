// ──────────────────────────────────────────────────────
// Pexels API Service — Stock video/image search for B-Roll
// ──────────────────────────────────────────────────────

const PEXELS_API_URL = 'https://api.pexels.com';

export interface PexelsVideo {
    id: number;
    url: string;
    image: string; // thumbnail
    duration: number;
    width: number;
    height: number;
    videoFiles: {
        id: number;
        quality: string;
        width: number;
        height: number;
        link: string;
        fileType: string;
    }[];
    user: { name: string; url: string };
}

export interface PexelsPhoto {
    id: number;
    url: string;
    photographer: string;
    src: {
        original: string;
        large2x: string;
        large: string;
        medium: string;
        small: string;
        portrait: string;
        landscape: string;
        tiny: string;
    };
    width: number;
    height: number;
}

export interface PexelsSearchResult {
    videos: PexelsVideo[];
    photos: PexelsPhoto[];
    totalVideos: number;
    totalPhotos: number;
}

function getPexelsApiKey(): string {
    // Try from .env or localStorage
    const envKey = (import.meta as any).env?.VITE_PEXELS_API_KEY;
    if (envKey) return envKey;

    const storedKey = localStorage.getItem('pexels_api_key');
    if (storedKey) return storedKey;

    return '';
}

export function setPexelsApiKey(key: string): void {
    localStorage.setItem('pexels_api_key', key);
}

export function hasPexelsApiKey(): boolean {
    return !!getPexelsApiKey();
}

export async function searchPexelsVideos(
    query: string,
    perPage: number = 8,
    orientation: 'portrait' | 'landscape' | 'square' = 'portrait'
): Promise<PexelsVideo[]> {
    const apiKey = getPexelsApiKey();
    if (!apiKey) throw new Error('Pexels API key not configured');

    const params = new URLSearchParams({
        query,
        per_page: String(perPage),
        orientation,
    });

    const response = await fetch(`${PEXELS_API_URL}/videos/search?${params}`, {
        headers: { Authorization: apiKey },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Pexels API error (${response.status}): ${text}`);
    }

    const data = await response.json();

    return (data.videos || []).map((v: any) => ({
        id: v.id,
        url: v.url,
        image: v.image,
        duration: v.duration,
        width: v.width,
        height: v.height,
        videoFiles: (v.video_files || []).map((f: any) => ({
            id: f.id,
            quality: f.quality,
            width: f.width,
            height: f.height,
            link: f.link,
            fileType: f.file_type,
        })),
        user: { name: v.user?.name || '', url: v.user?.url || '' },
    }));
}

export async function searchPexelsPhotos(
    query: string,
    perPage: number = 8,
    orientation: 'portrait' | 'landscape' | 'square' = 'portrait'
): Promise<PexelsPhoto[]> {
    const apiKey = getPexelsApiKey();
    if (!apiKey) throw new Error('Pexels API key not configured');

    const params = new URLSearchParams({
        query,
        per_page: String(perPage),
        orientation,
    });

    const response = await fetch(`${PEXELS_API_URL}/v1/search?${params}`, {
        headers: { Authorization: apiKey },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Pexels API error (${response.status}): ${text}`);
    }

    const data = await response.json();

    return (data.photos || []).map((p: any) => ({
        id: p.id,
        url: p.url,
        photographer: p.photographer,
        src: p.src,
        width: p.width,
        height: p.height,
    }));
}

export async function searchPexels(
    query: string,
    perPage: number = 6,
    orientation: 'portrait' | 'landscape' | 'square' = 'portrait'
): Promise<PexelsSearchResult> {
    // Search both videos and photos in parallel
    const [videos, photos] = await Promise.all([
        searchPexelsVideos(query, perPage, orientation).catch(() => []),
        searchPexelsPhotos(query, perPage, orientation).catch(() => []),
    ]);

    return {
        videos,
        photos,
        totalVideos: videos.length,
        totalPhotos: photos.length,
    };
}

/**
 * Get the best video file URL for a given video (prefer HD, portrait)
 */
export function getBestVideoUrl(video: PexelsVideo): string {
    // Prefer HD quality, portrait orientation
    const sorted = [...video.videoFiles]
        .filter(f => f.fileType === 'video/mp4')
        .sort((a, b) => {
            // Prefer portrait
            const aPortrait = a.height > a.width ? 1 : 0;
            const bPortrait = b.height > b.width ? 1 : 0;
            if (aPortrait !== bPortrait) return bPortrait - aPortrait;
            // Then prefer higher resolution (but not too high to keep download fast)
            const aScore = a.width <= 1080 ? a.width : 1080 - (a.width - 1080);
            const bScore = b.width <= 1080 ? b.width : 1080 - (b.width - 1080);
            return bScore - aScore;
        });

    return sorted[0]?.link || video.videoFiles[0]?.link || '';
}
