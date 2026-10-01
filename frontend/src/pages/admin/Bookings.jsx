import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, CheckCircle, Loader2, Eye, Trash2, UserCog } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { Button, Input, Select, Table, Th, Td, Badge, Modal, Pagination } from '../../components/ui';
import usePagination from '../../hooks/usePagination';

const AdminBookings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const oversightUserId = searchParams.get('user_id');
  const oversightUserName = searchParams.get('user_name');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewModal, setViewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const { pagination, applyResponse, goToPage, setPerPage, resetToFirstPage } = usePagination();
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // A new search term or status filter always lands back on page 1 (a
  // no-op if already there).
  useEffect(() => {
    resetToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterStatus, oversightUserId]);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, debouncedSearch, filterStatus, oversightUserId]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current_page,
        per_page: pagination.per_page,
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      };
      if (oversightUserId) params.user_id = oversightUserId;
      const response = await adminAPI.getBookings(params);
      setBookings(response.data.data);
      applyResponse(response.data);
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

  const handleDeleteBooking = async (bookingId) => {
    if (window.confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
      try {
        await adminAPI.deleteBooking(bookingId);
        setBookings(bookings.filter(booking => booking.id !== bookingId));
        toast.success('Booking deleted successfully');
      } catch (error) {
        console.error('Error deleting booking:', error);
        toast.error('Failed to delete booking');
      }
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-neutral-900">Manage Bookings</h2>
      </div>

      {oversightUserId && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <UserCog className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Viewing {oversightUserName || 'this customer'}'s bookings — superadmin oversight
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSearchParams({})}>
            Exit oversight view
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Input
          type="text"
          placeholder="Search bookings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
          className="flex-1"
        />
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full sm:w-auto"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked In</option>
          <option value="checked_out">Checked Out</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </Select>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Booking #</Th>
            <Th>Customer</Th>
            <Th>Item</Th>
            <Th>Amount</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <Td className="font-medium text-neutral-900">{booking.booking_number}</Td>
              <Td>{booking.user?.name}</Td>
              <Td>{booking.bookable?.name}</Td>
              <Td className="text-neutral-900">${booking.total_amount}</Td>
              <Td>
                <Badge status={booking.status} />
              </Td>
              <Td className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openViewModal(booking)}
                    title="View Details"
                    className="!px-2"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {booking.status === 'pending' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => confirmBooking(booking.id)}
                      title="Confirm"
                      className="!px-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteBooking(booking.id)}
                    title="Delete Booking"
                    className="!px-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <select
                    value={booking.status}
                    onChange={(e) => updateStatus(booking.id, e.target.value)}
                    className="text-sm border border-neutral-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="checked_in">Checked In</option>
                    <option value="checked_out">Checked Out</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {pagination.total > 0 && (
        <Pagination pagination={pagination} onPageChange={goToPage} onPerPageChange={setPerPage} itemLabel="bookings" />
      )}

      {/* View Booking Modal */}
      <Modal open={viewModal} onClose={closeViewModal} title="Booking Details" size="lg">
        {viewLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : selectedBooking ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Booking Number & Status */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <p className="text-sm text-neutral-500">Booking Number</p>
                <p className="text-lg font-bold text-neutral-900">{selectedBooking.booking_number}</p>
              </div>
              <Badge status={selectedBooking.status} />
            </div>

            {/* Customer Info */}
            <div className="bg-neutral-50 rounded-2xl p-4">
              <h4 className="font-display font-semibold text-neutral-900 mb-3">Customer Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500">Name</p>
                  <p className="font-medium">{selectedBooking.user?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Email</p>
                  <p className="font-medium">{selectedBooking.user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Phone</p>
                  <p className="font-medium">{selectedBooking.user?.phone || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Item Info */}
            <div className="bg-neutral-50 rounded-2xl p-4">
              <h4 className="font-display font-semibold text-neutral-900 mb-3">
                {selectedBooking.bookable_type === 'App\\Models\\Hotel' ? 'Hotel' : 'Activity'} Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500">Name</p>
                  <p className="font-medium">{selectedBooking.bookable?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Location</p>
                  <p className="font-medium">{selectedBooking.bookable?.city || selectedBooking.bookable?.location}</p>
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div className="bg-neutral-50 rounded-2xl p-4">
              <h4 className="font-display font-semibold text-neutral-900 mb-3">Booking Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedBooking.check_in_date && (
                  <>
                    <div>
                      <p className="text-sm text-neutral-500">Check-in Date</p>
                      <p className="font-medium">{new Date(selectedBooking.check_in_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Check-out Date</p>
                      <p className="font-medium">{new Date(selectedBooking.check_out_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Guests</p>
                      <p className="font-medium">{selectedBooking.guests}</p>
                    </div>
                  </>
                )}
                {selectedBooking.activity_datetime && (
                  <>
                    <div>
                      <p className="text-sm text-neutral-500">Activity Date & Time</p>
                      <p className="font-medium">{new Date(selectedBooking.activity_datetime).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Participants</p>
                      <p className="font-medium">{selectedBooking.participants}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-sm text-neutral-500">Total Amount</p>
                  <p className="font-bold text-primary-600">${selectedBooking.total_amount}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Booking Date</p>
                  <p className="font-medium">{new Date(selectedBooking.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedBooking.special_requests && (
                <div className="mt-4">
                  <p className="text-sm text-neutral-500">Special Requests</p>
                  <p className="font-medium">{selectedBooking.special_requests}</p>
                </div>
              )}
            </div>

            {/* Payment Info */}
            {selectedBooking.payment && (
              <div className="bg-neutral-50 rounded-2xl p-4">
                <h4 className="font-display font-semibold text-neutral-900 mb-3">Payment Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-neutral-500">Payment Method</p>
                    <p className="font-medium capitalize">{selectedBooking.payment.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Payment Status</p>
                    <p className="font-medium">{selectedBooking.payment.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Amount Paid</p>
                    <p className="font-medium">${selectedBooking.payment.amount}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-neutral-500">Failed to load booking details.</p>
        )}
      </Modal>
    </div>
  );
};

export default AdminBookings;
