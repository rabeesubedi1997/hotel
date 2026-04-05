import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, Loader2 } from 'lucide-react';
import { bookingsAPI } from '../services/api';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

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

      {bookings.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No bookings yet</h3>
          <p className="text-gray-500 mt-2">Start exploring and book your next adventure!</p>
          <div className="mt-6 flex justify-center space-x-4">
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
          {bookings.map((booking) => (
            <Link
              key={booking.id}
              to={`/bookings/${booking.id}`}
              className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 bg-gray-200 rounded-lg flex items-center justify-center">
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
                  <div>
                    <p className="text-sm text-gray-500">{booking.booking_number}</p>
                    <h3 className="text-lg font-semibold text-gray-900">{booking.bookable?.name}</h3>
                    <p className="text-gray-600">
                      {booking.check_in_date || booking.activity_datetime}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                  <p className="text-lg font-semibold text-gray-900">${booking.total_amount}</p>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Bookings;
