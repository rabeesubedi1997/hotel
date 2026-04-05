import { useState } from 'react';
import { X, Upload, Link, Image as ImageIcon } from 'lucide-react';

// Stored images catalog
const imageCatalog = {
  hotels: [
    { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80', label: 'Luxury Resort' },
    { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&q=80', label: 'Modern Hotel' },
    { url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80', label: 'Pool Resort' },
    { url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&q=80', label: 'City Hotel' },
    { url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&q=80', label: 'Mountain Resort' },
    { url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=400&q=80', label: 'Heritage Hotel' },
    { url: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=400&q=80', label: 'Boutique Hotel' },
    { url: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&q=80', label: 'Resort' },
  ],
  activities: [
    { url: 'https://images.unsplash.com/photo-1523287562758-66c7fc58967f?w=400&q=80', label: 'Bungee' },
    { url: 'https://images.unsplash.com/photo-1605891525466-5a5b7c9b2d34?w=400&q=80', label: 'Paragliding' },
    { url: 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=400&q=80', label: 'Rafting' },
    { url: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&q=80', label: 'Trekking' },
    { url: 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?w=400&q=80', label: 'Zipline' },
    { url: 'https://images.unsplash.com/photo-1549798616-570507f00f73?w=400&q=80', label: 'Skydiving' },
    { url: 'https://images.unsplash.com/photo-1504280509585-0d7a56c2c9e8?w=400&q=80', label: 'Canyoning' },
    { url: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=400&q=80', label: 'Rock Climbing' },
    { url: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=400&q=80', label: 'Hot Air Balloon' },
  ],
};

const ImageSelector = ({ isOpen, onClose, onSelect, category, currentImage }) => {
  const [activeTab, setActiveTab] = useState('gallery');
  const [urlInput, setUrlInput] = useState(currentImage || '');
  const [previewUrl, setPreviewUrl] = useState(currentImage || '');

  if (!isOpen) return null;

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onSelect(urlInput.trim());
      onClose();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onSelect(reader.result);
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  const images = imageCatalog[category] || imageCatalog.hotels;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-gray-900">Select Image</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex-1 py-3 px-4 font-medium flex items-center justify-center gap-2 ${
              activeTab === 'gallery' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            Gallery
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-3 px-4 font-medium flex items-center justify-center gap-2 ${
              activeTab === 'url' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'
            }`}
          >
            <Link className="h-4 w-4" />
            URL
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-3 px-4 font-medium flex items-center justify-center gap-2 ${
              activeTab === 'upload' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'
            }`}
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'gallery' && (
            <div className="grid grid-cols-4 gap-3">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onSelect(img.url);
                    onClose();
                  }}
                  className="relative group aspect-square rounded-lg overflow-hidden border-2 hover:border-primary-500 transition"
                >
                  <img
                    src={img.url}
                    alt={img.label}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                  <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                    {img.label}
                  </p>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setPreviewUrl(e.target.value);
                  }}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {previewUrl && (
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                    onError={() => setPreviewUrl('')}
                  />
                </div>
              )}
              <button
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim()}
                className="w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                Use This URL
              </button>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">Click to upload or drag and drop</p>
                <p className="text-gray-400 text-sm mb-4">PNG, JPG, GIF up to 10MB</p>
                <label className="inline-block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <span className="px-4 py-2 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700">
                    Choose File
                  </span>
                </label>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Note: Uploaded images are stored as base64 for preview. In production, configure file upload to server.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageSelector;
