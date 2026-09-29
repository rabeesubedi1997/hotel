import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, CreditCard, Smartphone, DollarSign, Banknote, CheckCircle, Wallet, ArrowLeft, Calendar, Users, Info, MapPin, Lock, Tag, Check, X, Award } from 'lucide-react';
import { hotelsAPI, activitiesAPI, bookingsAPI, paymentsAPI, itinerariesAPI, tripPlansAPI, couponsAPI, packageBookingsAPI, loyaltyAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getHotelImage, getActivityImage } from '../utils/images';
import { Button, Card, Badge, Container, Input, Textarea, Select } from '../components/ui';
import useCurrencyStore from '../stores/currencyStore';
import useSearchStore from '../stores/searchStore';

// ---------------------------------------------------------------------------
// Multi-item trip/itinerary checkout (mode=itinerary|trip). Kept completely
// separate from the single-item flow below — see MultiItemCheckout further
// down in this file. Do not merge state/logic between the two paths.
// ---------------------------------------------------------------------------

// Every checkout flow here creates a booking, then later (after a review
// step the customer can sit on indefinitely) pays for it in a second
// request. The auth token lives in one shared localStorage key, so logging
// in/out in another tab changes it globally — without pinning, the payment
// request would silently pick up whatever account is logged in *now*
// instead of the one that created the booking, which the backend correctly
// rejects as 403 Unauthorized. Capture the token right when the booking is
// created and pass it explicitly to the payment call so a later token
// change elsewhere can't affect this in-flight checkout.
const pinnedAuthConfig = (token) => (token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);

const Checkout = () => {
  const [searchParams] = useSearchParams();

  // Branch point: when `mode` is present this is a multi-item trip/itinerary
  // checkout, handled entirely by the separate <MultiItemCheckout /> code
  // path below. Nothing past this point (the original single-item ?type=
  // &id= flow) runs in that case.
  const mode = searchParams.get('mode');
  if (mode === 'itinerary') {
    return <PackageCheckout />;
  }
  if (mode === 'trip') {
    return <MultiItemCheckout />;
  }

  return <SingleItemCheckout />;
};

const SingleItemCheckout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  const toast = useToast();
  const formatPrice = useCurrencyStore((s) => s.formatPrice);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState(null);
  const [checkoutToken, setCheckoutToken] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [pendingBooking, setPendingBooking] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponChecking, setCouponChecking] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discount_amount }
  const [couponError, setCouponError] = useState('');
  const [loyaltyAccount, setLoyaltyAccount] = useState(null);
  const [redeemPoints, setRedeemPoints] = useState('');
  const [redeemedDiscount, setRedeemedDiscount] = useState(0);
  const [redeeming, setRedeeming] = useState(false);
  const [formData, setFormData] = useState(() => {
    // Carry the date picked in the homepage activity search into the form;
    // 09:00 is only a starting value for the time the guest still confirms.
    const searchedDate = useSearchStore.getState().getActivityDate();
    return {
      check_in_date: '',
      check_out_date: '',
      activity_datetime: type === 'activity' && searchedDate ? `${searchedDate}T09:00` : '',
      guests: 1,
      adults: 1,
      children: 0,
      participants: 1,
      room_id: null,
      special_requests: '',
    };
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
        // Navigate back to hotel details to select new dates. sessionStorage
        // is already stale at this point, so clear it and replace this
        // history entry — otherwise pressing Back later re-enters this same
        // dead-end redirect instead of leaving the checkout flow.
        sessionStorage.removeItem('pendingBooking');
        navigate(`/hotels/${item?.slug || ''}`, { replace: true });
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
          sessionStorage.removeItem('pendingBooking');
          navigate(`/hotels/${parsed.id || ''}`, { replace: true });
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

  useEffect(() => {
    loyaltyAPI.getAccount().then((res) => setLoyaltyAccount(res.data.account)).catch(() => {});
  }, []);

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

  const discountedTotal = () => Math.max(0, calculateTotal() - (appliedCoupon?.discount_amount || 0));

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponChecking(true);
    setCouponError('');
    try {
      const response = await couponsAPI.validate({
        code: couponCode.trim(),
        order_amount: calculateTotal(),
        bookable_scope: type === 'hotel' ? 'hotels' : 'activities',
      });
      if (response.data.valid) {
        setAppliedCoupon({ code: couponCode.trim().toUpperCase(), discount_amount: response.data.discount_amount });
      } else {
        setAppliedCoupon(null);
        setCouponError(response.data.message || 'This coupon is not valid.');
      }
    } catch (error) {
      setAppliedCoupon(null);
      setCouponError(error.response?.data?.message || 'Could not validate that coupon.');
    } finally {
      setCouponChecking(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
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
        ...(appliedCoupon ? { coupon_code: appliedCoupon.code } : {}),
        ...(pendingBooking?.extras?.length ? { extras: pendingBooking.extras } : {}),
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
      setCheckoutToken(localStorage.getItem('token'));
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

      if (appliedCoupon) {
        bookingData.coupon_code = appliedCoupon.code;
      }

      console.log('Sending booking data:', bookingData);
      const response = await bookingsAPI.create(bookingData);
      setBooking(response.data.booking);
      setCheckoutToken(localStorage.getItem('token'));
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
        await paymentsAPI.createCOD({ booking_id: booking.id }, pinnedAuthConfig(checkoutToken));
        toast.success('Booking confirmed successfully!');
        navigate('/bookings', { replace: true });
      } else {
        // Khalti/Stripe/PayPal aren't wired to a real payment gateway yet —
        // don't fake a success here (that would leave the booking stuck at
        // "pending" while telling the customer they paid).
        toast.error('This payment method is not available yet. Please use Cash on Delivery for now.');
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
      <Container className="py-8 text-center">
        <h2 className="text-2xl font-bold text-neutral-900 mb-4">
          {error || 'Item not found'}
        </h2>
        <p className="text-neutral-600 mb-6">
          {error || 'The hotel or activity you are trying to book could not be found.'}
        </p>
        <Button variant="primary" onClick={() => navigate(-1)}>Go Back</Button>
      </Container>
    );
  }

  return (
    <Container className="max-w-4xl py-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : 'text-neutral-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-neutral-200'}`}>1</div>
          <span className="ml-2 font-medium">Details</span>
        </div>
        <div className="w-16 h-1 mx-4 bg-neutral-200">
          <div className={`h-full bg-primary-600 transition-all ${step >= 2 ? 'w-full' : 'w-0'}`}></div>
        </div>
        <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : 'text-neutral-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-neutral-200'}`}>2</div>
          <span className="ml-2 font-medium">Payment</span>
        </div>
      </div>

      {step === 1 ? (
        <Card hoverLift={false} className="p-5 sm:p-8">
          <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-neutral-100">
            <div className="h-20 w-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl shrink-0">
              {item.name.charAt(0)}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-neutral-900">{item.name}</h1>
              <p className="text-neutral-600">{item.city || item.location}</p>
              <p className="text-primary-600 font-semibold mt-1">
                {formatPrice(type === 'hotel' ? item.price_per_night : item.price)} {type === 'hotel' ? '/night' : '/person'}
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateBooking} className="space-y-6">
            <h2 className="font-display text-xl font-semibold text-neutral-900">Booking Details</h2>

            {type === 'hotel' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Check-in Date *"
                    type="text"
                    readOnly
                    value={formData.check_in_date ? new Date(formData.check_in_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                    className="bg-neutral-50 text-neutral-600 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-neutral-500">Date selected from hotel page</p>
                </div>
                <div>
                  <Input
                    label="Check-out Date *"
                    type="text"
                    readOnly
                    value={formData.check_out_date ? new Date(formData.check_out_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                    className="bg-neutral-50 text-neutral-600 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-neutral-500">Date selected from hotel page</p>
                </div>

                {/* Adults and Children */}
                <Input
                  label="Adults *"
                  type="text"
                  readOnly
                  value={formData.adults}
                  className="bg-neutral-50 text-neutral-600 cursor-not-allowed"
                />
                <Input
                  label="Children"
                  type="text"
                  readOnly
                  value={formData.children}
                  className="bg-neutral-50 text-neutral-600 cursor-not-allowed"
                />

                {/* Room Selector */}
                {item?.rooms && item.rooms.length > 0 && (
                  <div className="md:col-span-2">
                    <Select
                      label="Room Type"
                      value={formData.room_id || ''}
                      onChange={(e) => setFormData({ ...formData, room_id: e.target.value ? parseInt(e.target.value) : null })}
                    >
                      <option value="">Standard Room - ${item.price_per_night}/night</option>
                      {item.rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name} - ${room.price}/night
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Date & Time *"
                  type="datetime-local"
                  required
                  min={new Date().toISOString().slice(0, 16)}
                  value={formData.activity_datetime}
                  onChange={(e) => setFormData({ ...formData, activity_datetime: e.target.value })}
                />
                <Input
                  label="Participants *"
                  type="number"
                  min="1"
                  max={item.max_participants || 20}
                  required
                  value={formData.participants}
                  onChange={(e) => setFormData({ ...formData, participants: parseInt(e.target.value) })}
                />
              </div>
            )}

            <Textarea
              label="Special Requests"
              rows={3}
              value={formData.special_requests}
              onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
              placeholder="Any special requirements..."
            />

            {/* Coupon code */}
            <div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200">
                  <span className="flex items-center gap-2 text-sm font-semibold text-green-700">
                    <Check className="h-4 w-4" /> {appliedCoupon.code} applied — -${appliedCoupon.discount_amount.toFixed(2)}
                  </span>
                  <button type="button" onClick={handleRemoveCoupon} className="text-green-700 hover:text-green-900">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    icon={Tag}
                    placeholder="Have a coupon code?"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleApplyCoupon}
                    loading={couponChecking}
                    disabled={couponChecking || !couponCode.trim()}
                  >
                    Apply
                  </Button>
                </div>
              )}
              {couponError && <p className="mt-1.5 text-xs text-red-600">{couponError}</p>}
            </div>

            <div className="bg-neutral-50 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  {appliedCoupon ? (
                    <>
                      <p className="text-sm text-neutral-500 line-through">{formatPrice(calculateTotal())}</p>
                      <p className="text-sm text-neutral-600">Total Amount</p>
                      <p className="font-price-display text-price-display font-bold text-primary-600">{formatPrice(discountedTotal())}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-neutral-600">Total Amount</p>
                      <p className="font-price-display text-price-display font-bold text-primary-600">{formatPrice(calculateTotal())}</p>
                    </>
                  )}
                </div>
                <Button type="submit" size="lg" loading={processing} disabled={processing}>
                  {!processing && <>Continue <CreditCard className="h-5 w-5" /></>}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      ) : (
        <Card hoverLift={false} className="p-5 sm:p-8">
          <h2 className="font-display text-2xl font-bold text-neutral-900 mb-6">Select Payment Method</h2>

          <div className="space-y-4 mb-8">
            <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition ${paymentMethod === 'cod' ? 'border-primary-600 bg-primary-50' : 'border-neutral-200'}`}>
              <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'}
                onChange={(e) => setPaymentMethod(e.target.value)} className="hidden" />
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <Banknote className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="font-semibold text-neutral-900">Cash on Delivery</h3>
                <p className="text-sm text-neutral-500">Pay at hotel/activity location</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === 'cod' ? 'border-primary-600 bg-primary-600' : 'border-neutral-300'}`}>
                {paymentMethod === 'cod' && <CheckCircle className="h-4 w-4 text-white" />}
              </div>
            </label>

            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-neutral-50 text-sm text-neutral-500">
              <Wallet className="h-4 w-4 shrink-0" />
              Khalti, card, and PayPal payments are coming soon — Cash on Delivery is the only option for now.
            </div>
          </div>

          {loyaltyAccount?.points_balance > 0 && booking?.status === 'pending' && (
            <div className="mb-6 p-4 rounded-xl border border-neutral-200">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-neutral-700">
                  <Award className="h-4 w-4 inline mr-1.5 text-primary-600" />
                  You have <strong>{loyaltyAccount.points_balance} pts</strong> available
                  {redeemedDiscount > 0 && <span className="text-green-700"> — -${redeemedDiscount.toFixed(2)} applied</span>}
                </p>
                {redeemedDiscount === 0 && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max={loyaltyAccount.points_balance}
                      placeholder="Points to redeem"
                      value={redeemPoints}
                      onChange={(e) => setRedeemPoints(e.target.value)}
                      className="w-40"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      loading={redeeming}
                      disabled={redeeming || !redeemPoints}
                      onClick={async () => {
                        setRedeeming(true);
                        try {
                          const response = await loyaltyAPI.redeem({ points: parseInt(redeemPoints, 10), booking_id: booking.id });
                          setBooking(response.data.booking);
                          setRedeemedDiscount(response.data.discount_amount);
                          setLoyaltyAccount((prev) => ({ ...prev, points_balance: prev.points_balance - parseInt(redeemPoints, 10) }));
                          toast.success('Points redeemed');
                        } catch (error) {
                          toast.error(error.response?.data?.message || 'Could not redeem points');
                        } finally {
                          setRedeeming(false);
                        }
                      }}
                    >
                      Redeem
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-neutral-50 rounded-2xl p-6 mb-6">
            {booking?.extras?.length > 0 && (
              <div className="mb-4 pb-4 border-b border-neutral-200 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Added to your stay</p>
                {booking.extras.map((extra) => (
                  <div key={extra.id} className="flex justify-between items-center text-sm">
                    <span className="text-neutral-600">{extra.activity?.name} x {extra.quantity}</span>
                    <span className="font-medium text-neutral-700">{formatPrice(extra.subtotal)}</span>
                  </div>
                ))}
              </div>
            )}
            {Number(booking?.discount_amount) > 0 && (
              <div className="flex justify-between items-center text-sm text-neutral-500 mb-2">
                <span>Discount</span>
                <span>-{formatPrice(booking.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-neutral-600">Total Amount</p>
                <p className="text-sm text-neutral-500">Booking #{booking?.booking_number}</p>
              </div>
              <span className="font-price-display text-price-display font-bold text-primary-600">
                {formatPrice(booking?.total_amount ?? calculateTotal())}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="secondary" fullWidth onClick={() => setStep(1)}>
              <ArrowLeft className="h-5 w-5" /> Back
            </Button>
            <Button variant="primary" fullWidth loading={processing} disabled={processing} onClick={handlePayment}>
              {!processing && (paymentMethod === 'cod' ? 'Confirm Booking' : 'Pay Now')}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-neutral-400">
            <Lock className="h-3.5 w-3.5" /> Secure checkout
          </div>
        </Card>
      )}
    </Container>
  );
};

// ---------------------------------------------------------------------------
// PackageCheckout — books an admin-curated itinerary (?mode=itinerary&slug=)
// as a single fixed-price package: one PackageBooking record, one payment,
// with server-side all-or-nothing availability checking across every
// hotel/activity item. Replaces the old per-item MultiItemCheckout flow for
// itineraries — personal trip plans (?mode=trip) still use that flow below,
// since they have no fixed price and aren't a purchasable "package".
// ---------------------------------------------------------------------------
const PackageCheckout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const slug = searchParams.get('slug');

  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [packageBooking, setPackageBooking] = useState(null);
  const [checkoutToken, setCheckoutToken] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');

  const [travelDate, setTravelDate] = useState('');
  const [travelers, setTravelers] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');

  const [couponCode, setCouponCode] = useState('');
  const [couponChecking, setCouponChecking] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    let cancelled = false;
    itinerariesAPI.getBySlug(slug)
      .then((res) => !cancelled && setItinerary(res.data))
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [slug]);

  // Estimated price shown before submit — the server recomputes and
  // returns the authoritative total_amount once the package is created.
  const estimatedPrice = () => {
    if (!itinerary) return 0;
    const base = itinerary.fixed_price ?? (itinerary.price_from || 0) * travelers;
    return base;
  };
  const estimatedTotal = () => Math.max(0, estimatedPrice() - (appliedCoupon?.discount_amount || 0));

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponChecking(true);
    setCouponError('');
    try {
      const response = await couponsAPI.validate({
        code: couponCode.trim(),
        order_amount: estimatedPrice(),
        bookable_scope: 'packages',
      });
      if (response.data.valid) {
        setAppliedCoupon({ code: couponCode.trim().toUpperCase(), discount_amount: response.data.discount_amount });
      } else {
        setAppliedCoupon(null);
        setCouponError(response.data.message || 'This coupon is not valid.');
      }
    } catch (error) {
      setAppliedCoupon(null);
      setCouponError(error.response?.data?.message || 'Could not validate that coupon.');
    } finally {
      setCouponChecking(false);
    }
  };

  const handleBookPackage = async (e) => {
    e.preventDefault();
    if (!travelDate) {
      toast.error('Please select a travel start date');
      return;
    }
    setProcessing(true);
    try {
      const response = await packageBookingsAPI.create({
        itinerary_id: itinerary.id,
        travel_date: travelDate,
        travelers,
        special_requests: specialRequests || undefined,
        ...(appliedCoupon ? { coupon_code: appliedCoupon.code } : {}),
      });
      setPackageBooking(response.data.package_booking);
      setCheckoutToken(localStorage.getItem('token'));
      setStep(2);
    } catch (error) {
      console.error('Error booking package:', error);
      const errors = error.response?.data?.errors;
      if (Array.isArray(errors)) {
        errors.forEach((msg) => toast.error(msg));
      } else {
        toast.error(error.response?.data?.message || 'Could not book this package. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!packageBooking) return;
    setProcessing(true);
    try {
      if (paymentMethod === 'cod') {
        await paymentsAPI.createCOD({ package_booking_id: packageBooking.id }, pinnedAuthConfig(checkoutToken));
      }
      toast.success('Package booked successfully!');
      navigate('/bookings', { replace: true });
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

  if (notFound || !itinerary) {
    return (
      <Container className="py-16 text-center">
        <h2 className="font-display text-2xl font-bold text-neutral-900 mb-4">Package not found</h2>
        <p className="text-neutral-600 mb-6">This package may have been removed or the link is incorrect.</p>
        <Button variant="primary" onClick={() => navigate(-1)}>Go Back</Button>
      </Container>
    );
  }

  return (
    <Container className="max-w-4xl py-8">
      <div className="flex items-center justify-center mb-8">
        <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : 'text-neutral-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-neutral-200'}`}>1</div>
          <span className="ml-2 font-medium">Details</span>
        </div>
        <div className="w-16 h-1 mx-4 bg-neutral-200">
          <div className={`h-full bg-primary-600 transition-all ${step >= 2 ? 'w-full' : 'w-0'}`}></div>
        </div>
        <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : 'text-neutral-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-neutral-200'}`}>2</div>
          <span className="ml-2 font-medium">Payment</span>
        </div>
      </div>

      {step === 1 ? (
        <Card hoverLift={false} className="p-5 sm:p-8">
          <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-neutral-100">
            <div className="h-20 w-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl shrink-0 overflow-hidden">
              {itinerary.cover_image ? (
                <img src={itinerary.cover_image} alt={itinerary.title} className="w-full h-full object-cover" />
              ) : (
                itinerary.title.charAt(0)
              )}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-neutral-900">{itinerary.title}</h1>
              <p className="text-neutral-600">{itinerary.duration_days} day{itinerary.duration_days === 1 ? '' : 's'}</p>
            </div>
          </div>

          <form onSubmit={handleBookPackage} className="space-y-6">
            <h2 className="font-display text-xl font-semibold text-neutral-900">Trip Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Travel Start Date *"
                type="date"
                icon={Calendar}
                required
                min={new Date().toISOString().slice(0, 10)}
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
              />
              <Input
                label="Travelers *"
                type="number"
                icon={Users}
                min="1"
                max={itinerary.max_travelers || undefined}
                required
                value={travelers}
                onChange={(e) => setTravelers(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            {itinerary.max_travelers && (
              <p className="text-xs text-neutral-500 -mt-4">Maximum {itinerary.max_travelers} travelers for this package.</p>
            )}

            <Textarea
              label="Special Requests"
              rows={3}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Any special requirements..."
            />

            {/* Coupon code */}
            <div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200">
                  <span className="text-sm font-semibold text-green-700">
                    {appliedCoupon.code} applied — -${appliedCoupon.discount_amount.toFixed(2)}
                  </span>
                  <button type="button" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="text-green-700 hover:text-green-900 text-sm">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Have a coupon code?"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" variant="secondary" onClick={handleApplyCoupon} loading={couponChecking} disabled={couponChecking || !couponCode.trim()}>
                    Apply
                  </Button>
                </div>
              )}
              {couponError && <p className="mt-1.5 text-xs text-red-600">{couponError}</p>}
            </div>

            <div className="bg-neutral-50 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm text-neutral-600">Estimated Total</p>
                  <p className="font-price-display text-price-display font-bold text-primary-600">${estimatedTotal().toFixed(2)}</p>
                  <p className="text-xs text-neutral-500 mt-1">Final price is confirmed after availability is checked.</p>
                </div>
                <Button type="submit" size="lg" loading={processing} disabled={processing}>
                  {!processing && <>Continue <CreditCard className="h-5 w-5" /></>}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      ) : (
        <Card hoverLift={false} className="p-5 sm:p-8">
          <h2 className="font-display text-2xl font-bold text-neutral-900 mb-6">Select Payment Method</h2>

          <div className="space-y-4 mb-8">
            <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition ${paymentMethod === 'cod' ? 'border-primary-600 bg-primary-50' : 'border-neutral-200'}`}>
              <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'}
                onChange={(e) => setPaymentMethod(e.target.value)} className="hidden" />
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <Banknote className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="font-semibold text-neutral-900">Cash on Delivery</h3>
                <p className="text-sm text-neutral-500">Pay at check-in</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === 'cod' ? 'border-primary-600 bg-primary-600' : 'border-neutral-300'}`}>
                {paymentMethod === 'cod' && <CheckCircle className="h-4 w-4 text-white" />}
              </div>
            </label>
          </div>

          <div className="bg-neutral-50 rounded-2xl p-6 mb-6">
            {Number(packageBooking?.discount_amount) > 0 && (
              <div className="flex justify-between items-center text-sm text-neutral-500 mb-2">
                <span>Coupon discount</span>
                <span>-${Number(packageBooking.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-neutral-600">Total Amount</p>
                <p className="text-sm text-neutral-500">Booking #{packageBooking?.booking_number}</p>
              </div>
              <span className="font-price-display text-price-display font-bold text-primary-600">
                ${Number(packageBooking?.total_amount ?? estimatedTotal()).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="secondary" fullWidth onClick={() => setStep(1)}>
              <ArrowLeft className="h-5 w-5" /> Back
            </Button>
            <Button variant="primary" fullWidth loading={processing} disabled={processing} onClick={handlePayment}>
              {!processing && 'Confirm Booking'}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-neutral-400">
            <Lock className="h-3.5 w-3.5" /> Secure checkout
          </div>
        </Card>
      )}
    </Container>
  );
};

// ---------------------------------------------------------------------------
// MultiItemCheckout — books every hotel/activity item of a customer's own
// trip plan (?mode=trip&tripId=) in one flow: pick a trip start date + a
// shared guest count, create a booking per item sequentially, then pay for
// all of them with Cash on Delivery (the only payment method supported for
// batches, v1). Itineraries (?mode=itinerary) now use PackageCheckout above.
// ---------------------------------------------------------------------------
const MultiItemCheckout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const tripId = searchParams.get('tripId');

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [guests, setGuests] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [createdBookings, setCreatedBookings] = useState([]);
  const [checkoutToken, setCheckoutToken] = useState(null);
  const [bookingAttempted, setBookingAttempted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchTrip = async () => {
      if (!tripId) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }
      try {
        const response = await tripPlansAPI.getById(tripId);
        if (!cancelled) {
          setTrip(response.data);
        }
      } catch (err) {
        console.error('Error fetching trip plan:', err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrip();
    return () => { cancelled = true; };
  }, [tripId]);

  const items = trip?.items || [];
  const bookableItems = items.filter(
    (item) => item.bookable_label === 'hotel' || item.bookable_label === 'activity'
  );

  const formatYMD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const computeDate = (dayNumber) => {
    if (!startDate) return null;
    // Parse as local date (avoid UTC shift from new Date('YYYY-MM-DD')).
    const [y, m, d] = startDate.split('-').map(Number);
    const base = new Date(y, (m || 1) - 1, d || 1);
    base.setDate(base.getDate() + (Number(dayNumber || 1) - 1));
    return base;
  };

  // Group items by day (they arrive pre-sorted by day_number from the API).
  const days = [];
  for (const item of items) {
    let group = days.find((g) => g.day_number === item.day_number);
    if (!group) {
      group = { day_number: item.day_number, items: [] };
      days.push(group);
    }
    group.items.push(item);
  }

  const itemLabel = (item) => item.bookable?.name || item.bookable?.title || `${item.bookable_label} #${item.bookable?.id ?? ''}`;

  const handleConfirmAndBookAll = async () => {
    if (!startDate) {
      toast.error('Please select when this trip starts');
      return;
    }
    if (bookableItems.length === 0) {
      toast.error('This trip has no bookable hotels or activities.');
      return;
    }

    setProcessing(true);
    setCheckoutToken(localStorage.getItem('token'));
    const created = [];

    // Sequential on purpose: awaiting one booking at a time (instead of
    // Promise.all) means a single failed item doesn't abandon the rest —
    // we keep going and simply report which item(s) failed, then move on
    // to payment with whichever bookings did succeed.
    for (const item of bookableItems) {
      const date = computeDate(item.day_number);
      const ymd = formatYMD(date);
      const label = itemLabel(item);

      try {
        if (item.bookable_label === 'hotel') {
          const checkOut = new Date(date);
          checkOut.setDate(checkOut.getDate() + 1);
          const response = await bookingsAPI.create({
            bookable_type: 'hotel',
            bookable_id: item.bookable.id,
            check_in_date: ymd,
            check_out_date: formatYMD(checkOut),
            guests,
            itinerary_id: trip.id,
          });
          created.push(response.data.booking || response.data);
        } else if (item.bookable_label === 'activity') {
          const response = await bookingsAPI.create({
            bookable_type: 'activity',
            bookable_id: item.bookable.id,
            activity_datetime: `${ymd}T09:00`,
            participants: guests,
            itinerary_id: trip.id,
          });
          created.push(response.data.booking || response.data);
        }
      } catch (err) {
        console.error(`Failed to book "${label}" (day ${item.day_number}):`, err);
        const backendMessage =
          (err.response?.data?.errors && Object.values(err.response.data.errors).flat().join(', ')) ||
          err.response?.data?.message ||
          'booking failed';
        toast.error(`Could not book "${label}" (Day ${item.day_number}): ${backendMessage}`);
      }
    }

    setCreatedBookings(created);
    setBookingAttempted(true);
    setProcessing(false);
    setStep(2);

    if (created.length === 0) {
      toast.error('None of the items could be booked. Please try again.');
    } else if (created.length < bookableItems.length) {
      toast.warning(`${created.length} of ${bookableItems.length} items booked. See errors above for the rest.`);
    }
  };

  const handleConfirmCOD = async () => {
    if (createdBookings.length === 0) {
      toast.error('There are no bookings to confirm.');
      return;
    }

    setProcessing(true);
    let successCount = 0;

    for (const b of createdBookings) {
      try {
        await paymentsAPI.createCOD({ booking_id: b.id }, pinnedAuthConfig(checkoutToken));
        successCount += 1;
      } catch (err) {
        console.error(`COD confirmation failed for booking ${b.id}:`, err);
        toast.error(`Failed to confirm booking #${b.booking_number || b.id}`);
      }
    }

    setProcessing(false);

    if (successCount > 0) {
      toast.success(`${successCount} booking${successCount === 1 ? '' : 's'} confirmed`);
      navigate('/bookings', { replace: true });
    } else {
      toast.error('Could not confirm any bookings. Please try again.');
    }
  };

  const totalAmount = createdBookings.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (notFound || !trip) {
    return (
      <Container className="py-16 text-center">
        <h2 className="font-display text-2xl font-bold text-neutral-900 mb-4">Trip not found</h2>
        <p className="text-neutral-600 mb-6">
          We couldn't load this trip plan. It may have been removed or the link is incorrect.
        </p>
        <Button variant="primary" onClick={() => navigate(-1)}>Go Back</Button>
      </Container>
    );
  }

  return (
    <Container className="max-w-4xl py-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : 'text-neutral-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-neutral-200'}`}>1</div>
          <span className="ml-2 font-medium hidden sm:inline">Trip Details</span>
        </div>
        <div className="w-12 sm:w-16 h-1 mx-3 sm:mx-4 bg-neutral-200">
          <div className={`h-full bg-primary-600 transition-all ${step >= 2 ? 'w-full' : 'w-0'}`}></div>
        </div>
        <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : 'text-neutral-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-neutral-200'}`}>2</div>
          <span className="ml-2 font-medium hidden sm:inline">Payment</span>
        </div>
      </div>

      {step === 1 ? (
        <Card hoverLift={false} className="p-5 sm:p-8">
          <div className="mb-6 pb-6 border-b border-neutral-100">
            <Badge tone="primary" className="mb-2">My Trip Plan</Badge>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-neutral-900">{trip.title}</h1>
            {trip.duration_days && (
              <p className="text-neutral-600 mt-1">{trip.duration_days} day{trip.duration_days === 1 ? '' : 's'}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <Input
              label="When does this trip start?"
              type="date"
              icon={Calendar}
              min={new Date().toISOString().slice(0, 10)}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Guests / participants per stay / activity (applies to all items)"
              type="number"
              min="1"
              icon={Users}
              value={guests}
              onChange={(e) => setGuests(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Itinerary</h2>
          <div className="space-y-5 mb-8">
            {days.map((group) => {
              const date = computeDate(group.day_number);
              return (
                <div key={group.day_number} className="border border-neutral-100 rounded-xl p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <h3 className="font-semibold text-neutral-900">Day {group.day_number}</h3>
                    {date && (
                      <span className="text-sm text-neutral-500">
                        {date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-primary-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-neutral-800 font-medium">{itemLabel(item)}</span>
                            <Badge tone="neutral" className="ml-2 align-middle">{item.bookable_label.replace('_', ' ')}</Badge>
                            {item.bookable_label === 'tour_guide' && (
                              <p className="text-xs text-accent-600 mt-1 flex items-center gap-1">
                                <Info className="h-3.5 w-3.5 flex-shrink-0" />
                                Tour guides are hired separately — visit their page after this trip is booked.
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="bg-neutral-50 rounded-lg p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-neutral-600">
              {bookableItems.length} hotel/activity booking{bookableItems.length === 1 ? '' : 's'} will be created for this trip.
            </p>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="sm:w-auto"
              disabled={processing || !startDate}
              loading={processing}
              onClick={handleConfirmAndBookAll}
            >
              Confirm &amp; Book All
            </Button>
          </div>
        </Card>
      ) : (
        <Card hoverLift={false} className="p-5 sm:p-8">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-neutral-900 mb-2">Payment</h2>
          <p className="text-sm text-neutral-600 mb-6 flex items-start gap-2">
            <Info className="h-4 w-4 text-accent-600 mt-0.5 flex-shrink-0" />
            Online payment for multi-item trips isn't available yet — pay individually from My Bookings, or use Cash on Delivery below.
          </p>

          <div className="bg-neutral-50 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm text-neutral-600">Bookings created</p>
              <span className="font-semibold text-neutral-900">{createdBookings.length}</span>
            </div>
            {totalAmount > 0 && (
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-neutral-600">Total Amount</p>
                <span className="text-2xl font-bold text-primary-600">${totalAmount.toFixed(2)}</span>
              </div>
            )}
            {createdBookings.length > 0 && (
              <div>
                <p className="text-sm text-neutral-600 mb-1">Booking numbers</p>
                <div className="flex flex-wrap gap-2">
                  {createdBookings.map((b) => (
                    <Badge key={b.id} tone="success">#{b.booking_number || b.id}</Badge>
                  ))}
                </div>
              </div>
            )}
            {bookingAttempted && createdBookings.length === 0 && (
              <p className="text-sm text-red-600">No bookings were created. Please go back and try again.</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="secondary" fullWidth onClick={() => navigate('/bookings', { replace: true })}>
              <ArrowLeft className="mr-2 h-5 w-5" /> Go to My Bookings
            </Button>
            <Button
              variant="primary"
              fullWidth
              disabled={processing || createdBookings.length === 0}
              loading={processing}
              onClick={handleConfirmCOD}
            >
              Confirm (Cash on Delivery)
            </Button>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-neutral-400">
            <Lock className="h-3.5 w-3.5" /> Secure checkout
          </div>
        </Card>
      )}
    </Container>
  );
};

export default Checkout;
