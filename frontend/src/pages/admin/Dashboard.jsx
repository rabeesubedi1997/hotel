import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  Compass,
  Calendar,
  DollarSign,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import { StatCard, Badge, Table, Th, Td, SectionHeading } from '../../components/ui';
import PendingRequestsWidget from '../../components/admin/PendingRequestsWidget';
import { formatUSD } from '../../utils/money';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [popularItems, setPopularItems] = useState({ hotels: [], activities: [] });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchPendingRequests = useCallback(async () => {
    try {
      const response = await adminAPI.getPendingRequests();
      setPendingRequests(response.data);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, bookingsRes, popularRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getRecentBookings(),
        adminAPI.getPopularItems(),
      ]);
      setStats(statsRes.data);
      setRecentBookings(bookingsRes.data);
      setPopularItems(popularRes.data);
      await fetchPendingRequests();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        align="left"
        eyebrow="Overview"
        title="Dashboard"
        description="A snapshot of bookings, revenue, and the site's most popular listings."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard icon={Calendar} title="Total Bookings" value={stats?.total_bookings || 0} tone="primary" />
        <StatCard
          icon={DollarSign}
          title="Total Revenue"
          value={formatUSD(stats?.total_revenue)}
          tone="success"
        />
        <StatCard icon={Users} title="Total Users" value={stats?.total_users || 0} tone="accent" />
        <StatCard icon={TrendingUp} title="Pending Reviews" value={stats?.pending_reviews || 0} tone="warning" />
      </div>

      {/* Pending Requests — the "instant booking" queue, oldest first */}
      <PendingRequestsWidget requests={pendingRequests} onResponded={fetchPendingRequests} />

      {/* Recent Bookings */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <h2 className="font-display text-xl font-semibold text-neutral-900 mb-4">Recent Bookings</h2>
        {recentBookings.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <Th>Booking #</Th>
                <Th>Customer</Th>
                <Th>Item</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {recentBookings.slice(0, 5).map((booking) => (
                <tr key={booking.id}>
                  <Td className="font-medium text-neutral-900">{booking.booking_number}</Td>
                  <Td>{booking.user?.name}</Td>
                  <Td>{booking.bookable?.name}</Td>
                  <Td className="font-semibold text-neutral-900">{formatUSD(booking.total_amount)}</Td>
                  <Td>
                    <Badge status={booking.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="text-neutral-500">No recent bookings</p>
        )}
        <Link to="/admin/bookings" className="text-primary-600 font-medium hover:text-primary-700 mt-4 inline-block">
          View All Bookings →
        </Link>
      </div>

      {/* Popular Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="font-display text-xl font-semibold text-neutral-900 mb-4">Popular Hotels</h2>
          {popularItems.hotels?.length > 0 ? (
            <div className="space-y-3">
              {popularItems.hotels.slice(0, 5).map((hotel) => (
                <div key={hotel.id} className="flex items-center justify-between">
                  <div className="flex items-center min-w-0">
                    <Building2 className="h-5 w-5 text-neutral-400 mr-2 shrink-0" />
                    <span className="text-neutral-800 truncate">{hotel.name}</span>
                  </div>
                  <span className="text-sm text-neutral-500 shrink-0 ml-2">{hotel.bookings_count} bookings</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-500">No data available</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="font-display text-xl font-semibold text-neutral-900 mb-4">Popular Activities</h2>
          {popularItems.activities?.length > 0 ? (
            <div className="space-y-3">
              {popularItems.activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between">
                  <div className="flex items-center min-w-0">
                    <Compass className="h-5 w-5 text-neutral-400 mr-2 shrink-0" />
                    <span className="text-neutral-800 truncate">{activity.name}</span>
                  </div>
                  <span className="text-sm text-neutral-500 shrink-0 ml-2">{activity.bookings_count} bookings</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-500">No data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
