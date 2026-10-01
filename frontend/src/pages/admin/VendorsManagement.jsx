import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Users, Phone, MapPin, RefreshCw, X, Copy, Loader2, Eye, Mail, Calendar, Link2, Unlink, Search } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { Button, Input, Textarea, Modal, Table, Th, Td, Badge, Pagination } from '../../components/ui';
import usePagination from '../../hooks/usePagination';

const AdminVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { pagination, applyResponse, goToPage, setPerPage, resetToFirstPage } = usePagination();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company_name: '',
  });
  const [lastCredentials, setLastCredentials] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewedVendor, setViewedVendor] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Linking an already-listed hotel/activity to a vendor — entirely
  // optional (a vendor can have zero listings, and a hotel/activity can
  // stay admin-managed forever), so this is a separate action from the
  // vendor form itself, not a required field on it.
  const [linkModal, setLinkModal] = useState(null); // 'hotel' | 'activity' | null
  const [linkOptions, setLinkOptions] = useState([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkingId, setLinkingId] = useState(null);

  // Same optional assignment, but offered right inside the Add/Edit Vendor
  // form itself — a checklist of existing hotels/activities to hand to
  // this vendor at creation time, or reconcile on edit.
  const [assignableHotels, setAssignableHotels] = useState([]);
  const [assignableActivities, setAssignableActivities] = useState([]);
  const [selectedHotelIds, setSelectedHotelIds] = useState([]);
  const [selectedActivityIds, setSelectedActivityIds] = useState([]);
  const [assignListsLoading, setAssignListsLoading] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

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
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, debouncedSearch]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getVendors({
        page: pagination.current_page,
        per_page: pagination.per_page,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      setVendors(response.data.data || []);
      applyResponse(response.data);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetches the full hotel/activity lists to check against for the Add/Edit
  // Vendor form's assignment checklist, and (when editing) pre-checks the
  // ones this vendor already owns.
  const loadAssignableListings = async (forVendorId = null) => {
    setAssignListsLoading(true);
    try {
      const [hotelsRes, activitiesRes] = await Promise.all([
        adminAPI.getHotels({ per_page: 100 }),
        adminAPI.getActivities({ per_page: 100 }),
      ]);
      const hotels = hotelsRes.data.data || [];
      const activities = activitiesRes.data.data || [];
      setAssignableHotels(hotels);
      setAssignableActivities(activities);
      setSelectedHotelIds(forVendorId ? hotels.filter((h) => h.user_id === forVendorId).map((h) => h.id) : []);
      setSelectedActivityIds(forVendorId ? activities.filter((a) => a.user_id === forVendorId).map((a) => a.id) : []);
    } catch (error) {
      console.error('Failed to fetch assignable listings:', error);
    } finally {
      setAssignListsLoading(false);
    }
  };

  const handleAddVendorClick = () => {
    setEditingVendor(null);
    setFormData({ name: '', email: '', phone: '', address: '', company_name: '' });
    setShowAddForm(true);
    loadAssignableListings(null);
  };

  const toggleSelected = (list, setList, id) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  // Reconciles the checklist against each listing's current owner: newly
  // checked ones get linked to the vendor, newly unchecked ones (that were
  // owned by this vendor) get unlinked. Runs after the vendor itself is
  // created/updated, since a brand-new vendor's id isn't known until then.
  const reconcileAssignments = async (vendorId) => {
    const hotelJobs = assignableHotels
      .filter((h) => {
        const shouldOwn = selectedHotelIds.includes(h.id);
        const currentlyOwns = h.user_id === vendorId;
        return shouldOwn !== currentlyOwns;
      })
      .map((h) => adminAPI.updateHotel(h.id, { user_id: selectedHotelIds.includes(h.id) ? vendorId : null }));

    const activityJobs = assignableActivities
      .filter((a) => {
        const shouldOwn = selectedActivityIds.includes(a.id);
        const currentlyOwns = a.user_id === vendorId;
        return shouldOwn !== currentlyOwns;
      })
      .map((a) => adminAPI.updateActivity(a.id, { user_id: selectedActivityIds.includes(a.id) ? vendorId : null }));

    await Promise.all([...hotelJobs, ...activityJobs]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let vendorId;
      if (editingVendor) {
        await adminAPI.updateVendor(editingVendor.id, formData);
        vendorId = editingVendor.id;
        toast.success('Vendor updated successfully!');
      } else {
        const response = await adminAPI.createVendor(formData);
        vendorId = response.data.vendor.id;

        // Store credentials for display
        const credentials = {
          email: response.data.vendor.email,
          password: response.data.password,
          name: response.data.vendor.name,
          createdAt: new Date().toLocaleString()
        };
        setLastCredentials(credentials);

        // Show success toast
        toast.success('Vendor created successfully! Credentials displayed below.');
      }

      if (selectedHotelIds.length > 0 || selectedActivityIds.length > 0 || editingVendor) {
        await reconcileAssignments(vendorId);
      }

      setFormData({ name: '', email: '', phone: '', address: '', company_name: '' });
      setSelectedHotelIds([]);
      setSelectedActivityIds([]);
      setShowAddForm(false);
      setEditingVendor(null);
      fetchVendors();
    } catch (error) {
      console.error('Failed to save vendor:', error);
      toast.error('Failed to save vendor. Please try again.');
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone || '',
      address: vendor.address || '',
      company_name: vendor.company_name || '',
    });
    setShowAddForm(true);
    loadAssignableListings(vendor.id);
  };

  const handleDelete = async (vendorId) => {
    if (window.confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
      try {
        await adminAPI.deleteVendor(vendorId);
        toast.success('Vendor deleted successfully!');
        fetchVendors();
      } catch (error) {
        console.error('Failed to delete vendor:', error);
        toast.error('Failed to delete vendor. Please try again.');
      }
    }
  };

  const resetPassword = async (vendorId, vendorName) => {
    if (window.confirm(`Are you sure you want to reset password for ${vendorName}? A new password will be generated.`)) {
      try {
        const response = await adminAPI.resetVendorPassword(vendorId);

        // Find the vendor to get their email
        const vendor = vendors.find(v => v.id === vendorId);

        // Store new credentials for display
        const credentials = {
          email: vendor ? vendor.email : vendorName,
          password: response.data.password,
          name: vendorName,
          createdAt: new Date().toLocaleString(),
          isReset: true
        };
        setLastCredentials(credentials);

        toast.success('Password reset successfully! New credentials displayed below.');
      } catch (error) {
        console.error('Failed to reset password:', error);
        toast.error('Failed to reset password. Please try again.');
      }
    }
  };

  const toggleVendorStatus = async (vendorId, status) => {
    try {
      await adminAPI.toggleVendorStatus(vendorId, { status });
      fetchVendors();
    } catch (error) {
      console.error('Failed to update vendor status:', error);
    }
  };

  const handleView = async (vendor) => {
    setViewModalOpen(true);
    setViewLoading(true);
    setViewedVendor(null);
    try {
      const response = await adminAPI.getVendor(vendor.id);
      setViewedVendor(response.data);
    } catch (error) {
      console.error('Failed to fetch vendor details:', error);
      toast.error('Failed to load vendor details. Please try again.');
      setViewModalOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewedVendor(null);
  };

  const fetchLinkOptions = async (type, search) => {
    setLinkLoading(true);
    try {
      const api = type === 'hotel' ? adminAPI.getHotels : adminAPI.getActivities;
      const response = await api({ search: search || undefined, per_page: 50 });
      setLinkOptions(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch link options:', error);
      toast.error('Failed to load listings');
    } finally {
      setLinkLoading(false);
    }
  };

  const openLinkModal = (type) => {
    setLinkModal(type);
    setLinkSearch('');
    fetchLinkOptions(type, '');
  };

  const closeLinkModal = () => {
    setLinkModal(null);
    setLinkOptions([]);
    setLinkSearch('');
  };

  const handleLinkSearchChange = (value) => {
    setLinkSearch(value);
    fetchLinkOptions(linkModal, value);
  };

  const refreshVendorView = async () => {
    if (!viewedVendor) return;
    const response = await adminAPI.getVendor(viewedVendor.id);
    setViewedVendor(response.data);
    fetchVendors();
  };

  const linkListing = async (type, id) => {
    setLinkingId(id);
    try {
      const api = type === 'hotel' ? adminAPI.updateHotel : adminAPI.updateActivity;
      await api(id, { user_id: viewedVendor.id });
      toast.success(`${type === 'hotel' ? 'Hotel' : 'Activity'} linked to this vendor!`);
      await refreshVendorView();
      fetchLinkOptions(linkModal, linkSearch);
    } catch (error) {
      console.error('Failed to link listing:', error);
      toast.error('Failed to link listing');
    } finally {
      setLinkingId(null);
    }
  };

  const unlinkListing = async (type, id) => {
    if (!window.confirm('Unlink this listing from the vendor? It will become admin-managed with no owner.')) return;
    setLinkingId(id);
    try {
      const api = type === 'hotel' ? adminAPI.updateHotel : adminAPI.updateActivity;
      await api(id, { user_id: null });
      toast.success('Listing unlinked.');
      await refreshVendorView();
    } catch (error) {
      console.error('Failed to unlink listing:', error);
      toast.error('Failed to unlink listing');
    } finally {
      setLinkingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-neutral-900">Vendor Management</h2>
          <p className="text-neutral-500 text-sm mt-1">Manage vendor accounts and permissions</p>
        </div>
        <Button onClick={handleAddVendorClick}>
          <Plus className="h-5 w-5 mr-2" />
          Add Vendor
        </Button>
      </div>

      {/* Add/Edit Form */}
      <Modal
        open={showAddForm}
        onClose={() => {
          setShowAddForm(false);
          setEditingVendor(null);
          setFormData({ name: '', email: '', phone: '', address: '', company_name: '' });
          setSelectedHotelIds([]);
          setSelectedActivityIds([]);
        }}
        title={editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name *"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Email Address *"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Phone Number"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input
            label="Company Name"
            type="text"
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
          />
          <Textarea
            label="Address"
            rows={3}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          {/* Assigning existing hotels/activities is entirely optional —
              a vendor can be created with none, and this list can be left
              untouched on edit too. */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Assign Hotels (optional)
            </label>
            {assignListsLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary-600" /></div>
            ) : (
              <div className="max-h-40 overflow-y-auto border border-neutral-200 rounded-xl divide-y divide-neutral-100">
                {assignableHotels.length === 0 ? (
                  <p className="text-sm text-neutral-500 p-3">No hotels exist yet.</p>
                ) : (
                  assignableHotels.map((hotel) => (
                    <label key={hotel.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-neutral-50">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedHotelIds.includes(hotel.id)}
                          onChange={() => toggleSelected(selectedHotelIds, setSelectedHotelIds, hotel.id)}
                        />
                        {hotel.name}
                      </span>
                      {hotel.user_id && hotel.user_id !== editingVendor?.id && (
                        <span className="text-xs text-amber-600">owned by {hotel.user?.company_name || hotel.user?.name}</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Assign Activities (optional)
            </label>
            {assignListsLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary-600" /></div>
            ) : (
              <div className="max-h-40 overflow-y-auto border border-neutral-200 rounded-xl divide-y divide-neutral-100">
                {assignableActivities.length === 0 ? (
                  <p className="text-sm text-neutral-500 p-3">No activities exist yet.</p>
                ) : (
                  assignableActivities.map((activity) => (
                    <label key={activity.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-neutral-50">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedActivityIds.includes(activity.id)}
                          onChange={() => toggleSelected(selectedActivityIds, setSelectedActivityIds, activity.id)}
                        />
                        {activity.name}
                      </span>
                      {activity.user_id && activity.user_id !== editingVendor?.id && (
                        <span className="text-xs text-amber-600">owned by {activity.user?.company_name || activity.user?.name}</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddForm(false);
                setEditingVendor(null);
                setFormData({ name: '', email: '', phone: '', address: '', company_name: '' });
                setSelectedHotelIds([]);
                setSelectedActivityIds([]);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingVendor ? 'Update' : 'Create Vendor'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Credentials Display */}
      {lastCredentials && (
        <div className="bg-primary-50 border border-primary-200 rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-primary-900">
              {lastCredentials.isReset ? 'Password Reset Successfully!' : 'Vendor Created Successfully!'}
            </h3>
            <button
              onClick={() => setLastCredentials(null)}
              className="text-primary-600 hover:text-primary-800"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="bg-white rounded-xl p-4 border border-primary-100">
            <h4 className="font-semibold text-neutral-900 mb-3">
              {lastCredentials.isReset ? 'Vendor New Login Credentials' : 'Vendor Login Credentials'}
            </h4>
            <div className="space-y-2">
              <div className="flex items-center flex-wrap gap-2">
                <span className="font-medium text-neutral-600 w-24">Email:</span>
                <span className="font-mono text-neutral-900 bg-neutral-100 px-3 py-1 rounded-lg">{lastCredentials.email}</span>
                <button
                  onClick={() => copyToClipboard(lastCredentials.email)}
                  className="p-1.5 text-primary-600 hover:text-primary-800 bg-primary-50 rounded-lg"
                  title="Copy email"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                <span className="font-medium text-neutral-600 w-24">Password:</span>
                <span className="font-mono text-neutral-900 bg-accent-50 px-3 py-1 rounded-lg text-lg font-bold">{lastCredentials.password}</span>
                <button
                  onClick={() => copyToClipboard(lastCredentials.password)}
                  className="p-1.5 text-primary-600 hover:text-primary-800 bg-primary-50 rounded-lg"
                  title="Copy password"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-neutral-600 w-24">Name:</span>
                <span className="text-neutral-900">{lastCredentials.name}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-neutral-600 w-24">Updated:</span>
                <span className="text-neutral-900">{lastCredentials.createdAt}</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> Save these credentials securely.
                The password will not be shown again. You can reset it anytime from the admin panel using the reset button.
              </p>
            </div>
          </div>
        </div>
      )}

      <Input
        icon={Search}
        type="text"
        placeholder="Search vendors by name, email, or company..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Vendors List */}
      {vendors.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-neutral-100 shadow-card">
          <Users className="mx-auto h-12 w-12 text-neutral-400" />
          <h3 className="mt-2 text-sm font-medium text-neutral-900">No vendors</h3>
          <p className="mt-1 text-sm text-neutral-500">Get started by adding your first vendor.</p>
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Vendor</Th>
              <Th>Contact</Th>
              <Th>Properties</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {vendors.map((vendor) => (
              <tr key={vendor.id}>
                <Td className="whitespace-normal">
                  <div className="font-medium text-neutral-900">{vendor.name}</div>
                  <div className="text-neutral-500">{vendor.company_name || 'No company'}</div>
                </Td>
                <Td className="whitespace-normal">
                  <div className="text-neutral-900">{vendor.email}</div>
                  {vendor.phone && (
                    <div className="text-neutral-500 flex items-center mt-1">
                      <Phone className="h-4 w-4 mr-1" />
                      {vendor.phone}
                    </div>
                  )}
                  {vendor.address && (
                    <div className="text-neutral-500 flex items-center mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {vendor.address}
                    </div>
                  )}
                </Td>
                <Td>
                  <div className="text-neutral-900">
                    <div>{vendor.hotels_count || 0} Hotels</div>
                    <div>{vendor.activities_count || 0} Activities</div>
                  </div>
                </Td>
                <Td>
                  <Badge status={vendor.status} />
                </Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!px-2"
                      onClick={() => handleView(vendor)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <button
                      onClick={() => handleEdit(vendor)}
                      className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 hover:text-primary-800"
                      title="Edit Vendor"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => resetPassword(vendor.id, vendor.name)}
                      className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
                      title="Reset Password"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleVendorStatus(vendor.id, vendor.status === 'active' ? 'inactive' : 'active')}
                      title={vendor.status === 'active' ? 'Deactivate' : 'Activate'}
                    >
                      {vendor.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                    <button
                      onClick={() => handleDelete(vendor.id)}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-800"
                      title="Delete Vendor"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {pagination.total > 0 && (
        <Pagination
          pagination={pagination}
          onPageChange={goToPage}
          onPerPageChange={setPerPage}
          itemLabel="vendors"
        />
      )}

      {/* View Details Modal */}
      <Modal
        open={viewModalOpen}
        onClose={closeViewModal}
        title={viewedVendor ? (viewedVendor.company_name || viewedVendor.name) : 'Vendor Details'}
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
        ) : viewedVendor ? (
          <div className="space-y-6">
            {/* Profile summary */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 pb-4 border-b border-neutral-100">
              {viewedVendor.avatar ? (
                <img
                  src={viewedVendor.avatar}
                  alt={viewedVendor.name}
                  className="h-16 w-16 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-display text-xl font-bold flex-shrink-0">
                  {(viewedVendor.name || '?')
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
                  <h4 className="font-display text-lg font-bold text-neutral-900">{viewedVendor.name}</h4>
                  <Badge status={viewedVendor.status} />
                </div>
                {viewedVendor.company_name && (
                  <p className="text-neutral-500 text-sm">{viewedVendor.company_name}</p>
                )}
                <div className="mt-2 space-y-1 text-sm text-neutral-600">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    {viewedVendor.email}
                  </div>
                  {viewedVendor.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      {viewedVendor.phone}
                    </div>
                  )}
                  {(viewedVendor.address || viewedVendor.city) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      {[viewedVendor.address, viewedVendor.city].filter(Boolean).join(', ')}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    Member since{' '}
                    {viewedVendor.created_at
                      ? new Date(viewedVendor.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'N/A'}
                  </div>
                </div>
                {viewedVendor.bio && <p className="mt-2 text-sm text-neutral-600">{viewedVendor.bio}</p>}
              </div>
            </div>

            {/* Hotels */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <h5 className="font-semibold text-neutral-900">
                  Hotels <span className="text-neutral-400 font-normal">({viewedVendor.hotels_count || 0})</span>
                </h5>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openLinkModal('hotel')}>
                    <Link2 className="h-4 w-4 mr-1" />
                    Link Existing Hotel
                  </Button>
                  <Button
                    as={Link}
                    to={`/admin/hotels?vendor_id=${viewedVendor.id}&vendor_name=${encodeURIComponent(viewedVendor.company_name || viewedVendor.name)}`}
                    variant="secondary"
                    size="sm"
                  >
                    Manage Hotels
                  </Button>
                </div>
              </div>
              {viewedVendor.hotels?.length > 0 ? (
                <Table>
                  <thead>
                    <tr>
                      <Th>Name</Th>
                      <Th>City</Th>
                      <Th>Price/Night</Th>
                      <Th>Status</Th>
                      <Th>Approval</Th>
                      <Th>Rooms</Th>
                      <Th>Bookings</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {viewedVendor.hotels.map((hotel) => (
                      <tr key={hotel.id}>
                        <Td className="whitespace-normal">
                          <Link to="/admin/hotels" className="text-primary-600 hover:text-primary-800 font-medium">
                            {hotel.name}
                          </Link>
                        </Td>
                        <Td>{hotel.city || 'N/A'}</Td>
                        <Td>{hotel.price_per_night != null ? `$${Number(hotel.price_per_night).toLocaleString()}` : 'N/A'}</Td>
                        <Td><Badge status={hotel.status} /></Td>
                        <Td><Badge status={hotel.approval_status} /></Td>
                        <Td>{hotel.rooms_count ?? 0}</Td>
                        <Td>{hotel.bookings_count ?? 0}</Td>
                        <Td className="text-right">
                          <button
                            onClick={() => unlinkListing('hotel', hotel.id)}
                            disabled={linkingId === hotel.id}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40"
                            title="Unlink from this vendor"
                          >
                            <Unlink className="h-4 w-4" />
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-sm text-neutral-500 italic">No hotels yet</p>
              )}
            </div>

            {/* Activities */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <h5 className="font-semibold text-neutral-900">
                  Activities <span className="text-neutral-400 font-normal">({viewedVendor.activities_count || 0})</span>
                </h5>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openLinkModal('activity')}>
                    <Link2 className="h-4 w-4 mr-1" />
                    Link Existing Activity
                  </Button>
                  <Button
                    as={Link}
                    to={`/admin/activities?vendor_id=${viewedVendor.id}&vendor_name=${encodeURIComponent(viewedVendor.company_name || viewedVendor.name)}`}
                    variant="secondary"
                    size="sm"
                  >
                    Manage Activities
                  </Button>
                </div>
              </div>
              {viewedVendor.activities?.length > 0 ? (
                <Table>
                  <thead>
                    <tr>
                      <Th>Name</Th>
                      <Th>City</Th>
                      <Th>Price</Th>
                      <Th>Status</Th>
                      <Th>Approval</Th>
                      <Th>Bookings</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {viewedVendor.activities.map((activity) => (
                      <tr key={activity.id}>
                        <Td className="whitespace-normal">
                          <Link to="/admin/activities" className="text-primary-600 hover:text-primary-800 font-medium">
                            {activity.name}
                          </Link>
                        </Td>
                        <Td>{activity.city || 'N/A'}</Td>
                        <Td>{activity.price != null ? `$${Number(activity.price).toLocaleString()}` : 'N/A'}</Td>
                        <Td><Badge status={activity.status} /></Td>
                        <Td><Badge status={activity.approval_status} /></Td>
                        <Td>{activity.bookings_count ?? 0}</Td>
                        <Td className="text-right">
                          <button
                            onClick={() => unlinkListing('activity', activity.id)}
                            disabled={linkingId === activity.id}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40"
                            title="Unlink from this vendor"
                          >
                            <Unlink className="h-4 w-4" />
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-sm text-neutral-500 italic">No activities yet</p>
              )}
            </div>

            {/* Tour Guides */}
            <div>
              <h5 className="font-semibold text-neutral-900 mb-2">
                Tour Guides <span className="text-neutral-400 font-normal">({viewedVendor.tour_guides_count || 0})</span>
              </h5>
              {viewedVendor.tour_guides?.length > 0 ? (
                <Table>
                  <thead>
                    <tr>
                      <Th>Name</Th>
                      <Th>Role</Th>
                      <Th>Rating</Th>
                      <Th>Bookings</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {viewedVendor.tour_guides.map((guide) => (
                      <tr key={guide.id}>
                        <Td className="whitespace-normal">
                          <Link to="/admin/tour-guides" className="text-primary-600 hover:text-primary-800 font-medium">
                            {guide.name}
                          </Link>
                        </Td>
                        <Td>{guide.role || 'N/A'}</Td>
                        <Td>{guide.rating ?? 'N/A'}</Td>
                        <Td>{guide.bookings_count ?? 0}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-sm text-neutral-500 italic">No tour guides yet</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Link Existing Hotel/Activity Modal */}
      <Modal
        open={!!linkModal}
        onClose={closeLinkModal}
        title={`Link Existing ${linkModal === 'hotel' ? 'Hotel' : 'Activity'}`}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            icon={Search}
            type="text"
            placeholder={`Search ${linkModal === 'hotel' ? 'hotels' : 'activities'}...`}
            value={linkSearch}
            onChange={(e) => handleLinkSearchChange(e.target.value)}
          />
          {linkLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-neutral-100">
              {linkOptions.length === 0 ? (
                <p className="text-center text-sm text-neutral-500 py-8">No listings found.</p>
              ) : (
                linkOptions.map((item) => {
                  const alreadyLinked = item.user_id === viewedVendor?.id;
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{item.name}</p>
                        <p className="text-xs text-neutral-500">
                          {item.city}
                          {item.user ? ` — currently: ${item.user.company_name || item.user.name}` : ' — admin-managed, no vendor'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyLinked ? 'secondary' : 'primary'}
                        disabled={alreadyLinked || linkingId === item.id}
                        onClick={() => linkListing(linkModal, item.id)}
                      >
                        {alreadyLinked ? 'Linked' : 'Link'}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AdminVendors;
