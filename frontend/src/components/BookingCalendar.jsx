import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { bookingsAPI } from '../services/api';

const BookingCalendar = ({ hotelId, roomId = null }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [soldOut, setSoldOut] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [hotelId, roomId, currentDate]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await bookingsAPI.getCalendarData(hotelId, roomId, currentDate.getFullYear(), currentDate.getMonth() + 1);
      setSoldOut(response.data?.sold_out_dates || []);
    } catch {
      setSoldOut([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    return { daysInMonth, startingDay };
  };

  const dateKey = (day) =>
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // The API returns nights where every room (of the selected type, or of
  // the whole hotel when none is picked) is already taken.
  const isDateBooked = (day) => soldOut.includes(dateKey(day));

  const isPastDate = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return targetDate < today;
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const today = new Date();
  const isToday = (day) => {
    return today.getDate() === day && 
           today.getMonth() === currentDate.getMonth() && 
           today.getFullYear() === currentDate.getFullYear();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">Availability Calendar</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-medium text-gray-900 min-w-[140px] text-center">
            {monthName}
          </span>
          <button
            onClick={() => navigateMonth(1)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="flex items-center space-x-4 mb-4 text-sm flex-wrap">
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span className="text-gray-600">Available</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
              <span className="text-gray-600">Sold out</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
              <span className="text-gray-600">Past Date</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
              <span className="text-gray-600">Today</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
            
            {/* Empty cells for days before start of month */}
            {Array.from({ length: startingDay }).map((_, index) => (
              <div key={`empty-${index}`} className="h-10"></div>
            ))}
            
            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const booked = isDateBooked(day);
              const isCurrentDay = isToday(day);
              const past = isPastDate(day);
              
              return (
                <div
                  key={day}
                  className={`
                    h-10 flex items-center justify-center text-sm rounded-lg border
                    ${past 
                      ? 'bg-gray-50 border-gray-200 text-gray-400' 
                      : booked 
                        ? 'bg-red-50 border-red-200 text-red-700' 
                        : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                    }
                    ${isCurrentDay ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-300' : ''}
                  `}
                >
                  {day}
                </div>
              );
            })}
          </div>

          <p className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
            {soldOut.length === 0
              ? `Rooms available every night in ${monthName.split(' ')[0]}.`
              : `${soldOut.length} night${soldOut.length === 1 ? '' : 's'} sold out this month${roomId ? ' for this room type' : ''}.`}
          </p>
        </>
      )}
    </div>
  );
};

export default BookingCalendar;
