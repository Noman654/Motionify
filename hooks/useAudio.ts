import { useState } from 'react';

export function useAudio(initialVolume = 0.2) {
    const [bgMusicFile, setBgMusicFile] = useState<File | null>(null);
    const [bgMusicUrl, setBgMusicUrl] = useState<string | undefined>(undefined);
    const [bgMusicVolume, setBgMusicVolume] = useState(initialVolume);

    return {
        bgMusicFile,
        setBgMusicFile,
        bgMusicUrl,
        setBgMusicUrl,
        bgMusicVolume,
        setBgMusicVolume
    };
}
