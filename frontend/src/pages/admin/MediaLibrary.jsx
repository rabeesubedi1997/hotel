import { useState, useEffect } from 'react';
import {
  Image,
  Upload,
  Trash2,
  Search,
  Folder,
  X,
  Grid,
  List,
  Check,
  AlertCircle
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import { resizeMultipleImages, getFileSizeMB } from '../../utils/imageResizer';
import { useRef } from 'react';
import { Button, Input, Modal } from '../../components/ui';

const MediaLibrary = () => {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [resizeProgress, setResizeProgress] = useState({ current: 0, total: 0, status: '' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMedia();
  }, [currentFolder]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getMediaLibrary({
        folder: currentFolder,
        search
      });
      setFiles(response.data.files || []);
      setFolders(response.data.folders || []);
    } catch (error) {
      console.error('Error fetching media:', error);
      setMessage('Error loading media library');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchMedia();
  };

  const handleUpload = async (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    setResizeProgress({ current: 0, total: selectedFiles.length, status: 'Resizing images...' });

    try {
      // Resize all images first
      const resizedFiles = await resizeMultipleImages(selectedFiles, (current, total) => {
        setResizeProgress({ current, total, status: `Resizing ${current}/${total}...` });
      });

      setResizeProgress({ current: 0, total: resizedFiles.length, status: 'Uploading...' });

      let successCount = 0;
      let totalOriginalSize = 0;
      let totalNewSize = 0;

      for (let i = 0; i < resizedFiles.length; i++) {
        const file = resizedFiles[i];
        const originalFile = selectedFiles[i];

        totalOriginalSize += originalFile.size;
        totalNewSize += file.size;

        try {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('folder', currentFolder || 'general');

          await adminAPI.uploadToMediaLibrary(formData);
          successCount++;
          setResizeProgress(prev => ({ ...prev, current: i + 1 }));
        } catch (error) {
          console.error('Error uploading file:', file.name, error);
        }
      }

      const savedMB = getFileSizeMB(totalOriginalSize - totalNewSize);
      setMessage(`Uploaded ${successCount} of ${resizedFiles.length} files (${savedMB}MB saved)`);
    } catch (error) {
      console.error('Error processing files:', error);
      setMessage('Error processing images');
    } finally {
      setUploading(false);
      setResizeProgress({ current: 0, total: 0, status: '' });
      setShowUploadModal(false);
      fetchMedia();
      setTimeout(() => setMessage(''), 5000);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (path) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await adminAPI.deleteFromMediaLibrary(path);
      setMessage('Image deleted successfully');
      fetchMedia();
      setSelectedFile(null);
    } catch (error) {
      console.error('Error deleting file:', error);
      setMessage('Error deleting image');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    setMessage('URL copied to clipboard');
    setTimeout(() => setMessage(''), 2000);
  };

  if (loading && files.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-display text-2xl font-bold text-neutral-900 flex items-center">
          <Image className="h-6 w-6 mr-2 text-primary-600" />
          Media Library
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-xl transition-all"
            title={viewMode === 'grid' ? 'List View' : 'Grid View'}
          >
            {viewMode === 'grid' ? <List className="h-5 w-5" /> : <Grid className="h-5 w-5" />}
          </button>
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Images
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center text-sm font-medium ${message.toLowerCase().includes('error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.toLowerCase().includes('error') ? <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" /> : <Check className="h-5 w-5 mr-2 flex-shrink-0" />}
          {message}
        </div>
      )}

      {/* Breadcrumb & Search */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setCurrentFolder('')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${currentFolder === '' ? 'bg-primary-100 text-primary-700' : 'text-neutral-600 hover:bg-neutral-100'}`}
          >
            <Folder className="h-4 w-4 inline mr-1" />
            Root
          </button>
          {currentFolder && (
            <>
              <span className="text-neutral-400">/</span>
              <span className="px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg">
                {currentFolder}
              </span>
            </>
          )}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            icon={Search}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search images..."
            className="w-64"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-neutral-700 mb-3">Folders</h3>
          <div className="flex flex-wrap gap-2">
            {folders.map((folder) => (
              <button
                key={folder.path}
                onClick={() => setCurrentFolder(folder.path)}
                className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  currentFolder === folder.path
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                <Folder className="h-4 w-4 mr-2" />
                {folder.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      {files.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card text-center py-16">
          <Image className="h-16 w-16 mx-auto text-neutral-300 mb-4" />
          <p className="text-neutral-500 mb-4">No images found</p>
          <Button onClick={() => setShowUploadModal(true)}>
            Upload Images
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <>
          <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-xs">
            <div className="font-mono break-all mb-1">Debug URL: {files[0]?.url}</div>
            <a
              href={files[0]?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-700 hover:underline font-medium"
            >
              Click to test URL
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {files.map((file) => (
              <div
                key={file.path}
                onClick={() => setSelectedFile(file)}
                className={`group relative aspect-square rounded-xl overflow-hidden bg-neutral-100 cursor-pointer border-2 transition-all ${
                  selectedFile?.path === file.path ? 'border-primary-600' : 'border-transparent hover:border-neutral-300'
                }`}
              >
              <img
                src={file.url}
                alt={file.name}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Image failed to load:', file.url, 'Status:', e.target.status);
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  const placeholder = document.createElement('div');
                  placeholder.className = 'w-full h-full flex items-center justify-center bg-neutral-200 text-neutral-500 text-xs text-center p-2';
                  placeholder.innerHTML = 'Failed to load<br/>Check console';
                  e.target.parentElement.appendChild(placeholder);
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(file.url);
                  }}
                  className="p-2 bg-white rounded-full mr-2 hover:bg-neutral-100 text-neutral-700"
                  title="Copy URL"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file.path);
                  }}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 truncate">
                {file.name}
              </div>
            </div>
          ))}
        </div>
      </>
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-neutral-100 overflow-hidden">
          {files.map((file, index) => (
            <div
              key={file.path}
              className={`flex items-center p-4 ${index !== files.length - 1 ? 'border-b border-neutral-100' : ''}`}
            >
              <img
                src={file.url}
                alt={file.name}
                className="h-12 w-12 object-cover rounded-lg mr-4"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                <p className="text-xs text-neutral-500">{file.size} • {file.modified}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(file.url)}
                  className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all"
                  title="Copy URL"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(file.path)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Images"
        size="sm"
      >
        <div className="border-2 border-dashed border-neutral-300 rounded-2xl p-8 text-center">
          <Upload className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
          <p className="text-neutral-600 mb-4">Drag and drop images here, or click to browse</p>
          <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-primary-600 text-white rounded-xl cursor-pointer hover:bg-primary-700 shadow-sm transition-colors">
            <Upload className="h-4 w-4" />
            {uploading ? (resizeProgress.status || 'Processing...') : 'Select Files'}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
          <p className="text-xs text-neutral-500 mt-4">Supports: JPG, PNG, GIF, WebP (auto-resized if &gt;2MB)</p>
        </div>
      </Modal>

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="fixed bottom-4 right-4 bg-white rounded-2xl shadow-card-hover border border-neutral-100 p-4 max-w-sm z-40">
          <div className="flex items-start gap-3">
            <img
              src={selectedFile.url}
              alt={selectedFile.name}
              className="h-20 w-20 object-cover rounded-xl flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">{selectedFile.name}</p>
              <p className="text-xs text-neutral-500">{selectedFile.size}</p>
              <p className="text-xs text-neutral-500">{selectedFile.modified}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => copyToClipboard(selectedFile.url)}
                  className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 font-medium"
                >
                  Copy URL
                </button>
                <button
                  onClick={() => handleDelete(selectedFile.path)}
                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
            <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-neutral-100 rounded text-neutral-500 flex-shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;
