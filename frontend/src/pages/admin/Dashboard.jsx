import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  Compass,
  Calendar,
  Star,
  DollarSign,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { adminAPI } from '../../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [popularItems, setPopularItems] = useState({ hotels: [], activities: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
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
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Calendar}
          title="Total Bookings"
          value={stats?.total_bookings || 0}
          color="bg-blue-500"
        />
        <StatCard
          icon={DollarSign}
          title="Total Revenue"
          value={`$${Number(stats?.total_revenue || 0).toFixed(2)}`}
          color="bg-green-500"
        />
        <StatCard
          icon={Users}
          title="Total Users"
          value={stats?.total_users || 0}
          color="bg-purple-500"
        />
        <StatCard
          icon={TrendingUp}
          title="Pending Reviews"
          value={stats?.pending_reviews || 0}
          color="bg-yellow-500"
        />
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Bookings</h2>
        {recentBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentBookings.slice(0, 5).map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {booking.booking_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {booking.user?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {booking.bookable?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${booking.total_amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No recent bookings</p>
        )}
        <Link to="/admin/bookings" className="text-primary-600 mt-4 inline-block">
          View All Bookings →
        </Link>
      </div>

      {/* Popular Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Popular Hotels</h2>
          {popularItems.hotels?.length > 0 ? (
            <div className="space-y-3">
              {popularItems.hotels.slice(0, 5).map((hotel) => (
                <div key={hotel.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-900">{hotel.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{hotel.bookings_count} bookings</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No data available</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Popular Activities</h2>
          {popularItems.activities?.length > 0 ? (
            <div className="space-y-3">
              {popularItems.activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Compass className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-900">{activity.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{activity.bookings_count} bookings</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
