import { UtensilsCrossed, BedDouble, ShoppingBag } from 'lucide-react';

export const CATEGORY_LABELS = {
  starter: 'Starter',
  main_course: 'Main Course',
  dessert: 'Dessert',
  beverage: 'Beverage',
};

export const ORDER_TYPE_ICON = {
  dine_in: UtensilsCrossed,
  room_service: BedDouble,
  takeaway: ShoppingBag,
};

export const STATION_OPTIONS = [
  { value: 'grill', label: 'Grill Line' },
  { value: 'saute', label: 'Sauté / Expo' },
  { value: 'pizza', label: 'Woodfire Pizza' },
  { value: 'cold', label: 'Cold / Raw Bar' },
  { value: 'pastry', label: 'Pastry / Dessert' },
  { value: 'bar', label: 'Service Bar' },
];
export const STATION_LABEL = Object.fromEntries(STATION_OPTIONS.map((s) => [s.value, s.label]));

export const ALLERGEN_OPTIONS = ['gluten', 'dairy', 'nuts', 'shellfish', 'egg', 'soy'];

export const CHANNEL_LABEL = { direct: 'Direct / POS', uber_eats: 'UberEats', doordash: 'DoorDash' };

export const REPORT_PRESETS = [
  { key: 'today', label: 'Today', days: 0 },
  { key: '7d', label: '7 Days', days: 6 },
  { key: '30d', label: '30 Days', days: 29 },
  { key: '90d', label: '90 Days', days: 89 },
];

export const emptyMenuForm = {
  name: '',
  description: '',
  price: '',
  cost_price: '',
  category: 'main_course',
  sku: '',
  station: '',
  allergens: [],
  prep_time_minutes: '',
  image: '',
  is_available: true,
  track_inventory: false,
  stock_quantity: '',
  low_stock_threshold: 5,
};

export const emptyTableForm = {
  table_number: '',
  capacity: 2,
  status: 'available',
};

export const emptyOrderForm = {
  table_id: '',
  order_type: 'dine_in',
  channel: 'direct',
  notes: '',
  items: [],
};

export const NEXT_STATUS = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'served',
  served: 'completed',
};

export const ACTION_LABEL = {
  pending: 'Accept Order',
  confirmed: 'Start Preparing',
  preparing: 'Mark Ready',
  ready: 'Mark Served',
  served: 'Complete Order',
};

export const KITCHEN_COLUMNS = ['pending', 'confirmed', 'preparing', 'ready', 'served'];

export const ITEM_STATUS_LABEL = { pending: 'Pending', preparing: 'Preparing', ready: 'Ready', served: 'Served' };
export const ITEM_NEXT_STATUS = { pending: 'preparing', preparing: 'ready', ready: 'served', served: null };

// Ticket header bar color — bolder than the small elapsed-time badge, so a
// cook can spot a running-late order from across the pass at a glance.
export const urgencyBarClass = (minutes, done) => {
  if (done) return 'bg-primary-600 text-white';
  if (minutes >= 20) return 'bg-red-600 text-white';
  if (minutes >= 10) return 'bg-amber-500 text-white';
  return 'bg-neutral-800 text-white';
};
