import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, CreditCard, Smartphone, DollarSign, Banknote, CheckCircle, Wallet, ArrowLeft } from 'lucide-react';
import { hotelsAPI, activitiesAPI, bookingsAPI, paymentsAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getHotelImage, getActivityImage } from '../utils/images';

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  const toast = useToast();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    console.log('SessionStorage pendingBooking:', storedBooking);
    
    if (storedBooking) {
      const parsed = JSON.parse(storedBooking);
      console.log('Parsed booking data:', parsed);
      setPendingBooking(parsed);
      
      // Format dates to Y-m-d format and validate they're not in the past
      const formatDate = (dateString) => {
        if (!dateString) return '';
        
        // Handle different date formats that might come from sessionStorage
        let date;
        if (typeof dateString === 'string' && dateString.includes('T')) {
          // If it's an ISO string, create date and adjust for timezone
          date = new Date(dateString);
          // Convert to local date by adding timezone offset
          const timezoneOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
          date = new Date(date.getTime() + timezoneOffset);
        } else {
          date = new Date(dateString);
        }
        
        if (isNaN(date.getTime())) return '';
        
        // Use local date instead of UTC to avoid timezone issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const checkInDate = formatDate(parsed.check_in);
      const checkOutDate = formatDate(parsed.check_out);
      
      // Debug logging
      console.log('Original dates:', { check_in: parsed.check_in, check_out: parsed.check_out });
      console.log('Formatted dates:', { checkInDate, checkOutDate });
      
      // Validate dates are not in the past (use proper date comparison)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for fair comparison
      const checkInDateObj = new Date(checkInDate);
      checkInDateObj.setHours(0, 0, 0, 0); // Set to start of day for fair comparison
      
      console.log('Today (local):', today.toISOString().split('T')[0]);
      console.log('Check-in date object:', checkInDateObj.toISOString().split('T')[0]);
      console.log('Date comparison:', { 
        today: today.getTime(), 
        checkIn: checkInDateObj.getTime(), 
        isValid: checkInDateObj >= today 
      });
      
      if (checkInDateObj < today) {
        toast.error('Check-in date cannot be in the past. Please select valid dates.');
        // Navigate back to hotel details to select new dates
        navigate(`/hotels/${item?.slug || ''}`);
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        guests: parsed.adults + parsed.children || 1,
        adults: parsed.adults || 1,
        children: parsed.children || 0,
        room_id: parsed.room_id || null,
      }));
      // Don't clear sessionStorage yet - keep it for the item loading useEffect
      // sessionStorage.removeItem('pendingBooking');
      
      // For hotels, skip directly to payment step since details are already selected
      if (type === 'hotel') {
        console.log('Hotel checkout detected, setting step to 2 (payment)');
        setStep(2);
        
        // Check if we have the required booking data
        if (parsed.check_in && parsed.check_out && parsed.room_id) {
          console.log('Required booking data found, will create booking when item loads');
          console.log('Booking data:', { check_in: parsed.check_in, check_out: parsed.check_out, room_id: parsed.room_id });
          // Don't create booking yet - wait for item to load
        } else {
          console.log('Missing required data for auto-booking:', {
            check_in: !!parsed.check_in,
            check_out: !!parsed.check_out,
            room_id: !!parsed.room_id
          });
          toast.error('Missing booking information. Please select dates and room again.');
          navigate(`/hotels/${parsed.id || ''}`);
        }
      } else {
        console.log('Non-hotel checkout, keeping step 1 (details form)');
      }
    }
    
    if (type && id) {
      fetchItem();
    } else {
      setLoading(false);
    }
  }, [type, id]);

  // Auto-create booking for hotels when item is loaded
  useEffect(() => {
    if (type === 'hotel' && item && step === 2 && !booking && pendingBooking) {
      console.log('Item loaded, creating booking for hotel:', item.name);
      handleCreateBookingForHotel();
      // Clear sessionStorage after successful booking creation
      sessionStorage.removeItem('pendingBooking');
    }
  }, [item, type, step, booking, pendingBooking]);

  const fetchItem = async () => {
    try {
      if (type === 'hotel') {
        const response = await hotelsAPI.getBySlug(id);
        setItem(response.data);
      } else if (type === 'activity') {
        const response = await activitiesAPI.getBySlug(id);
        setItem(response.data);
      } else {
        console.error('Invalid type:', type);
        setError('Invalid booking type');
      }
    } catch (error) {
      console.error('Error fetching item:', error);
      setError('Failed to load item. Please try again.');
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

  const handleCreateBookingForHotel = async () => {
    if (!item || type !== 'hotel') return;
    
    setProcessing(true);
    try {
      const bookingData = {
        bookable_type: 'hotel',
        bookable_id: item.id,
        check_in_date: formData.check_in_date,
        check_out_date: formData.check_out_date,
        guests: formData.adults + formData.children,
        adults: formData.adults,
        children: formData.children,
        room_id: formData.room_id,
        special_requests: formData.special_requests,
      };

      console.log('Sending booking data:', bookingData);
      console.log('Booking data details:', {
        bookable_type: bookingData.bookable_type,
        bookable_id: bookingData.bookable_id,
        check_in_date: bookingData.check_in_date,
        check_out_date: bookingData.check_out_date,
        guests: bookingData.guests,
        adults: bookingData.adults,
        children: bookingData.children,
        room_id: bookingData.room_id,
        special_requests: bookingData.special_requests
      });
      
      const response = await bookingsAPI.create(bookingData);
      console.log('Booking response status:', response.status);
      console.log('Booking response data:', response.data);
      
      // Backend returns booking in response.data.booking
      const createdBooking = response.data.booking || response.data;
      console.log('Setting booking data:', createdBooking);
      setBooking(createdBooking);
    } catch (error) {
      console.error('Error creating booking:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Show specific validation errors if available
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const errorMessages = Object.values(validationErrors).flat();
        toast.error(`Validation failed: ${errorMessages.join(', ')}`);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to create booking. Please check your details and try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    
    // Validate dates
    if (type === 'hotel') {
      console.log('Form data for validation:', formData);
      if (!formData.check_in_date || !formData.check_out_date) {
        toast.error('Please select check-in and check-out dates');
        return;
      }
      if (formData.check_out_date <= formData.check_in_date) {
        toast.error('Check-out date must be after check-in date');
        return;
      }
      if (!formData.room_id) {
        toast.error('Please select a room');
        return;
      }
      
      // Validate dates are not in the past (use proper date comparison)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for fair comparison
      const checkInDateObj = new Date(formData.check_in_date);
      checkInDateObj.setHours(0, 0, 0, 0); // Set to start of day for fair comparison
      
      console.log('Form validation - Today:', today.toISOString().split('T')[0]);
      console.log('Form validation - Check-in:', checkInDateObj.toISOString().split('T')[0]);
      console.log('Form validation - Comparison:', { 
        today: today.getTime(), 
        checkIn: checkInDateObj.getTime(), 
        isValid: checkInDateObj >= today 
      });
      
      if (checkInDateObj < today) {
        toast.error('Check-in date cannot be in the past. Please select valid dates.');
        return;
      }
    } else {
      if (!formData.activity_datetime) {
        toast.error('Please select activity date and time');
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
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Show specific validation errors if available
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const errorMessages = Object.values(validationErrors).flat();
        toast.error(`Validation failed: ${errorMessages.join(', ')}`);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to create booking. Please check your details and try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!booking || !booking.id) {
      toast.error('No booking found. Please create a booking first.');
      return;
    }
    
    setProcessing(true);
    try {
      if (paymentMethod === 'cod') {
        await paymentsAPI.createCOD({ booking_id: booking.id });
        toast.success('Booking confirmed successfully!');
        navigate('/bookings');
      } else {
        toast.success('Booking confirmed successfully!');
        navigate('/bookings');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Payment failed. Please try again.');
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {error || 'Item not found'}
        </h2>
        <p className="text-gray-600 mb-6">
          {error || 'The hotel or activity you are trying to book could not be found.'}
        </p>
        <button 
          onClick={() => navigate(-1)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700"
        >
          Go Back
        </button>
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

      {/* Debug: Show current step */}
      {console.log('Rendering step:', step, 'Type:', type)}
      
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
                  <input 
                    type="text" 
                    readOnly
                    value={formData.check_in_date ? new Date(formData.check_in_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">Date selected from hotel page</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date *</label>
                  <input 
                    type="text" 
                    readOnly
                    value={formData.check_out_date ? new Date(formData.check_out_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">Date selected from hotel page</p>
                </div>
                
                {/* Adults and Children */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adults *</label>
                  <input 
                    type="text" 
                    readOnly
                    value={formData.adults}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Children</label>
                  <input 
                    type="text" 
                    readOnly
                    value={formData.children}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
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
