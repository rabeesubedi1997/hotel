import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Loader2, CheckCircle } from 'lucide-react';
import { authAPI } from '../services/api';
import useAuthStore from '../stores/authStore';

const Profile = () => {
  const { user, updateProfile, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
  });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) clearError();
    if (successMessage) setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await updateProfile(formData);
    if (result.success) {
      setSuccessMessage('Profile updated successfully!');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="h-24 w-24 rounded-full bg-primary-600 mx-auto flex items-center justify-center text-white text-3xl font-bold">
                {user?.name?.charAt(0)}
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">{user?.name}</h2>
              <p className="text-gray-500 capitalize">{user?.role}</p>
              <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                to="/bookings"
                className="block w-full text-center py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                My Bookings
              </Link>
              <Link
                to="/wishlist"
                className="block w-full text-center py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                My Wishlist
              </Link>
            </div>
          </div>
        </div>

        {/* Edit Profile Form */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Edit Profile</h3>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="inline-block h-4 w-4 mr-1" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="inline-block h-4 w-4 mr-1" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="inline-block h-4 w-4 mr-1" />
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="inline-block h-4 w-4 mr-1" />
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your city"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-600 text-white py-3 rounded-md font-semibold hover:bg-primary-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  'Save Changes'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
