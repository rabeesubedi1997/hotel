import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Loader2, CreditCard, MapPin } from 'lucide-react';
import { bookingsAPI } from '../services/api';

const BookingDetails = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      const response = await bookingsAPI.getById(id);
      setBooking(response.data);
    } catch (error) {
      console.error('Error fetching booking:', error);
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

  if (!booking) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Booking not found</h2>
        <Link to="/bookings" className="text-primary-600 mt-4 inline-block">
          View all bookings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/bookings" className="text-primary-600 mb-4 inline-block">
        ← Back to Bookings
      </Link>

      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500">{booking.booking_number}</p>
            <h1 className="text-2xl font-bold text-gray-900">{booking.bookable?.name}</h1>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
            {booking.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Booking Details</h3>
            <div className="space-y-2 text-gray-600">
              {booking.check_in_date && (
                <p><strong>Check-in:</strong> {new Date(booking.check_in_date).toLocaleDateString()}</p>
              )}
              {booking.check_out_date && (
                <p><strong>Check-out:</strong> {new Date(booking.check_out_date).toLocaleDateString()}</p>
              )}
              {booking.activity_datetime && (
                <p><strong>Date:</strong> {new Date(booking.activity_datetime).toLocaleString()}</p>
              )}
              {booking.guests > 0 && <p><strong>Guests:</strong> {booking.guests}</p>}
              {booking.participants > 0 && <p><strong>Participants:</strong> {booking.participants}</p>}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Payment Information</h3>
            <div className="space-y-2 text-gray-600">
              <p><strong>Total Amount:</strong> ${booking.total_amount}</p>
              {booking.discount_amount > 0 && (
                <p><strong>Discount:</strong> -${booking.discount_amount}</p>
              )}
              <p><strong>Payment Status:</strong> {booking.payment?.status || 'Pending'}</p>
            </div>
          </div>
        </div>

        {booking.special_requests && (
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-2">Special Requests</h3>
            <p className="text-gray-600">{booking.special_requests}</p>
          </div>
        )}

        {booking.status === 'pending' && (
          <div className="flex space-x-4">
            <Link
              to={`/checkout?booking=${booking.id}`}
              className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700"
            >
              <CreditCard className="inline-block h-4 w-4 mr-2" />
              Complete Payment
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingDetails;
