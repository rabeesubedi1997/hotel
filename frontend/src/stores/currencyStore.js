import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

// Prices throughout the app (hotel price_per_night, activity price, booking
// total_amount, etc) are entered/stored in this currency — conversion is
// purely a display-time transform, never touches what's stored or charged.
const BASE_CURRENCY = 'USD';

const useCurrencyStore = create(
  persist(
    (set, get) => ({
      selected: BASE_CURRENCY,
      rates: [{ code: 'USD', symbol: '$', rate: 1 }],
      loading: false,
      initialized: false,

      fetchRates: async () => {
        if (get().loading || get().initialized) return;
        set({ loading: true });
        try {
          const response = await api.get('/currency/rates');
          set({ rates: response.data.rates || [], initialized: true, loading: false });
        } catch (error) {
          console.error('Error fetching exchange rates:', error);
          set({ loading: false, initialized: true });
        }
      },

      setCurrency: (code) => set({ selected: code }),

      getCurrentRate: () => {
        const { rates, selected } = get();
        return rates.find((r) => r.code === selected) || { code: BASE_CURRENCY, symbol: '$', rate: 1 };
      },

      // Converts an amount already stored in the base currency into the
      // selected display currency and formats it with the right symbol.
      formatPrice: (amountInBase, { decimals = 0 } = {}) => {
        const rate = get().getCurrentRate();
        const amount = Number(amountInBase || 0) * Number(rate.rate || 1);
        const formatted = amount.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
        return `${rate.symbol} ${formatted}`;
      },
    }),
    {
      name: 'currency-storage',
      partialize: (state) => ({ selected: state.selected }),
    }
  )
);

export default useCurrencyStore;
