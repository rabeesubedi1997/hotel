import { useState, useEffect } from 'react';
import { vendorAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Button, Table, Th, Td, Badge, Modal } from '../../components/ui';

const VendorBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewModal, setViewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await vendorAPI.getBookings();
        setBookings(response.data);
      } catch (error) {
        console.error('Failed to fetch bookings', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  const isHotelBooking = (booking) => (booking.bookable_type || '').includes('Hotel');

  const getBookableType = (booking) => {
    return isHotelBooking(booking) ? 'Hotel' : 'Activity';
  };

  const openViewModal = (booking) => {
    setSelectedBooking(booking);
    setViewModal(true);
  };

  const closeViewModal = () => {
    setViewModal(false);
    setSelectedBooking(null);
  };

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await vendorAPI.updateBookingStatus(id, { status });
      setBookings((prev) => prev.map((booking) =>
        booking.id === id ? { ...booking, status } : booking
      ));
      setSelectedBooking((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
      toast.success('Booking status updated successfully!');
    } catch (error) {
      console.error('Failed to update booking status', error);
      toast.error('Failed to update booking status');
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmBooking = (id) => updateStatus(id, 'confirmed');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-500">Loading bookings...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Bookings</h1>
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'refunded'].map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-neutral-500">No bookings found</div>
          <p className="text-neutral-400 mt-2">
            {filter === 'all'
              ? 'You have no bookings yet'
              : `No ${filter} bookings found`
            }
          </p>
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Booking ID</Th>
              <Th>Customer</Th>
              <Th>Type</Th>
              <Th>Property</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredBookings.map((booking) => (
              <tr key={booking.id}>
                <Td>#{booking.id}</Td>
                <Td>{booking.user?.name || 'N/A'}</Td>
                <Td>{getBookableType(booking)}</Td>
                <Td>{booking.bookable?.name || 'N/A'}</Td>
                <Td>${booking.total_amount}</Td>
                <Td>
                  <Badge status={booking.status}>{booking.status.replace('_', ' ')}</Badge>
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button variant="ghost" size="sm" className="!px-2" onClick={() => openViewModal(booking)}>
                      View
                    </Button>
                    {booking.status === 'pending' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => confirmBooking(booking.id)}
                        loading={updatingId === booking.id}
                      >
                        {updatingId === booking.id ? 'Confirming...' : 'Confirm'}
                      </Button>
                    )}
                    {['confirmed', 'checked_in', 'checked_out', 'cancelled'].includes(booking.status) && (
                      <select
                        value={booking.status}
                        onChange={(e) => updateStatus(booking.id, e.target.value)}
                        disabled={updatingId === booking.id}
                        className="text-xs border border-neutral-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="checked_in">Checked in</option>
                        <option value="checked_out">Checked out</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* View Booking Modal */}
      <Modal open={viewModal && !!selectedBooking} onClose={closeViewModal} title="Booking Details" size="md">
        {selectedBooking && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-neutral-500">Booking Number</p>
                <p className="text-lg font-bold text-neutral-900">{selectedBooking.booking_number || `#${selectedBooking.id}`}</p>
              </div>
              <Badge status={selectedBooking.status}>{selectedBooking.status.replace('_', ' ')}</Badge>
            </div>

            <div className="bg-neutral-50 rounded-2xl p-4">
              <h4 className="font-display font-semibold text-neutral-900 mb-3">Customer</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500">Name</p>
                  <p className="font-medium text-neutral-900">{selectedBooking.user?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Email</p>
                  <p className="font-medium text-neutral-900">{selectedBooking.user?.email || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="bg-neutral-50 rounded-2xl p-4">
              <h4 className="font-display font-semibold text-neutral-900 mb-3">{getBookableType(selectedBooking)} Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-sm text-neutral-500">Name</p>
                  <p className="font-medium text-neutral-900">{selectedBooking.bookable?.name || 'N/A'}</p>
                </div>
                {isHotelBooking(selectedBooking) ? (
                  <>
                    <div>
                      <p className="text-sm text-neutral-500">Check-in</p>
                      <p className="font-medium text-neutral-900">
                        {selectedBooking.check_in_date ? new Date(selectedBooking.check_in_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Check-out</p>
                      <p className="font-medium text-neutral-900">
                        {selectedBooking.check_out_date ? new Date(selectedBooking.check_out_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Guests</p>
                      <p className="font-medium text-neutral-900">{selectedBooking.guests ?? 'N/A'}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-neutral-500">Date &amp; Time</p>
                      <p className="font-medium text-neutral-900">
                        {selectedBooking.activity_datetime ? new Date(selectedBooking.activity_datetime).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Participants</p>
                      <p className="font-medium text-neutral-900">{selectedBooking.participants ?? 'N/A'}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-sm text-neutral-500">Total Amount</p>
                  <p className="font-bold text-primary-600">${selectedBooking.total_amount}</p>
                </div>
              </div>
              {selectedBooking.special_requests && (
                <div className="mt-4">
                  <p className="text-sm text-neutral-500">Special Requests</p>
                  <p className="font-medium text-neutral-900">{selectedBooking.special_requests}</p>
                </div>
              )}
            </div>

            {selectedBooking.status === 'pending' && (
              <Button
                variant="primary"
                fullWidth
                onClick={() => confirmBooking(selectedBooking.id)}
                loading={updatingId === selectedBooking.id}
              >
                {updatingId === selectedBooking.id ? 'Confirming...' : 'Confirm Booking'}
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default VendorBookings;
