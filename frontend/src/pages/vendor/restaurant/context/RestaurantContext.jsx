import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { vendorAPI } from '../../../../services/api';
import { useToast } from '../../../../contexts/ToastContext';

const RestaurantContext = createContext(null);

/**
 * Shared data layer for the Restaurant POS tabs (Kitchen/Menu/Tables/Reports)
 * — owner resolution, menu/tables/orders/categories state, and the 15s order
 * poll, extracted verbatim from the old Restaurant.jsx monolith so every tab
 * can be its own component without re-fetching or duplicating this state.
 */
export const RestaurantProvider = ({ ownerType, ownerId, children }) => {
  const toast = useToast();

  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);

  const isApproved = owner?.approval_status === 'approved';

  const loadAll = useCallback(async () => {
    try {
      const getOwner = ownerType === 'activity' ? vendorAPI.getActivity : vendorAPI.getHotel;
      const [ownerRes, menuRes, tablesRes, ordersRes, categoriesRes] = await Promise.all([
        getOwner(ownerId),
        vendorAPI.getMenuItems(ownerType, ownerId),
        vendorAPI.getTables(ownerType, ownerId),
        vendorAPI.getOrders(ownerType, ownerId),
        vendorAPI.getMenuCategories(ownerType, ownerId),
      ]);
      setOwner(ownerRes.data);
      setMenuItems(menuRes.data || []);
      setTables(tablesRes.data || []);
      setOrders(ordersRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Failed to load restaurant data', error);
      toast.error('Failed to load restaurant data');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerType, ownerId]);

  useEffect(() => {
    loadAll();
    const interval = setInterval(() => {
      vendorAPI.getOrders(ownerType, ownerId).then((res) => setOrders(res.data || [])).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAll, ownerType, ownerId]);

  const value = {
    ownerType,
    ownerId,
    owner,
    setOwner,
    loading,
    isApproved,
    menuItems,
    setMenuItems,
    tables,
    setTables,
    orders,
    setOrders,
    categories,
    setCategories,
    loadAll,
    toast,
  };

  return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
};

export const useRestaurant = () => {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error('useRestaurant must be used within a RestaurantProvider');
  return ctx;
};
