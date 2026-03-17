import React, { useState, useEffect } from 'react';
import { SavedProject, getAllProjects, deleteProject, exportProjectToFile, searchProjects, getStorageStats } from '../utils/projectStorage';
import { Folder, Clock, Download, Trash2, Search, X, FileText, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from './ToastContext';

interface ProjectLibraryProps {
    onLoadProject: (project: SavedProject) => void;
    onClose: () => void;
}

export const ProjectLibrary: React.FC<ProjectLibraryProps> = ({ onLoadProject, onClose }) => {
    const { showConfirm } = useToast();
    const [projects, setProjects] = useState<SavedProject[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [stats, setStats] = useState({ projectCount: 0, storageUsedMB: '0' });

    useEffect(() => {
        loadProjects();
        setStats(getStorageStats());
    }, []);

    const loadProjects = () => {
        setProjects(getAllProjects());
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
            setProjects(searchProjects(query));
        } else {
            setProjects(getAllProjects());
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (await showConfirm('Delete this project? This cannot be undone.')) {
            deleteProject(id);
            loadProjects();
            setStats(getStorageStats());
        }
    };

    const handleExport = (project: SavedProject, e: React.MouseEvent) => {
        e.stopPropagation();
        exportProjectToFile(project);
    };

    const handleLoad = (project: SavedProject) => {
        onLoadProject(project);
        onClose();
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col animate-scale-in ring-1 ring-white/5">
                {/* Header */}
                <div className="p-6 border-b border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Folder size={24} className="text-orange-400" />
                            <h2 className="text-2xl font-bold text-white">Project Library</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Search projects by name, context, or tags..."
                            className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:border-orange-500 outline-none"
                        />
                    </div>

                    {/* Stats */}
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                        <span>{stats.projectCount} projects</span>
                        <span>•</span>
                        <span>{stats.storageUsedMB} MB used</span>
                    </div>
                </div>

                {/* Project List */}
                <div className="flex-1 overflow-auto p-6">
                    {projects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
                            <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(249,112,102,0.15)] border border-orange-500/20">
                                {searchQuery ? <Search size={32} className="text-orange-400" /> : <Folder size={32} className="text-orange-400" />}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                                {searchQuery ? 'No matches found' : 'Your creative journey starts here'}
                            </h3>
                            <p className="text-gray-400 text-sm max-w-[280px] leading-relaxed">
                                {searchQuery 
                                    ? `We couldn't find any projects matching "${searchQuery}".` 
                                    : 'Save your first project from the Editor to see it appear in your library.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    className="bg-gray-950 border border-gray-800 rounded-lg hover:border-orange-500/50 transition-colors cursor-pointer"
                                >
                                    {/* Project Card */}
                                    <div
                                        onClick={() => setExpandedId(expandedId === project.id ? null : project.id)}
                                        className="p-4"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-white text-sm mb-1 truncate">
                                                    {project.name}
                                                </h3>
                                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {formatDate(project.updatedAt)}
                                                    </span>
                                                    {project.videoFileName && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="truncate max-w-[150px]">{project.videoFileName}</span>
                                                        </>
                                                    )}
                                                </div>
                                                {project.tags && project.tags.length > 0 && (
                                                    <div className="flex items-center gap-1 mt-2">
                                                        {project.tags.slice(0, 3).map((tag, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-orange-900/30 text-orange-300 rounded text-[10px]">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                        {project.tags.length > 3 && (
                                                            <span className="text-[10px] text-gray-600">+{project.tags.length - 3}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                <button
                                                    onClick={(e) => handleExport(project, e)}
                                                    className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                                                    title="Export as JSON"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(project.id, e)}
                                                    className="p-2 bg-gray-800 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                {expandedId === project.id ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {expandedId === project.id && (
                                            <div className="mt-4 pt-4 border-t border-gray-800 space-y-2 text-xs">
                                                {project.topicContext && (
                                                    <div>
                                                        <span className="text-gray-500">Context:</span>
                                                        <p className="text-gray-300 mt-1 line-clamp-2">{project.topicContext}</p>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-2 gap-2 text-gray-500">
                                                    <div>
                                                        HTML: {(project.html.length / 1024).toFixed(1)} KB
                                                    </div>
                                                    <div>
                                                        Scenes: {project.layoutConfig.length}
                                                    </div>
                                                    {project.bgMusicName && (
                                                        <div className="col-span-2">
                                                            Music: {project.bgMusicName}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleLoad(project)}
                                                    className="w-full mt-3 bg-orange-600 hover:bg-orange-500 text-white py-2 rounded font-medium transition-colors"
                                                >
                                                    Load Project
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
