import { forwardRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import { Building2, Compass, Route, Search, Users, CalendarDays } from 'lucide-react';
import { hotelsAPI, activitiesAPI } from '../services/api';
import useSearchStore, { toYmd, fromYmd } from '../stores/searchStore';
import { Select } from './ui';
import 'react-datepicker/dist/react-datepicker.css';

const TABS = [
  { key: 'hotels', label: 'Hotels', icon: Building2 },
  { key: 'activities', label: 'Activities', icon: Compass },
  { key: 'packages', label: 'Packages', icon: Route },
];

// Airbnb-style range control: the whole pill is one button, so clicking
// anywhere in it — not just a thin text caret — opens the calendar, and
// both ends of the range are always visible instead of being squeezed
// into (and sometimes truncated inside) a single small text input.
const RangeDateField = forwardRef(({ onClick, checkIn, checkOut }, ref) => (
  <button
    type="button"
    ref={ref}
    onClick={onClick}
    className="w-full h-full flex items-stretch text-left rounded-xl border border-neutral-300 bg-white hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
  >
    <span className="flex items-center pl-3 shrink-0">
      <CalendarDays className="h-4 w-4 text-neutral-400" />
    </span>
    <span className="flex-1 min-w-0 flex flex-col justify-center pl-2.5 pr-2 py-2">
      <span className="font-label-caps text-[10px] uppercase tracking-wide text-neutral-400">Check-in</span>
      <span className={`text-sm truncate ${checkIn ? 'text-neutral-800 font-medium' : 'text-neutral-400'}`}>
        {checkIn ? format(checkIn, 'MMM d, yyyy') : 'Add date'}
      </span>
    </span>
    <span className="w-px my-2 bg-neutral-200 shrink-0" />
    <span className="flex-1 min-w-0 flex flex-col justify-center pl-2.5 pr-3 py-2">
      <span className="font-label-caps text-[10px] uppercase tracking-wide text-neutral-400">Check-out</span>
      <span className={`text-sm truncate ${checkOut ? 'text-neutral-800 font-medium' : 'text-neutral-400'}`}>
        {checkOut ? format(checkOut, 'MMM d, yyyy') : 'Add date'}
      </span>
    </span>
  </button>
));
RangeDateField.displayName = 'RangeDateField';

// Same full-width-clickable treatment for the single-date activity picker.
const SingleDateField = forwardRef(({ onClick, date, label = 'Date', placeholder = 'Add date' }, ref) => (
  <button
    type="button"
    ref={ref}
    onClick={onClick}
    className="w-full h-full flex items-center text-left rounded-xl border border-neutral-300 bg-white hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition px-3 py-2 gap-2.5"
  >
    <CalendarDays className="h-4 w-4 text-neutral-400 shrink-0" />
    <span className="min-w-0 flex flex-col justify-center">
      <span className="font-label-caps text-[10px] uppercase tracking-wide text-neutral-400">{label}</span>
      <span className={`text-sm truncate ${date ? 'text-neutral-800 font-medium' : 'text-neutral-400'}`}>
        {date ? format(date, 'MMM d, yyyy') : placeholder}
      </span>
    </span>
  </button>
));
SingleDateField.displayName = 'SingleDateField';

/**
 * Tabbed hero search widget — the single most prominent element on
 * competitor OTA homepages (a destination/date/guest search bar up front,
 * not a generic text box). Each tab submits straight into the matching
 * listing page, pre-filtered via querystring.
 */
const SearchWidget = ({ className = '' }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('hotels');
  const [hotelCities, setHotelCities] = useState([]);
  const [activityCities, setActivityCities] = useState([]);

  const { setHotelSearch, setActivityDate, getHotelSearch, getActivityDate } = useSearchStore();
  const [hotelForm, setHotelForm] = useState(() => ({ city: '', ...getHotelSearch() }));
  const [activityForm, setActivityForm] = useState(() => ({ city: '', date: fromYmd(getActivityDate()) }));
  const [packageForm, setPackageForm] = useState({ destination: '', duration: '' });

  useEffect(() => {
    hotelsAPI.getCities().then((res) => setHotelCities(res.data || [])).catch(() => {});
    activitiesAPI.getCities().then((res) => setActivityCities(res.data || [])).catch(() => {});
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const fmt = toYmd;

    if (tab === 'hotels') {
      setHotelSearch({
        checkIn: fmt(hotelForm.checkIn),
        checkOut: fmt(hotelForm.checkOut),
        guests: Number(hotelForm.guests) || 1,
      });
      const params = new URLSearchParams();
      if (hotelForm.city) params.set('city', hotelForm.city);
      if (hotelForm.checkIn) params.set('checkin', fmt(hotelForm.checkIn));
      if (hotelForm.checkOut) params.set('checkout', fmt(hotelForm.checkOut));
      if (hotelForm.guests) params.set('guests', hotelForm.guests);
      navigate(`/hotels${params.toString() ? `?${params}` : ''}`);
    } else if (tab === 'activities') {
      setActivityDate(fmt(activityForm.date));
      const params = new URLSearchParams();
      if (activityForm.city) params.set('city', activityForm.city);
      if (activityForm.date) params.set('date', fmt(activityForm.date));
      navigate(`/activities${params.toString() ? `?${params}` : ''}`);
    } else {
      const params = new URLSearchParams();
      if (packageForm.destination) params.set('search', packageForm.destination);
      if (packageForm.duration) params.set('duration', packageForm.duration);
      navigate(`/itineraries${params.toString() ? `?${params}` : ''}`);
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-xl p-4 sm:p-6 ${className}`}>
      {/* Tabs */}
      <div className="flex items-center gap-1.5 mb-4">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-label-md text-label-md transition-all ${
              tab === key ? 'bg-primary-600 text-white shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
        {tab === 'hotels' && (
          <>
            <Select
              value={hotelForm.city}
              onChange={(e) => setHotelForm((f) => ({ ...f, city: e.target.value }))}
              className="flex-1 min-w-[160px]"
            >
              <option value="">Where are you staying?</option>
              {hotelCities.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <div className="flex-[1.4] min-w-[240px]">
              <DatePicker
                selectsRange
                monthsShown={2}
                onChange={(dates) => setHotelForm((f) => ({ ...f, checkIn: dates[0], checkOut: dates[1] }))}
                startDate={hotelForm.checkIn}
                endDate={hotelForm.checkOut}
                minDate={new Date()}
                dateFormat="MMM d, yyyy"
                wrapperClassName="w-full h-full"
                popperPlacement="bottom-start"
                customInput={<RangeDateField checkIn={hotelForm.checkIn} checkOut={hotelForm.checkOut} />}
              />
            </div>
            <div className="w-full sm:w-32 flex items-center gap-2.5 border border-neutral-300 rounded-xl px-3 py-2">
              <Users className="h-4 w-4 text-neutral-400 shrink-0" />
              <span className="min-w-0 flex flex-col justify-center">
                <span className="font-label-caps text-[10px] uppercase tracking-wide text-neutral-400">Guests</span>
                <input
                  type="number"
                  min={1}
                  value={hotelForm.guests}
                  onChange={(e) => setHotelForm((f) => ({ ...f, guests: e.target.value }))}
                  className="w-full text-sm font-medium text-neutral-800 outline-none"
                />
              </span>
            </div>
          </>
        )}

        {tab === 'activities' && (
          <>
            <Select
              value={activityForm.city}
              onChange={(e) => setActivityForm((f) => ({ ...f, city: e.target.value }))}
              className="flex-1 min-w-[160px]"
            >
              <option value="">Where's the adventure?</option>
              {activityCities.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <div className="flex-1 min-w-[180px]">
              <DatePicker
                selected={activityForm.date}
                onChange={(date) => setActivityForm((f) => ({ ...f, date }))}
                minDate={new Date()}
                dateFormat="MMM d, yyyy"
                wrapperClassName="w-full h-full"
                popperPlacement="bottom-start"
                customInput={<SingleDateField date={activityForm.date} label="Preferred date" />}
              />
            </div>
          </>
        )}

        {tab === 'packages' && (
          <>
            <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 focus-within:border-primary-400 transition min-w-[220px]">
              <Search className="h-4 w-4 text-neutral-400 shrink-0" />
              <input
                type="text"
                value={packageForm.destination}
                onChange={(e) => setPackageForm((f) => ({ ...f, destination: e.target.value }))}
                placeholder="Search packages by destination..."
                className="w-full bg-transparent text-neutral-800 placeholder:text-neutral-400 focus:outline-none text-sm"
              />
            </div>
            <Select
              value={packageForm.duration}
              onChange={(e) => setPackageForm((f) => ({ ...f, duration: e.target.value }))}
              className="sm:w-56"
            >
              <option value="">Any duration</option>
              <option value="short">Short Escapes (1-4 Days)</option>
              <option value="multi">Multi-Day (5-9 Days)</option>
              <option value="grand">Grand Adventures (10+ Days)</option>
            </Select>
          </>
        )}

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-label-md text-label-md hover:bg-primary-700 transition-all shrink-0"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </form>
    </div>
  );
};

export default SearchWidget;
