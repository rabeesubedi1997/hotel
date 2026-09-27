import { useState, useEffect, useCallback } from 'react';
import { Check, X, Loader2, Building2, Compass, Users as GuidesIcon } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Button, Card, Badge, Modal, Textarea } from '../../components/ui';

const TABS = [
  { key: 'hotels', label: 'Hotels', icon: Building2 },
  { key: 'activities', label: 'Activities', icon: Compass },
  { key: 'tour_guides', label: 'Tour Guides', icon: GuidesIcon },
];

/**
 * A pending-listings approval queue for Hotels, Activities, and Tour
 * Guides — the backend endpoints (Admin\ApprovalController) already
 * existed and worked, but nothing in the admin frontend rendered them, so
 * vendor-submitted listings had no way to actually get approved through
 * the UI. One tabbed page covering all three, since they're identical in
 * shape (list pending, approve or reject with a reason).
 */
const AdminApprovals = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('hotels');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const fetchers = {
        hotels: adminAPI.getPendingHotels,
        activities: adminAPI.getPendingActivities,
        tour_guides: adminAPI.getPendingTourGuides,
      };
      const response = await fetchers[activeTab]();
      setItems(response.data || []);
    } catch (error) {
      console.error('Error fetching pending items', error);
      toast.error('Failed to load pending listings');
    } finally {
      setLoading(false);
    }
  }, [activeTab, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const decide = async (id, status, rejection_reason) => {
    setProcessingId(id);
    try {
      const approvers = {
        hotels: adminAPI.approveHotel,
        activities: adminAPI.approveActivity,
        tour_guides: adminAPI.approveTourGuideListing,
      };
      await approvers[activeTab](id, { status, rejection_reason });
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success(status === 'approved' ? 'Listing approved' : 'Listing rejected');
    } catch (error) {
      console.error('Error deciding on listing', error);
      toast.error(error.response?.data?.message || 'Failed to process decision');
    } finally {
      setProcessingId(null);
      setRejectTarget(null);
      setRejectReason('');
    }
  };

  const ownerName = (item) => item.user?.company_name || item.user?.name || item.vendor?.company_name || item.vendor?.name || 'Unknown vendor';
  const itemTitle = (item) => item.name || item.title;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-neutral-900">Pending Approvals</h2>
        <p className="text-neutral-500 mt-1">Vendor-submitted listings waiting for a decision before they go live.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
              activeTab === tab.key ? 'bg-primary-600 text-white shadow-sm' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : items.length === 0 ? (
        <Card hoverLift={false} className="text-center py-16">
          <p className="text-neutral-500">Nothing pending — all caught up.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} hoverLift={false} className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900 truncate">{itemTitle(item)}</p>
                <p className="text-xs text-neutral-500">Submitted by {ownerName(item)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tone="warning">Pending</Badge>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={processingId === item.id}
                  onClick={() => decide(item.id, 'approved')}
                >
                  <Check className="h-4 w-4" /> Approve
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={processingId === item.id}
                  onClick={() => setRejectTarget(item)}
                >
                  <X className="h-4 w-4" /> Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject listing">
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Rejecting <strong>{rejectTarget && itemTitle(rejectTarget)}</strong> — this reason is shown to the vendor.
          </p>
          <Textarea
            label="Rejection reason"
            rows={3}
            required
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              disabled={!rejectReason.trim() || processingId === rejectTarget?.id}
              onClick={() => decide(rejectTarget.id, 'rejected', rejectReason.trim())}
            >
              Confirm Reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminApprovals;
