import React, { useState } from 'react';
import { Upload, FileVideo, FileText, ArrowRight, Download, ExternalLink, Music } from 'lucide-react';
import { extractWavFromVideo } from '../utils/audioHelpers';

interface FileUploadProps {
  onFilesSelected: (videoFile: File, srtFile: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
    }
  };

  const handleSrtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSrtFile(e.target.files[0]);
    }
  };

  const handleExtractAudio = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering file input if label is clicked
    if (!videoFile) return;
    
    setIsExtracting(true);
    try {
      await extractWavFromVideo(videoFile);
    } catch (e) {
      alert("Failed to extract audio.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleNext = () => {
    if (videoFile && srtFile) {
      onFilesSelected(videoFile, srtFile);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 tracking-tight">
          Reel Composer
        </h1>
        <p className="text-gray-400 text-lg">Upload footage, sync subtitles, and compose dynamic scenes.</p>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Video & Audio Tools */}
        <div className="space-y-4">
          <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all h-64 relative ${videoFile ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700 hover:border-gray-500 bg-gray-900/50'}`}>
            <input 
              type="file" 
              accept="video/*" 
              onChange={handleVideoChange} 
              className="hidden" 
              id="video-upload" 
            />
            <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center space-y-4 w-full h-full justify-center z-10">
              <div className="p-4 rounded-full bg-gray-800 text-purple-400 shadow-lg">
                <FileVideo size={32} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">{videoFile ? videoFile.name : "Select Video"}</p>
                <p className="text-xs text-gray-500 mt-1">MP4, MOV</p>
              </div>
            </label>
            
            {/* Extract Overlay */}
            {videoFile && (
               <div className="absolute bottom-4 left-0 w-full flex justify-center z-20">
                 <button 
                   onClick={handleExtractAudio}
                   disabled={isExtracting}
                   className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-full text-xs font-medium border border-gray-600 transition-colors shadow-lg"
                 >
                   {isExtracting ? <span className="animate-pulse">Processing...</span> : <><Download size={12}/> Extract Audio for Transcribing</>}
                 </button>
               </div>
            )}
          </div>
          
          <div className="flex justify-center gap-4 text-xs text-gray-400">
             <a href="https://transcri.io/en/subtitle-generator/srt" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-purple-400 transition-colors">
               <ExternalLink size={12} /> Transcri.io (Get SRT)
             </a>
             <a href="https://podcast.adobe.com/enhance" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-purple-400 transition-colors">
               <Music size={12} /> Adobe Enhance (Clean Audio)
             </a>
          </div>
        </div>

        {/* Right Column: SRT Upload */}
        <div className="space-y-4">
          <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all h-64 ${srtFile ? 'border-pink-500 bg-pink-500/10' : 'border-gray-700 hover:border-gray-500 bg-gray-900/50'}`}>
            <input 
              type="file" 
              accept=".srt" 
              onChange={handleSrtChange} 
              className="hidden" 
              id="srt-upload" 
            />
            <label htmlFor="srt-upload" className="cursor-pointer flex flex-col items-center space-y-4 w-full h-full justify-center">
              <div className="p-4 rounded-full bg-gray-800 text-pink-400 shadow-lg">
                <FileText size={32} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">{srtFile ? srtFile.name : "Select Subtitles"}</p>
                <p className="text-xs text-gray-500 mt-1">.SRT format</p>
              </div>
            </label>
          </div>
          
           <div className="text-xs text-gray-500 text-center px-8">
             Upload the SRT file generated from your transcribed audio to sync visual layouts.
           </div>
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={!videoFile || !srtFile}
        className={`group flex items-center space-x-3 px-10 py-4 rounded-full font-bold text-lg transition-all transform ${
          videoFile && srtFile 
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105 shadow-xl shadow-purple-900/40' 
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
      >
        <span>Next Step</span>
        <ArrowRight size={24} className={`transition-transform ${videoFile && srtFile ? 'group-hover:translate-x-1' : ''}`} />
      </button>
    </div>
  );
};