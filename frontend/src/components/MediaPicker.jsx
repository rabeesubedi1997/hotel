import { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Folder, 
  Image as ImageIcon,
  Upload,
  Check,
  Trash2
} from 'lucide-react';
import { adminAPI } from '../services/api';
import { resizeImage, getFileSizeMB } from '../utils/imageResizer';
import { useRef } from 'react';

const MediaPicker = ({ isOpen, onClose, onSelect, folder = '' }) => {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(folder);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('browse');
  const [resizeProgress, setResizeProgress] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
    }
  }, [isOpen, currentFolder]);

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
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setResizeProgress('Checking image...');
    
    try {
      // Resize image if needed
      const resizedFile = await resizeImage(file);
      
      if (resizedFile !== file) {
        const originalSize = getFileSizeMB(file.size);
        const newSize = getFileSizeMB(resizedFile.size);
        setResizeProgress(`Resized: ${originalSize}MB → ${newSize}MB`);
      } else {
        setResizeProgress('Image already optimized');
      }

      const formData = new FormData();
      formData.append('image', resizedFile);
      formData.append('folder', currentFolder || 'general');
      
      const response = await adminAPI.uploadToMediaLibrary(formData);
      onSelect(response.data.url);
      onClose();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading image');
    } finally {
      setUploading(false);
      setResizeProgress(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSelect = () => {
    if (selectedFile) {
      onSelect(selectedFile.url);
      onClose();
    }
  };

  const handleDelete = async (path, e) => {
    e.stopPropagation();
    if (!confirm('Delete this image?')) return;

    try {
      await adminAPI.deleteFromMediaLibrary(path);
      fetchMedia();
      if (selectedFile?.path === path) {
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold">Select Image</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 py-3 font-medium ${activeTab === 'browse' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Browse Library
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-3 font-medium ${activeTab === 'upload' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Upload New
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'browse' ? (
            <>
              {/* Toolbar */}
              <div className="p-4 border-b border-gray-100 flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => setCurrentFolder('')}
                    className={`px-3 py-1 rounded ${currentFolder === '' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <Folder className="h-4 w-4 inline mr-1" />
                    All
                  </button>
                  {folders.map((f) => (
                    <button
                      key={f.path}
                      onClick={() => setCurrentFolder(f.path)}
                      className={`px-3 py-1 rounded ${currentFolder === f.path ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      <Folder className="h-4 w-4 inline mr-1" />
                      {f.name}
                    </button>
                  ))}
                </div>
                <div className="flex-1" />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchMedia()}
                    placeholder="Search..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-48"
                  />
                </div>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center py-16">
                    <ImageIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No images found</p>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="mt-4 text-primary-600 hover:underline"
                    >
                      Upload new image
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-4">
                    {files.map((file) => (
                      <div
                        key={file.path}
                        onClick={() => setSelectedFile(file)}
                        className={`relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer border-2 transition-all ${
                          selectedFile?.path === file.path ? 'border-primary-600 ring-2 ring-primary-100' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        {selectedFile?.path === file.path && (
                          <div className="absolute top-2 right-2 bg-primary-600 text-white rounded-full p-1">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                        <button
                          onClick={(e) => handleDelete(file.path, e)}
                          className="absolute bottom-2 right-2 p-1.5 bg-red-500 text-white rounded opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <Upload className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">Upload a new image to the library</p>
                <label className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <Upload className="h-5 w-5 mr-2" />
                  {uploading ? (resizeProgress || 'Uploading...') : 'Choose File'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-4">JPG, PNG, GIF, WebP (auto-resized if &gt;2MB)</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'browse' && (
          <div className="p-4 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedFile ? (
                <span>Selected: <strong>{selectedFile.name}</strong></span>
              ) : (
                <span>Click an image to select</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSelect}
                disabled={!selectedFile}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Select Image
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaPicker;
