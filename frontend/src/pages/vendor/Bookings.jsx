import { useEffect, useState } from 'react';
import { vendorAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { XCircle } from 'lucide-react';
import { Button, Table, Th, Td, Badge, Modal, Pagination } from '../../components/ui';
import usePagination from '../../hooks/usePagination';

const VendorBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewModal, setViewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [voidingChargeId, setVoidingChargeId] = useState(null);
  const toast = useToast();
  const { pagination, applyResponse, goToPage, setPerPage, resetToFirstPage } = usePagination();

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const response = await vendorAPI.getBookings({
          page: pagination.current_page,
          per_page: pagination.per_page,
          ...(filter !== 'all' ? { status: filter } : {}),
        });
        setBookings(response.data.data || []);
        applyResponse(response.data);
      } catch (error) {
        console.error('Failed to fetch bookings', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, filter]);

  // Status is now a server-side filter — switching tabs should land back on
  // page 1 rather than preserving whatever page the previous filter was on.
  const changeFilter = (status) => {
    setFilter(status);
    resetToFirstPage();
  };

  const isHotelBooking = (booking) => (booking.bookable_type || '').includes('Hotel');

  // Computed client-side (rather than trusting the fetched folio_total
  // snapshot) so voiding a charge above updates this total immediately
  // without a full refetch.
  const folioTotal = (booking) => {
    const posted = (booking.charges || []).filter((c) => c.status === 'posted');
    return Number(booking.total_amount) + posted.reduce((sum, c) => sum + Number(c.amount), 0);
  };

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

  // Room charges (e.g. restaurant orders posted to this booking's folio)
  // are voided here rather than deleted, so the record of the mistake stays
  // auditable — see BookingCharge::STATUS_VOIDED.
  const voidCharge = async (charge) => {
    if (!window.confirm(`Void this ${charge.description} charge?`)) return;
    setVoidingChargeId(charge.id);
    try {
      const response = await vendorAPI.voidBookingCharge(charge.id);
      const updateCharges = (booking) => booking.id !== charge.booking_id ? booking : {
        ...booking,
        charges: (booking.charges || []).map((c) => (c.id === charge.id ? response.data.charge : c)),
      };
      setBookings((prev) => prev.map(updateCharges));
      setSelectedBooking((prev) => (prev ? updateCharges(prev) : prev));
      toast.success('Charge voided');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to void charge');
    } finally {
      setVoidingChargeId(null);
    }
  };

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
              onClick={() => changeFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      {bookings.length === 0 ? (
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
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <Td>#{booking.id}</Td>
                <Td>{booking.user?.name || 'N/A'}</Td>
                <Td>{getBookableType(booking)}</Td>
                <Td>{booking.bookable?.name || 'N/A'}</Td>
                <Td>
                  ${folioTotal(booking).toFixed(2)}
                  {(booking.charges || []).some((c) => c.status === 'posted') && (
                    <span className="block text-[11px] text-neutral-400">incl. room charges</span>
                  )}
                </Td>
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

      {pagination.total > 0 && (
        <div className="mt-4">
          <Pagination
            pagination={pagination}
            onPageChange={goToPage}
            onPerPageChange={setPerPage}
            itemLabel="bookings"
          />
        </div>
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
                  <p className="text-sm text-neutral-500">{isHotelBooking(selectedBooking) ? 'Room' : 'Activity'} Amount</p>
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

            {/* Room charges — e.g. restaurant orders posted to this
                booking's folio via "Charge to Room" instead of a separate
                payment at the table. */}
            {(selectedBooking.charges || []).length > 0 && (
              <div className="bg-neutral-50 rounded-2xl p-4">
                <h4 className="font-display font-semibold text-neutral-900 mb-3">Room Charges</h4>
                <div className="space-y-2">
                  {selectedBooking.charges.map((charge) => (
                    <div key={charge.id} className="flex items-center justify-between gap-3 bg-white rounded-xl px-3 py-2 border border-neutral-100">
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${charge.status === 'voided' ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>
                          {charge.description}
                        </p>
                        <p className="text-xs text-neutral-400">{new Date(charge.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-sm font-semibold ${charge.status === 'voided' ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>
                          ${Number(charge.amount).toFixed(2)}
                        </span>
                        {charge.status !== 'voided' && (
                          <button
                            type="button"
                            onClick={() => voidCharge(charge)}
                            disabled={voidingChargeId === charge.id}
                            title="Void this charge"
                            className="text-red-500 hover:bg-red-50 rounded-lg p-1 disabled:opacity-40"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-neutral-200">
                  <span className="text-sm font-semibold text-neutral-700">Folio Total</span>
                  <span className="font-bold text-primary-700">${folioTotal(selectedBooking).toFixed(2)}</span>
                </div>
              </div>
            )}

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
