import { useState, useEffect } from 'react';
import { Search, Loader2, Eye, RotateCcw } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { Button, Input, Select, Table, Th, Td, Badge, Modal, Textarea } from '../../components/ui';

const AdminPackageBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewModal, setViewModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [refundModal, setRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBookings = async () => {
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const response = await adminAPI.getPackageBookings(params);
      setBookings(response.data.data || []);
    } catch (error) {
      console.error('Error fetching package bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await adminAPI.updatePackageBookingStatus(id, status);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
      toast.success('Status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const openViewModal = async (booking) => {
    setViewModal(true);
    setViewLoading(true);
    try {
      const response = await adminAPI.getPackageBooking(booking.id);
      setSelected(response.data);
    } catch (error) {
      console.error('Error fetching package booking details:', error);
    } finally {
      setViewLoading(false);
    }
  };

  const closeViewModal = () => {
    setViewModal(false);
    setSelected(null);
  };

  const openRefundModal = (booking) => {
    setSelected(booking);
    setRefundAmount(booking.total_amount);
    setRefundReason('');
    setRefundModal(true);
  };

  const handleRefund = async (e) => {
    e.preventDefault();
    setRefunding(true);
    try {
      await adminAPI.processPackageBookingRefund(selected.id, {
        refund_amount: refundAmount,
        refund_reason: refundReason,
      });
      setBookings((prev) => prev.map((b) => (b.id === selected.id ? { ...b, status: 'refunded' } : b)));
      toast.success('Refund processed');
      setRefundModal(false);
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error(error.response?.data?.message || 'Failed to process refund');
    } finally {
      setRefunding(false);
    }
  };

  const filtered = bookings.filter((b) =>
    b.booking_number.toLowerCase().includes(search.toLowerCase()) ||
    b.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.itinerary?.title?.toLowerCase().includes(search.toLowerCase())
  );

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
        <h2 className="font-display text-xl sm:text-2xl font-bold text-neutral-900">Package Bookings</h2>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Input
          type="text"
          placeholder="Search by booking #, customer, or package..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
          className="flex-1"
        />
        <Select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); fetchBookings(); }}
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
            <Th>Package</Th>
            <Th>Travel Date</Th>
            <Th>Travelers</Th>
            <Th>Amount</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {filtered.map((booking) => (
            <tr key={booking.id}>
              <Td className="font-medium text-neutral-900">{booking.booking_number}</Td>
              <Td>{booking.user?.name}</Td>
              <Td>{booking.itinerary?.title}</Td>
              <Td>{new Date(booking.travel_date).toLocaleDateString()}</Td>
              <Td>{booking.travelers}</Td>
              <Td className="text-neutral-900">${booking.total_amount}</Td>
              <Td><Badge status={booking.status} /></Td>
              <Td className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => openViewModal(booking)} title="View Details" className="!px-2">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {booking.status === 'confirmed' && (
                    <Button variant="secondary" size="sm" onClick={() => openRefundModal(booking)} title="Refund" className="!px-2">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
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
          {filtered.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 sm:px-6 py-8 text-center text-sm text-neutral-500">
                No package bookings found.
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      {/* View Modal */}
      <Modal open={viewModal} onClose={closeViewModal} title="Package Booking Details" size="lg">
        {viewLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : selected ? (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <p className="text-sm text-neutral-500">Booking Number</p>
                <p className="text-lg font-bold text-neutral-900">{selected.booking_number}</p>
              </div>
              <Badge status={selected.status} />
            </div>

            <div className="bg-neutral-50 rounded-2xl p-4">
              <h4 className="font-display font-semibold text-neutral-900 mb-3">Customer</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><p className="text-sm text-neutral-500">Name</p><p className="font-medium">{selected.user?.name}</p></div>
                <div><p className="text-sm text-neutral-500">Email</p><p className="font-medium">{selected.user?.email}</p></div>
              </div>
            </div>

            <div className="bg-neutral-50 rounded-2xl p-4">
              <h4 className="font-display font-semibold text-neutral-900 mb-3">Package</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><p className="text-sm text-neutral-500">Title</p><p className="font-medium">{selected.itinerary?.title}</p></div>
                <div><p className="text-sm text-neutral-500">Travel Date</p><p className="font-medium">{new Date(selected.travel_date).toLocaleDateString()}</p></div>
                <div><p className="text-sm text-neutral-500">Travelers</p><p className="font-medium">{selected.travelers}</p></div>
                <div><p className="text-sm text-neutral-500">Total Amount</p><p className="font-bold text-primary-600">${selected.total_amount}</p></div>
              </div>
              {selected.special_requests && (
                <div className="mt-4">
                  <p className="text-sm text-neutral-500">Special Requests</p>
                  <p className="font-medium">{selected.special_requests}</p>
                </div>
              )}
            </div>

            {selected.bookings?.length > 0 && (
              <div className="bg-neutral-50 rounded-2xl p-4">
                <h4 className="font-display font-semibold text-neutral-900 mb-3">Included Bookings</h4>
                <div className="space-y-2">
                  {selected.bookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between bg-white rounded-xl p-2.5 border border-neutral-100">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{b.bookable?.name}</p>
                        <p className="text-xs text-neutral-500">{b.check_in_date ? `Check-in ${new Date(b.check_in_date).toLocaleDateString()}` : new Date(b.activity_datetime).toLocaleString()}</p>
                      </div>
                      <Badge status={b.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.payment && (
              <div className="bg-neutral-50 rounded-2xl p-4">
                <h4 className="font-display font-semibold text-neutral-900 mb-3">Payment</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><p className="text-sm text-neutral-500">Method</p><p className="font-medium capitalize">{selected.payment.method}</p></div>
                  <div><p className="text-sm text-neutral-500">Status</p><p className="font-medium capitalize">{selected.payment.status}</p></div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-neutral-500">Failed to load booking details.</p>
        )}
      </Modal>

      {/* Refund Modal */}
      <Modal open={refundModal} onClose={() => setRefundModal(false)} title="Process Refund" size="md">
        <form onSubmit={handleRefund} className="space-y-4">
          <Input
            label="Refund Amount ($)"
            type="number"
            min="0"
            max={selected?.total_amount}
            step="0.01"
            required
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
          />
          <Textarea
            label="Refund Reason"
            required
            rows={3}
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit" fullWidth loading={refunding} disabled={refunding}>
              Process Refund
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={() => setRefundModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminPackageBookings;
