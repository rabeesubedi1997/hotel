import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CreditCard, CheckCircle, Banknote, Wallet, ArrowLeft } from 'lucide-react';
import { hotelsAPI, activitiesAPI, bookingsAPI, paymentsAPI } from '../services/api';

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [pendingBooking, setPendingBooking] = useState(null);
  const [formData, setFormData] = useState({
    check_in_date: '',
    check_out_date: '',
    activity_datetime: '',
    guests: 1,
    adults: 1,
    children: 0,
    participants: 1,
    room_id: null,
    special_requests: '',
  });

  useEffect(() => {
    // Check for pending booking from sessionStorage (from HotelDetails page)
    const storedBooking = sessionStorage.getItem('pendingBooking');
    if (storedBooking) {
      const parsed = JSON.parse(storedBooking);
      setPendingBooking(parsed);
      setFormData(prev => ({
        ...prev,
        check_in_date: parsed.check_in || '',
        check_out_date: parsed.check_out || '',
        guests: parsed.adults + parsed.children || 1,
        adults: parsed.adults || 1,
        children: parsed.children || 0,
        room_id: parsed.room_id || null,
      }));
      // Clear sessionStorage after reading
      sessionStorage.removeItem('pendingBooking');
    }
    
    if (type && id) {
      fetchItem();
    } else {
      setLoading(false);
    }
  }, [type, id]);

  const fetchItem = async () => {
    try {
      if (type === 'hotel') {
        const response = await hotelsAPI.getBySlug(id);
        setItem(response.data);
      } else {
        const response = await activitiesAPI.getBySlug(id);
        setItem(response.data);
      }
    } catch (error) {
      console.error('Error fetching item:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!item) return 0;
    if (type === 'hotel') {
      const nights = formData.check_in_date && formData.check_out_date
        ? Math.max(1, (new Date(formData.check_out_date) - new Date(formData.check_in_date)) / (1000 * 60 * 60 * 24))
        : 1;
      const roomPrice = formData.room_id && item.rooms 
        ? item.rooms.find(r => r.id === formData.room_id)?.price || item.price_per_night
        : item.price_per_night;
      return roomPrice * nights * formData.guests;
    }
    return item.price * formData.participants;
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    
    // Validate dates
    if (type === 'hotel') {
      if (!formData.check_in_date || !formData.check_out_date) {
        alert('Please select check-in and check-out dates');
        return;
      }
      if (formData.check_out_date <= formData.check_in_date) {
        alert('Check-out date must be after check-in date');
        return;
      }
    } else {
      if (!formData.activity_datetime) {
        alert('Please select activity date and time');
        return;
      }
    }
    
    setProcessing(true);
    try {
      // Prepare booking data based on type
      const bookingData = {
        bookable_type: type,
        bookable_id: item.id,
      };
      
      if (type === 'hotel') {
        bookingData.check_in_date = formData.check_in_date;
        bookingData.check_out_date = formData.check_out_date;
        bookingData.guests = formData.guests;
        bookingData.room_id = formData.room_id;
      } else {
        bookingData.activity_datetime = formData.activity_datetime;
        bookingData.participants = formData.participants;
      }
      
      if (formData.special_requests) {
        bookingData.special_requests = formData.special_requests;
      }
      
      console.log('Sending booking data:', bookingData);
      const response = await bookingsAPI.create(bookingData);
      setBooking(response.data.booking);
      setStep(2);
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    setProcessing(true);
    try {
      if (paymentMethod === 'cod') {
        await paymentsAPI.createCOD({ booking_id: booking.id });
        navigate('/bookings');
      } else {
        navigate('/bookings');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Item not found</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>1</div>
          <span className="ml-2 font-medium">Details</span>
        </div>
        <div className="w-16 h-1 mx-4 bg-gray-200">
          <div className={`h-full bg-primary-600 transition-all ${step >= 2 ? 'w-full' : 'w-0'}`}></div>
        </div>
        <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>2</div>
          <span className="ml-2 font-medium">Payment</span>
        </div>
      </div>

      {step === 1 ? (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center space-x-4 mb-6 pb-6 border-b">
            <div className="h-20 w-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-2xl">
              {item.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
              <p className="text-gray-600">{item.city || item.location}</p>
              <p className="text-primary-600 font-semibold mt-1">
                ${type === 'hotel' ? item.price_per_night : item.price} {type === 'hotel' ? '/night' : '/person'}
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateBooking} className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Booking Details</h2>
            
            {type === 'hotel' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date *</label>
                  <input type="date" required min={new Date().toISOString().split('T')[0]}
                    value={formData.check_in_date}
                    onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  {formData.check_in_date && (
                    <p className="mt-1 text-xs text-gray-500">{new Date(formData.check_in_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date *</label>
                  <input type="date" required min={formData.check_in_date || new Date().toISOString().split('T')[0]}
                    value={formData.check_out_date}
                    onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  {formData.check_out_date && (
                    <p className="mt-1 text-xs text-gray-500">{new Date(formData.check_out_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  )}
                </div>
                
                {/* Adults and Children */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adults *</label>
                  <input type="number" min="1" max="10" required
                    value={formData.adults}
                    onChange={(e) => {
                      const adults = parseInt(e.target.value) || 1;
                      setFormData({ ...formData, adults, guests: adults + formData.children });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Children</label>
                  <input type="number" min="0" max="10"
                    value={formData.children}
                    onChange={(e) => {
                      const children = parseInt(e.target.value) || 0;
                      setFormData({ ...formData, children, guests: formData.adults + children });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Room Selector */}
                {item?.rooms && item.rooms.length > 0 && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                    <select
                      value={formData.room_id || ''}
                      onChange={(e) => setFormData({ ...formData, room_id: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Standard Room - ${item.price_per_night}/night</option>
                      {item.rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name} - ${room.price}/night
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
                  <input type="datetime-local" required min={new Date().toISOString().slice(0, 16)}
                    value={formData.activity_datetime}
                    onChange={(e) => setFormData({ ...formData, activity_datetime: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Participants *</label>
                  <input type="number" min="1" max={item.max_participants || 20} required
                    value={formData.participants}
                    onChange={(e) => setFormData({ ...formData, participants: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
              <textarea rows="3"
                value={formData.special_requests}
                onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Any special requirements..."
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-primary-600">${calculateTotal().toFixed(2)}</p>
                </div>
                <button type="submit" disabled={processing}
                  className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 flex items-center">
                  {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continue <CreditCard className="ml-2 h-5 w-5" /></>}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Payment Method</h2>
          
          <div className="space-y-4 mb-8">
            <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition ${paymentMethod === 'cod' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'}`}>
              <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'}
                onChange={(e) => setPaymentMethod(e.target.value)} className="hidden" />
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Banknote className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="font-semibold text-gray-900">Cash on Delivery</h3>
                <p className="text-sm text-gray-500">Pay at hotel/activity location</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cod' ? 'border-primary-600 bg-primary-600' : 'border-gray-300'}`}>
                {paymentMethod === 'cod' && <CheckCircle className="h-4 w-4 text-white" />}
              </div>
            </label>

            <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition ${paymentMethod === 'khalti' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'}`}>
              <input type="radio" name="payment" value="khalti" checked={paymentMethod === 'khalti'}
                onChange={(e) => setPaymentMethod(e.target.value)} className="hidden" />
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Wallet className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="font-semibold text-gray-900">Khalti Digital Wallet</h3>
                <p className="text-sm text-gray-500">Pay with Khalti (NPR)</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'khalti' ? 'border-primary-600 bg-primary-600' : 'border-gray-300'}`}>
                {paymentMethod === 'khalti' && <CheckCircle className="h-4 w-4 text-white" />}
              </div>
            </label>

            <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition ${paymentMethod === 'stripe' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'}`}>
              <input type="radio" name="payment" value="stripe" checked={paymentMethod === 'stripe'}
                onChange={(e) => setPaymentMethod(e.target.value)} className="hidden" />
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="font-semibold text-gray-900">Credit/Debit Card</h3>
                <p className="text-sm text-gray-500">Pay with card (USD)</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'stripe' ? 'border-primary-600 bg-primary-600' : 'border-gray-300'}`}>
                {paymentMethod === 'stripe' && <CheckCircle className="h-4 w-4 text-white" />}
              </div>
            </label>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-sm text-gray-500">Booking #{booking?.booking_number}</p>
              </div>
              <span className="text-3xl font-bold text-primary-600">${calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          <div className="flex space-x-4">
            <button onClick={() => setStep(1)} className="flex-1 py-4 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 flex items-center justify-center">
              <ArrowLeft className="mr-2 h-5 w-5" /> Back
            </button>
            <button onClick={handlePayment} disabled={processing}
              className="flex-1 bg-primary-600 text-white py-4 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center">
              {processing ? <Loader2 className="h-6 w-6 animate-spin" /> : (paymentMethod === 'cod' ? 'Confirm Booking' : 'Pay Now')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
