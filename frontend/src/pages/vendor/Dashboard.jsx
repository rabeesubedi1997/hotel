import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { vendorAPI } from '../../services/api';
import { Building2, Compass, Calendar, DollarSign, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { StatCard, SectionHeading } from '../../components/ui';

const VendorDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await vendorAPI.getStats();
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch vendor stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-500">Unable to load dashboard</div>
      </div>
    );
  }

  const pendingItems = [];
  if (stats.pending_hotels > 0) {
    pendingItems.push({ type: 'Hotels', count: stats.pending_hotels, icon: Building2 });
  }
  if (stats.pending_activities > 0) {
    pendingItems.push({ type: 'Activities', count: stats.pending_activities, icon: Compass });
  }

  return (
    <div>
      <SectionHeading
        align="left"
        eyebrow="Vendor Portal"
        title="Dashboard"
        description="Manage your properties and track your performance."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <StatCard
          icon={Building2}
          title="Total Hotels"
          value={stats.hotels_count}
          tone="primary"
          hint={stats.pending_hotels > 0 ? `${stats.pending_hotels} pending approval` : null}
        />
        <StatCard
          icon={Compass}
          title="Total Activities"
          value={stats.activities_count}
          tone="success"
          hint={stats.pending_activities > 0 ? `${stats.pending_activities} pending approval` : null}
        />
        <StatCard icon={Calendar} title="Total Bookings" value={stats.total_bookings} tone="accent" />
        <StatCard icon={DollarSign} title="Total Revenue" value={`$${stats.total_revenue}`} tone="warning" />
      </div>

      {/* Pending Items Alert */}
      {pendingItems.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-amber-800">Pending Approvals</h3>
              <div className="mt-2 text-sm text-amber-700 space-y-1">
                {pendingItems.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <item.icon className="h-4 w-4 mr-2" />
                    <span>{item.count} {item.type} waiting for approval</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-sm text-amber-700">
                Your items will be visible to customers once approved by the administrator.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-card p-6">
          <h3 className="font-display text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link to="/vendor/hotels" className="flex items-center text-primary-600 hover:text-primary-700 font-medium">
              <Building2 className="h-5 w-5 mr-2" />
              Add New Hotel
            </Link>
            <Link to="/vendor/activities" className="flex items-center text-primary-600 hover:text-primary-700 font-medium">
              <Compass className="h-5 w-5 mr-2" />
              Add New Activity
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6">
          <h3 className="font-display text-lg font-semibold text-neutral-900 mb-4">Recent Activity</h3>
          <div className="space-y-2">
            <div className="flex items-center text-sm text-neutral-600">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              <span>Your properties are performing well</span>
            </div>
            <div className="flex items-center text-sm text-neutral-600">
              <Calendar className="h-4 w-4 mr-2 text-primary-500" />
              <span>Keep track of your bookings</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;
