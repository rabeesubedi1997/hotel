import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Download, Loader2, MapPin, Users } from 'lucide-react';
import { packageBookingsAPI } from '../services/api';

const PackageBookingDetails = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  useEffect(() => {
    fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchBooking = async () => {
    try {
      const response = await packageBookingsAPI.getById(id);
      setBooking(response.data);
    } catch (error) {
      console.error('Error fetching package booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    setDownloadingInvoice(true);
    try {
      const response = await packageBookingsAPI.downloadInvoice(booking.id);
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${booking.booking_number}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
    } finally {
      setDownloadingInvoice(false);
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
        <h2 className="text-2xl font-bold text-gray-900">Package booking not found</h2>
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
            <h1 className="text-2xl font-bold text-gray-900">{booking.itinerary?.title}</h1>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
            {booking.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Trip Details</h3>
            <div className="space-y-2 text-gray-600">
              <p className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {new Date(booking.travel_date).toLocaleDateString()}</p>
              <p className="flex items-center gap-2"><Users className="h-4 w-4" /> {booking.travelers} traveler{booking.travelers === 1 ? '' : 's'}</p>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Payment Information</h3>
            <div className="space-y-2 text-gray-600">
              <p><strong>Total Amount:</strong> ${booking.total_amount}</p>
              {Number(booking.discount_amount) > 0 && (
                <p><strong>Discount:</strong> -${booking.discount_amount}</p>
              )}
              <p><strong>Payment Status:</strong> {booking.payment?.status || 'Pending'}</p>
            </div>
          </div>
        </div>

        {booking.bookings?.length > 0 && (
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-3">Included Bookings</h3>
            <div className="space-y-2">
              {booking.bookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary-600 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{b.bookable?.name}</p>
                      <p className="text-xs text-gray-500">
                        {b.check_in_date ? `Check-in ${new Date(b.check_in_date).toLocaleDateString()}` : new Date(b.activity_datetime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(b.status)}`}>{b.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {booking.special_requests && (
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-2">Special Requests</h3>
            <p className="text-gray-600">{booking.special_requests}</p>
          </div>
        )}

        {booking.status !== 'pending' && (
          <button
            type="button"
            onClick={handleDownloadInvoice}
            disabled={downloadingInvoice}
            className="inline-flex items-center bg-white border border-neutral-300 text-neutral-700 px-6 py-2 rounded-md hover:bg-neutral-50 disabled:opacity-50"
          >
            {downloadingInvoice ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Download Invoice
          </button>
        )}
      </div>
    </div>
  );
};

export default PackageBookingDetails;
