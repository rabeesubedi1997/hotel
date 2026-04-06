import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import useAuthStore from '../stores/authStore';
import useSiteSettingsStore from '../stores/siteSettingsStore';

const MainLayout = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { settings, fetchSettings, getSiteName, getSiteTagline, getHeaderMenu, getFooterMenu, getContactInfo, getSocialLinks } = useSiteSettingsStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const siteName = getSiteName();
  const siteTagline = getSiteTagline();
  const headerMenu = getHeaderMenu();
  const footerMenu = getFooterMenu();
  const contactInfo = getContactInfo();
  const socialLinks = getSocialLinks();

  const getIcon = (iconName) => {
    const Icon = LucideIcons[iconName] || LucideIcons.Circle;
    return Icon;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
              <LucideIcons.Mountain className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">{siteName}</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              {headerMenu.map((item) => {
                const MenuIcon = getIcon(item.icon);
                return (
                  <Link 
                    key={item.url} 
                    to={item.url} 
                    className="text-gray-700 hover:text-primary-600 font-medium flex items-center"
                  >
                    {item.icon && <MenuIcon className="h-4 w-4 mr-1" />}
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop User Actions */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Link to="/wishlist" className="text-gray-700 hover:text-primary-600">
                    <LucideIcons.Heart className="h-6 w-6" />
                  </Link>
                  <div className="relative group">
                    <button className="flex items-center space-x-2 text-gray-700 hover:text-primary-600">
                      <LucideIcons.User className="h-6 w-6" />
                      <span className="hidden sm:block">{user?.name}</span>
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 hidden group-hover:block">
                      <Link to="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                        Profile
                      </Link>
                      <Link to="/wishlist" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                        My Wishlist
                      </Link>
                      <Link to="/bookings" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                        My Bookings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <LucideIcons.LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-primary-600 font-medium"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <LucideIcons.X className="h-6 w-6" /> : <LucideIcons.Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-4 pt-2 pb-4 space-y-1">
              {headerMenu.map((item) => (
                <Link
                  key={item.url}
                  to={item.url}
                  className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                  onClick={closeMobileMenu}
                >
                  {item.label}
                </Link>
              ))}
              
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                    onClick={closeMobileMenu}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/bookings"
                    className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                    onClick={closeMobileMenu}
                  >
                    My Bookings
                  </Link>
                  <Link
                    to="/wishlist"
                    className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                    onClick={closeMobileMenu}
                  >
                    Wishlist
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                    onClick={closeMobileMenu}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block px-3 py-2 text-primary-600 hover:bg-primary-50 rounded-md font-medium"
                    onClick={closeMobileMenu}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start space-x-2 mb-4">
                <LucideIcons.Mountain className="h-6 w-6" />
                <span className="text-lg font-bold">{siteName}</span>
              </div>
              <p className="text-gray-400 text-sm md:text-base">
                {siteTagline}
              </p>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-3">
                {footerMenu.map((item) => (
                  <li key={item.url}>
                    <Link to={item.url} className="text-gray-400 hover:text-white block py-1">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <p className="text-gray-400 text-sm md:text-base mb-1">{contactInfo.address}</p>
              <p className="text-gray-400 text-sm md:text-base mb-1">{contactInfo.email}</p>
              <p className="text-gray-400 text-sm md:text-base">{contactInfo.phone}</p>
            </div>
          </div>
          <div className="mt-8 md:mt-12 pt-8 border-t border-gray-700 text-center text-gray-400 text-sm">
            © 2024 {siteName}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
