import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Loader2, RefreshCw, Eye, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { Button, Input, Select, Modal, Table, Th, Td, Badge, RatingStars, Pagination } from '../../components/ui';
import usePagination from '../../hooks/usePagination';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewedUser, setViewedUser] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    role: 'customer',
    status: 'active',
  });

  const { pagination, applyResponse, goToPage, setPerPage, resetToFirstPage } = usePagination();
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // A new search term always lands back on page 1 (a no-op if already there).
  useEffect(() => {
    resetToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, debouncedSearch]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getUsers({
        page: pagination.current_page,
        per_page: pagination.per_page,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      setUsers(response.data.data);
      applyResponse(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (id, role) => {
    try {
      await adminAPI.updateUserRole(id, role);
      setUsers(users.map((user) =>
        user.id === id ? { ...user, role } : user
      ));
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await adminAPI.updateUserStatus(id, status);
      setUsers(users.map((user) =>
        user.id === id ? { ...user, status } : user
      ));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      role: user.role,
      status: user.status,
    });
    setEditModal(true);
  };

  const closeEditModal = () => {
    setEditModal(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      role: 'customer',
      status: 'active',
    });
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      role: 'customer',
      status: 'active',
    });
    setEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await adminAPI.updateUser(editingUser.id, formData);
        setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, ...formData } : u)));
        toast.success('User updated successfully!');
      } else {
        const response = await adminAPI.createUser(formData);
        setUsers([...users, response.data]);
        toast.success('User created successfully!');
        if (response.data.password) {
          toast.success(
            `User created! Email: ${response.data.email}, Password: ${response.data.password}`,
            { duration: 8000 }
          );
        }
      }
      closeEditModal();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Failed to save user. Please try again.');
    }
  };

  const resetPassword = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to reset password for ${userName}? A new password will be generated.`)) {
      try {
        const response = await adminAPI.resetUserPassword(userId);
        toast.success(
          `Password reset successfully! New password: ${response.data.password}`,
          { duration: 8000 }
        );
      } catch (error) {
        console.error('Failed to reset password:', error);
        toast.error('Failed to reset password. Please try again.');
      }
    }
  };

  const openViewModal = async (user) => {
    setViewModalOpen(true);
    setViewLoading(true);
    setViewedUser(null);
    try {
      const response = await adminAPI.getUser(user.id);
      setViewedUser(response.data);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to load user details. Please try again.');
      setViewModalOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewedUser(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-neutral-900">Manage Users</h2>
        <Button onClick={openAddModal}>
          <Plus className="h-5 w-5 mr-2" />
          Add User
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <Input
          icon={Search}
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
      </div>

      <Table>
        <thead>
          <tr>
            <Th>User</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {users.map((user) => (
            <tr key={user.id}>
              <Td className="whitespace-normal">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold mr-3 flex-shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{user.name}</p>
                    <p className="text-sm text-neutral-500">{user.phone}</p>
                  </div>
                </div>
              </Td>
              <Td className="text-neutral-500">{user.email}</Td>
              <Td>
                <select
                  value={user.role}
                  onChange={(e) => updateRole(user.id, e.target.value)}
                  className="text-sm border border-neutral-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="customer">Customer</option>
                </select>
              </Td>
              <Td>
                <select
                  value={user.status}
                  onChange={(e) => updateStatus(user.id, e.target.value)}
                  className="text-sm border border-neutral-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </Td>
              <Td className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openViewModal(user)}
                    title="View Details"
                    className="!px-2"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <button
                    onClick={() => openEditModal(user)}
                    className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 hover:text-primary-800"
                    title="Edit User"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => resetPassword(user.id, user.name)}
                    className="p-2 rounded-lg text-green-600 hover:bg-green-50 hover:text-green-800"
                    title="Reset Password"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {pagination.total > 0 && (
        <Pagination pagination={pagination} onPageChange={goToPage} onPerPageChange={setPerPage} itemLabel="users" />
      )}

      {/* Edit Modal */}
      <Modal
        open={editModal}
        onClose={closeEditModal}
        title={editingUser ? 'Edit User' : 'Add New User'}
        size="sm"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input
            label="Address"
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <Input
            label="City"
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="customer">Customer</option>
            </Select>
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </Select>
          </div>
          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="secondary" fullWidth onClick={closeEditModal}>
              Cancel
            </Button>
            <Button type="submit" fullWidth>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        open={viewModalOpen}
        onClose={closeViewModal}
        title={viewedUser ? viewedUser.name : 'User Details'}
        size="xl"
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={closeViewModal}>
              Close
            </Button>
          </div>
        }
      >
        {viewLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : viewedUser ? (
          <div className="space-y-6">
            {/* Profile summary */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 pb-4 border-b border-neutral-100">
              {viewedUser.avatar ? (
                <img
                  src={viewedUser.avatar}
                  alt={viewedUser.name}
                  className="h-16 w-16 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-display text-xl font-bold flex-shrink-0">
                  {(viewedUser.name || '?')
                    .split(' ')
                    .filter(Boolean)
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-display text-lg font-bold text-neutral-900">{viewedUser.name}</h4>
                  <Badge tone="primary">{viewedUser.role}</Badge>
                  <Badge status={viewedUser.status} />
                </div>
                {viewedUser.company_name && (
                  <p className="text-neutral-500 text-sm">{viewedUser.company_name}</p>
                )}
                <div className="mt-2 space-y-1 text-sm text-neutral-600">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    {viewedUser.email}
                  </div>
                  {viewedUser.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      {viewedUser.phone}
                    </div>
                  )}
                  {(viewedUser.address || viewedUser.city) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      {[viewedUser.address, viewedUser.city].filter(Boolean).join(', ')}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    Member since{' '}
                    {viewedUser.created_at
                      ? new Date(viewedUser.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'N/A'}
                  </div>
                </div>
                {viewedUser.bio && <p className="mt-2 text-sm text-neutral-600">{viewedUser.bio}</p>}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-3 py-2 text-center">
                <p className="text-lg font-bold text-neutral-900">{viewedUser.bookings_count ?? 0}</p>
                <p className="text-xs text-neutral-500">Bookings</p>
              </div>
              <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-3 py-2 text-center">
                <p className="text-lg font-bold text-neutral-900">{viewedUser.reviews_count ?? 0}</p>
                <p className="text-xs text-neutral-500">Reviews</p>
              </div>
              <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-3 py-2 text-center">
                <p className="text-lg font-bold text-neutral-900">{viewedUser.wishlists_count ?? 0}</p>
                <p className="text-xs text-neutral-500">Wishlist</p>
              </div>
              <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-3 py-2 text-center">
                <p className="text-lg font-bold text-neutral-900">{viewedUser.trip_plans_count ?? 0}</p>
                <p className="text-xs text-neutral-500">Trip Plans</p>
              </div>
            </div>

            {/* Bookings */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-semibold text-neutral-900">
                  Bookings <span className="text-neutral-400 font-normal">({viewedUser.bookings_count || 0})</span>
                </h5>
                <Button
                  as={Link}
                  to={`/admin/bookings?user_id=${viewedUser.id}&user_name=${encodeURIComponent(viewedUser.name)}`}
                  variant="ghost"
                  size="sm"
                >
                  View all bookings
                </Button>
              </div>
              {viewedUser.bookings?.length > 0 ? (
                <Table>
                  <thead>
                    <tr>
                      <Th>Booking #</Th>
                      <Th>Item</Th>
                      <Th>Date</Th>
                      <Th>Status</Th>
                      <Th>Amount</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {viewedUser.bookings.map((booking) => (
                      <tr key={booking.id}>
                        <Td className="font-medium text-neutral-900">{booking.booking_number}</Td>
                        <Td className="whitespace-normal">{booking.bookable?.name || 'N/A'}</Td>
                        <Td>
                          {booking.check_in_date
                            ? new Date(booking.check_in_date).toLocaleDateString()
                            : booking.activity_datetime
                            ? new Date(booking.activity_datetime).toLocaleDateString()
                            : 'N/A'}
                        </Td>
                        <Td><Badge status={booking.status} /></Td>
                        <Td>${booking.total_amount}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-sm text-neutral-500 italic">No bookings yet</p>
              )}
            </div>

            {/* Reviews */}
            <div>
              <h5 className="font-semibold text-neutral-900 mb-2">
                Reviews <span className="text-neutral-400 font-normal">({viewedUser.reviews_count || 0})</span>
              </h5>
              {viewedUser.reviews?.length > 0 ? (
                <div className="space-y-2">
                  {viewedUser.reviews.map((review) => (
                    <div key={review.id} className="rounded-xl border border-neutral-100 px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <RatingStars rating={review.rating} showValue={false} />
                          <span className="text-sm font-medium text-neutral-900">{review.reviewable?.name || 'N/A'}</span>
                        </div>
                        <Badge status={review.status} />
                      </div>
                      {review.comment && (
                        <p className="mt-1 text-sm text-neutral-600 line-clamp-2">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500 italic">No reviews yet</p>
              )}
            </div>

            {/* Wishlist */}
            <div>
              <h5 className="font-semibold text-neutral-900 mb-2">
                Wishlist <span className="text-neutral-400 font-normal">({viewedUser.wishlists_count || 0})</span>
              </h5>
              {viewedUser.wishlists?.length > 0 ? (
                <div className="space-y-1">
                  {viewedUser.wishlists.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm border-b border-neutral-50 py-1.5">
                      <span className="text-neutral-800">{item.wishlistable?.name || 'N/A'}</span>
                      <span className="text-neutral-400">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500 italic">No wishlist items yet</p>
              )}
            </div>

            {/* Trip Plans */}
            <div>
              <h5 className="font-semibold text-neutral-900 mb-2">
                Trip Plans <span className="text-neutral-400 font-normal">({viewedUser.trip_plans_count || 0})</span>
              </h5>
              {viewedUser.trip_plans?.length > 0 ? (
                <div className="space-y-1">
                  {viewedUser.trip_plans.map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between text-sm border-b border-neutral-50 py-1.5">
                      <span className="text-neutral-800">{plan.title}</span>
                      <span className="text-neutral-500">{plan.duration_days} days · {plan.items_count} items</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500 italic">No trip plans yet</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default AdminUsers;
