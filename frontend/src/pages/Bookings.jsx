import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, Loader2, Trash2, Filter } from 'lucide-react';
import { bookingsAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'refunded'

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await bookingsAPI.getAll();
      setBookings(response.data.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.status === filter);

  const handleDeleteBooking = async (bookingId) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
        await bookingsAPI.delete(bookingId);
        setBookings(bookings.filter(booking => booking.id !== bookingId));
        toast.success('Booking deleted successfully');
      } catch (error) {
        console.error('Error deleting booking:', error);
        toast.error('Failed to delete booking');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'checked_in': return 'bg-blue-100 text-blue-800';
      case 'checked_out': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Bookings</h1>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 sm:px-4 py-2 rounded-md font-medium text-sm sm:text-base ${
            filter === 'all' 
              ? 'bg-primary-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 sm:px-4 py-2 rounded-md font-medium text-sm sm:text-base ${
            filter === 'pending' 
              ? 'bg-yellow-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('confirmed')}
          className={`px-3 sm:px-4 py-2 rounded-md font-medium text-sm sm:text-base ${
            filter === 'confirmed' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Confirmed
        </button>
        <button
          onClick={() => setFilter('checked_in')}
          className={`px-3 sm:px-4 py-2 rounded-md font-medium text-sm sm:text-base ${
            filter === 'checked_in' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Checked In
        </button>
        <button
          onClick={() => setFilter('checked_out')}
          className={`px-3 sm:px-4 py-2 rounded-md font-medium text-sm sm:text-base ${
            filter === 'checked_out' 
              ? 'bg-gray-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Checked Out
        </button>
        <button
          onClick={() => setFilter('cancelled')}
          className={`px-3 sm:px-4 py-2 rounded-md font-medium text-sm sm:text-base ${
            filter === 'cancelled' 
              ? 'bg-red-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Cancelled
        </button>
        <button
          onClick={() => setFilter('refunded')}
          className={`px-3 sm:px-4 py-2 rounded-md font-medium text-sm sm:text-base ${
            filter === 'refunded' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Refunded
        </button>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No {filter === 'all' ? 'bookings' : filter} bookings</h3>
          <p className="text-gray-500 mt-2">
            {filter === 'all' 
              ? "You haven't made any bookings yet." 
              : `You don't have any ${filter} bookings.`
            }
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/hotels" className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700">
              Browse Hotels
            </Link>
            <Link to="/activities" className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-50">
              Explore Activities
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    {booking.bookable?.featured_image ? (
                      <img
                        src={booking.bookable.featured_image}
                        alt={booking.bookable.name}
                        className="h-full w-full object-cover rounded-lg"
                      />
                    ) : (
                      <Calendar className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 truncate">{booking.booking_number}</p>
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{booking.bookable?.name}</h3>
                    <p className="text-gray-600 truncate">
                      {booking.check_in_date || booking.activity_datetime}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                  <p className="text-lg font-semibold text-gray-900">${booking.total_amount}</p>
                  <button
                    onClick={() => handleDeleteBooking(booking.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete booking"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Bookings;
