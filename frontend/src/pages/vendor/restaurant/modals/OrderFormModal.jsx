import { useEffect, useState } from 'react';
import { BedDouble, Loader2, Search, X } from 'lucide-react';
import { Button, Modal, Select, Textarea } from '../../../../components/ui';
import { vendorAPI } from '../../../../services/api';
import { useRestaurant } from '../context/RestaurantContext';
import { emptyOrderForm } from '../constants';

/**
 * "New Order" form, opened from the Kitchen tab. Extracted verbatim from
 * the old Restaurant.jsx monolith — same payload shape, same optimistic
 * table-status update on submit — plus "Charge to Room": staff can look up
 * a guest's active booking and attach it via booking_id, which
 * OrderController auto-posts to that booking's folio once the order is
 * marked completed, instead of taking a separate payment at the table.
 */
const OrderFormModal = ({ open, onClose, onPlaced }) => {
  const { ownerType, ownerId, menuItems, tables, setOrders, setTables, toast } = useRestaurant();
  const [orderFormData, setOrderFormData] = useState(emptyOrderForm);
  const [savingOrder, setSavingOrder] = useState(false);

  const [chargeToRoom, setChargeToRoom] = useState(false);
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingResults, setBookingResults] = useState([]);
  const [searchingBookings, setSearchingBookings] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // "Charge to Room" only makes sense once there's a table/booking context —
  // not for a takeaway order with no guest tied to a stay.
  const canChargeToRoom = orderFormData.order_type !== 'takeaway';

  useEffect(() => {
    if (!chargeToRoom || !bookingSearch.trim()) {
      setBookingResults([]);
      return;
    }
    setSearchingBookings(true);
    const handle = setTimeout(() => {
      vendorAPI.getActiveBookings(ownerType, ownerId, { search: bookingSearch.trim() })
        .then((res) => setBookingResults(res.data || []))
        .catch(() => setBookingResults([]))
        .finally(() => setSearchingBookings(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [chargeToRoom, bookingSearch, ownerType, ownerId]);

  const close = () => {
    onClose();
    setOrderFormData(emptyOrderForm);
    setChargeToRoom(false);
    setBookingSearch('');
    setBookingResults([]);
    setSelectedBooking(null);
  };

  const addOrderLine = (menuItemId) => {
    setOrderFormData((prev) => {
      const existing = prev.items.find((i) => i.menu_item_id === menuItemId);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((i) => (i.menu_item_id === menuItemId ? { ...i, quantity: i.quantity + 1 } : i)),
        };
      }
      return { ...prev, items: [...prev.items, { menu_item_id: menuItemId, quantity: 1 }] };
    });
  };

  const changeOrderLineQty = (menuItemId, quantity) => {
    setOrderFormData((prev) => ({
      ...prev,
      items: quantity <= 0
        ? prev.items.filter((i) => i.menu_item_id !== menuItemId)
        : prev.items.map((i) => (i.menu_item_id === menuItemId ? { ...i, quantity } : i)),
    }));
  };

  const orderTotal = orderFormData.items.reduce((sum, line) => {
    const item = menuItems.find((m) => m.id === line.menu_item_id);
    return sum + (item ? Number(item.price) * line.quantity : 0);
  }, 0);

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (orderFormData.items.length === 0) {
      toast.error('Add at least one item to the order');
      return;
    }
    setSavingOrder(true);
    try {
      const payload = {
        order_type: orderFormData.order_type,
        channel: orderFormData.channel,
        notes: orderFormData.notes || undefined,
        table_id: orderFormData.order_type === 'dine_in' && orderFormData.table_id ? orderFormData.table_id : undefined,
        booking_id: chargeToRoom && selectedBooking ? selectedBooking.id : undefined,
        items: orderFormData.items,
      };
      const response = await vendorAPI.createOrder(ownerType, ownerId, payload);
      setOrders((prev) => [response.data.order, ...prev]);
      if (response.data.order.table_id) {
        setTables((prev) => prev.map((t) => (t.id === response.data.order.table_id ? { ...t, status: 'occupied' } : t)));
      }
      toast.success('Order placed!');
      close();
      onPlaced?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="New Order" size="xl">
      <form onSubmit={handleOrderSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Order Type"
            value={orderFormData.order_type}
            onChange={(e) => setOrderFormData({ ...orderFormData, order_type: e.target.value, table_id: '' })}
          >
            <option value="dine_in">Dine-in</option>
            {ownerType === 'hotel' && <option value="room_service">Room Service</option>}
            <option value="takeaway">Takeaway</option>
          </Select>
          {orderFormData.order_type === 'dine_in' && (
            <Select
              label="Table"
              value={orderFormData.table_id}
              onChange={(e) => setOrderFormData({ ...orderFormData, table_id: e.target.value })}
            >
              <option value="">Select a table</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>Table {t.table_number} ({t.status})</option>
              ))}
            </Select>
          )}
          <Select
            label="Channel"
            value={orderFormData.channel}
            onChange={(e) => setOrderFormData({ ...orderFormData, channel: e.target.value })}
          >
            <option value="direct">Direct / POS</option>
            <option value="uber_eats">UberEats</option>
            <option value="doordash">DoorDash</option>
          </Select>
        </div>

        {canChargeToRoom && (
          <div className="border border-neutral-200 rounded-xl p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={chargeToRoom}
                onChange={(e) => {
                  setChargeToRoom(e.target.checked);
                  if (!e.target.checked) { setSelectedBooking(null); setBookingSearch(''); }
                }}
              />
              Charge to Room / Booking
            </label>
            {chargeToRoom && (
              selectedBooking ? (
                <div className="flex items-center justify-between gap-3 bg-primary-50 rounded-lg px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-primary-800 min-w-0">
                    <BedDouble className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {selectedBooking.user?.name || 'Guest'}
                      {selectedBooking.room ? ` · Room ${selectedBooking.room.room_number}` : ''}
                      {' · '}{selectedBooking.booking_number}
                    </span>
                  </span>
                  <button type="button" onClick={() => setSelectedBooking(null)} className="text-primary-600 hover:text-primary-800 shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="h-4 w-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    placeholder="Search guest name, room number, or booking #..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {searchingBookings && <Loader2 className="h-4 w-4 animate-spin text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />}
                  {bookingResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {bookingResults.map((booking) => (
                        <button
                          key={booking.id}
                          type="button"
                          onClick={() => { setSelectedBooking(booking); setBookingSearch(''); setBookingResults([]); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 flex items-center justify-between gap-2"
                        >
                          <span className="truncate">{booking.user?.name || 'Guest'}{booking.room ? ` · Room ${booking.room.room_number}` : ''}</span>
                          <span className="text-xs text-neutral-400 shrink-0">{booking.booking_number}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!searchingBookings && bookingSearch.trim() && bookingResults.length === 0 && (
                    <p className="text-xs text-neutral-400 mt-1">No active bookings match.</p>
                  )}
                </div>
              )
            )}
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-neutral-700 mb-2">Menu Items</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto border border-neutral-100 rounded-lg p-2">
            {menuItems.filter((m) => m.is_available).map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => addOrderLine(item.id)}
                className="flex items-center justify-between text-left px-3 py-2 rounded-lg hover:bg-primary-50 border border-neutral-100"
              >
                <span className="text-sm text-neutral-800">{item.name}</span>
                <span className="text-sm font-medium text-neutral-500">${Number(item.price).toFixed(2)}</span>
              </button>
            ))}
            {menuItems.filter((m) => m.is_available).length === 0 && (
              <p className="col-span-full text-center text-sm text-neutral-500 py-4">No available menu items.</p>
            )}
          </div>
        </div>

        {orderFormData.items.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-700">Order Summary</p>
            {orderFormData.items.map((line) => {
              const item = menuItems.find((m) => m.id === line.menu_item_id);
              if (!item) return null;
              return (
                <div key={line.menu_item_id} className="flex items-center justify-between text-sm">
                  <span>{item.name}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => changeOrderLineQty(line.menu_item_id, line.quantity - 1)} className="w-6 h-6 rounded bg-neutral-100 hover:bg-neutral-200">-</button>
                    <span className="w-6 text-center">{line.quantity}</span>
                    <button type="button" onClick={() => changeOrderLineQty(line.menu_item_id, line.quantity + 1)} className="w-6 h-6 rounded bg-neutral-100 hover:bg-neutral-200">+</button>
                    <span className="w-16 text-right font-medium">${(item.price * line.quantity).toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
            <div className="flex justify-between font-semibold pt-2 border-t border-neutral-100">
              <span>Total</span>
              <span>${orderTotal.toFixed(2)}</span>
            </div>
          </div>
        )}

        <Textarea
          label="Notes (optional)"
          rows={2}
          value={orderFormData.notes}
          onChange={(e) => setOrderFormData({ ...orderFormData, notes: e.target.value })}
        />

        <div className="flex space-x-3 pt-4">
          <Button type="button" variant="secondary" fullWidth disabled={savingOrder} onClick={close}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={savingOrder}>
            Place Order
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default OrderFormModal;
