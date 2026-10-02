import { useEffect, useState } from 'react';
import { paymentsAPI } from '../services/api';

/**
 * Loads the payment gateways the admin has enabled (Admin → Payment
 * Gateways) and tracks which one the customer picked. `offlineOnly` limits
 * the list to methods that confirm instantly (cash) — used by the
 * multi-booking trip checkout, where one online payment can't cover
 * several bookings.
 */
const usePaymentMethods = ({ offlineOnly = false } = {}) => {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    let cancelled = false;

    paymentsAPI.getMethods()
      .then((res) => {
        if (cancelled) return;
        const list = (res.data.methods || []).filter((m) => !offlineOnly || m.offline);
        setMethods(list);
        setSelected((prev) => (list.some((m) => m.id === prev) ? prev : list[0]?.id || ''));
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [offlineOnly]);

  const selectedMethod = methods.find((m) => m.id === selected) || null;

  return { methods, loading, error, selected, setSelected, selectedMethod };
};

export default usePaymentMethods;
