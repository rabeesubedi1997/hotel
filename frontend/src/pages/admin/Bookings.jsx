import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, RefreshCcw, Loader2, Eye, X } from 'lucide-react';
import { adminAPI } from '../../services/api';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewModal, setViewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const response = await adminAPI.getBookings(params);
      setBookings(response.data.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await adminAPI.updateBookingStatus(id, status);
      setBookings(bookings.map((booking) =>
        booking.id === id ? { ...booking, status } : booking
      ));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const confirmBooking = async (id) => {
    try {
      await adminAPI.confirmBooking(id);
      setBookings(bookings.map((booking) =>
        booking.id === id ? { ...booking, status: 'confirmed' } : booking
      ));
    } catch (error) {
      console.error('Error confirming booking:', error);
    }
  };

  const openViewModal = async (booking) => {
    setViewModal(true);
    setViewLoading(true);
    try {
      const response = await adminAPI.getBooking(booking.id);
      setSelectedBooking(response.data);
    } catch (error) {
      console.error('Error fetching booking details:', error);
    } finally {
      setViewLoading(false);
    }
  };

  const closeViewModal = () => {
    setViewModal(false);
    setSelectedBooking(null);
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

  const filteredBookings = bookings.filter((booking) =>
    booking.booking_number.toLowerCase().includes(search.toLowerCase()) ||
    booking.user?.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Manage Bookings</h2>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search bookings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            fetchBookings();
          }}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked In</option>
          <option value="checked_out">Checked Out</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredBookings.map((booking) => (
              <tr key={booking.id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{booking.booking_number}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{booking.user?.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{booking.bookable?.name}</td>
                <td className="px-6 py-4 text-sm text-gray-900">${booking.total_amount}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => openViewModal(booking)}
                      className="p-2 text-blue-600 hover:text-blue-800"
                      title="View Details"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    {booking.status === 'pending' && (
                      <button
                        onClick={() => confirmBooking(booking.id)}
                        className="p-2 text-green-600 hover:text-green-800"
                        title="Confirm"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                    )}
                    <select
                      value={booking.status}
                      onChange={(e) => updateStatus(booking.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="checked_in">Checked In</option>
                      <option value="checked_out">Checked Out</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Booking Modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">Booking Details</h3>
              <button onClick={closeViewModal} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {viewLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
              ) : selectedBooking ? (
                <div className="space-y-6">
                  {/* Booking Number & Status */}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500">Booking Number</p>
                      <p className="text-lg font-bold text-gray-900">{selectedBooking.booking_number}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedBooking.status)}`}>
                      {selectedBooking.status}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Customer Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-medium">{selectedBooking.user?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{selectedBooking.user?.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{selectedBooking.user?.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Item Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      {selectedBooking.bookable_type === 'App\\Models\\Hotel' ? 'Hotel' : 'Activity'} Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-medium">{selectedBooking.bookable?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Location</p>
                        <p className="font-medium">{selectedBooking.bookable?.city || selectedBooking.bookable?.location}</p>
                      </div>
                    </div>
                  </div>

                  {/* Booking Details */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Booking Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedBooking.check_in_date && (
                        <>
                          <div>
                            <p className="text-sm text-gray-500">Check-in Date</p>
                            <p className="font-medium">{new Date(selectedBooking.check_in_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Check-out Date</p>
                            <p className="font-medium">{new Date(selectedBooking.check_out_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Guests</p>
                            <p className="font-medium">{selectedBooking.guests}</p>
                          </div>
                        </>
                      )}
                      {selectedBooking.activity_datetime && (
                        <>
                          <div>
                            <p className="text-sm text-gray-500">Activity Date & Time</p>
                            <p className="font-medium">{new Date(selectedBooking.activity_datetime).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Participants</p>
                            <p className="font-medium">{selectedBooking.participants}</p>
                          </div>
                        </>
                      )}
                      <div>
                        <p className="text-sm text-gray-500">Total Amount</p>
                        <p className="font-bold text-primary-600">${selectedBooking.total_amount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Booking Date</p>
                        <p className="font-medium">{new Date(selectedBooking.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {selectedBooking.special_requests && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-500">Special Requests</p>
                        <p className="font-medium">{selectedBooking.special_requests}</p>
                      </div>
                    )}
                  </div>

                  {/* Payment Info */}
                  {selectedBooking.payment && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Payment Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Payment Method</p>
                          <p className="font-medium capitalize">{selectedBooking.payment.payment_method}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Payment Status</p>
                          <p className="font-medium">{selectedBooking.payment.status}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Amount Paid</p>
                          <p className="font-medium">${selectedBooking.payment.amount}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-500">Failed to load booking details.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
