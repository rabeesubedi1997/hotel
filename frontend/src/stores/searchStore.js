import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Dates are kept as local 'YYYY-MM-DD' strings; toISOString() would shift
// them a day back in positive-offset timezones like Nepal (UTC+5:45).
export const toYmd = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const fromYmd = (ymd) => {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const isPast = (ymd) => ymd && ymd < toYmd(new Date());

const useSearchStore = create(
  persist(
    (set, get) => ({
      checkIn: '',
      checkOut: '',
      guests: 2,
      activityDate: '',

      setHotelSearch: ({ checkIn, checkOut, guests }) =>
        set((s) => ({
          checkIn: checkIn !== undefined ? checkIn : s.checkIn,
          checkOut: checkOut !== undefined ? checkOut : s.checkOut,
          guests: guests !== undefined ? guests : s.guests,
        })),

      setActivityDate: (activityDate) => set({ activityDate }),

      // Stale searches from a previous day are dropped rather than prefilled.
      getHotelSearch: () => {
        const { checkIn, checkOut, guests } = get();
        if (isPast(checkIn)) return { checkIn: null, checkOut: null, guests };
        return { checkIn: fromYmd(checkIn), checkOut: fromYmd(checkOut), guests };
      },

      getActivityDate: () => {
        const { activityDate } = get();
        return isPast(activityDate) ? '' : activityDate;
      },
    }),
    {
      name: 'search-preferences',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useSearchStore;
