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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Image className="h-6 w-6 mr-2" />
          Media Library
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
            title={viewMode === 'grid' ? 'List View' : 'Grid View'}
          >
            {viewMode === 'grid' ? <List className="h-5 w-5" /> : <Grid className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Images
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.includes('Error') ? <AlertCircle className="h-5 w-5 mr-2" /> : <Check className="h-5 w-5 mr-2" />}
          {message}
        </div>
      )}

      {/* Breadcrumb & Search */}
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setCurrentFolder('')}
            className={`px-3 py-1 rounded ${currentFolder === '' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Folder className="h-4 w-4 inline mr-1" />
            Root
          </button>
          {currentFolder && (
            <>
              <span className="text-gray-400">/</span>
              <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded">
                {currentFolder}
              </span>
            </>
          )}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search images..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 w-64"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
          >
            Search
          </button>
        </form>
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Folders</h3>
          <div className="flex flex-wrap gap-2">
            {folders.map((folder) => (
              <button
                key={folder.path}
                onClick={() => setCurrentFolder(folder.path)}
                className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                  currentFolder === folder.path 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
        <div className="text-center py-16">
          <Image className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">No images found</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            Upload Images
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <>
          <div className="mb-4 p-2 bg-yellow-50 text-xs">
            <div className="font-mono break-all mb-1">Debug URL: {files[0]?.url}</div>
            <a 
              href={files[0]?.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Click to test URL
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {files.map((file) => (
              <div
                key={file.path}
                onClick={() => setSelectedFile(file)}
                className={`group relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer border-2 transition-all ${
                  selectedFile?.path === file.path ? 'border-primary-600' : 'border-transparent hover:border-gray-300'
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
                  placeholder.className = 'w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-xs text-center p-2';
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
                  className="p-2 bg-white rounded-full mr-2 hover:bg-gray-100"
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {files.map((file, index) => (
            <div
              key={file.path}
              className={`flex items-center p-4 ${index !== files.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <img
                src={file.url}
                alt={file.name}
                className="h-12 w-12 object-cover rounded-lg mr-4"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{file.size} • {file.modified}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(file.url)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
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
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold">Upload Images</h2>
              <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">Drag and drop images here, or click to browse</p>
                <label className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <Upload className="h-4 w-4 mr-2" />
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
                <p className="text-xs text-gray-500 mt-4">Supports: JPG, PNG, GIF, WebP (auto-resized if &gt;2MB)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-40">
          <div className="flex items-start gap-3">
            <img
              src={selectedFile.url}
              alt={selectedFile.name}
              className="h-20 w-20 object-cover rounded-lg"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{selectedFile.size}</p>
              <p className="text-xs text-gray-500">{selectedFile.modified}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => copyToClipboard(selectedFile.url)}
                  className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                >
                  Copy URL
                </button>
                <button
                  onClick={() => handleDelete(selectedFile.path)}
                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
            <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-gray-100 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;
