import { useEffect, useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { Button, Modal } from '../../../../components/ui';
import { vendorAPI } from '../../../../services/api';
import { useRestaurant } from '../context/RestaurantContext';

/**
 * Grants an existing user Kitchen Display-only access to this hotel's/
 * activity's Restaurant POS (the "Kitchen Staff" role — see RoleSeeder),
 * without handing over the full vendor login. The user must already have
 * an account; this only scopes their access, it doesn't create one.
 */
const KitchenStaffModal = ({ open, onClose }) => {
  const { ownerType, ownerId, toast } = useRestaurant();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    vendorAPI.getRestaurantStaff(ownerType, ownerId)
      .then((res) => setStaff(res.data || []))
      .catch(() => toast.error('Failed to load kitchen staff'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ownerType, ownerId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    try {
      const response = await vendorAPI.addRestaurantStaff(ownerType, ownerId, { email: email.trim() });
      setStaff((prev) => [...prev, response.data.staff]);
      setEmail('');
      toast.success('Kitchen access granted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to grant access');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (member) => {
    if (!window.confirm(`Revoke kitchen access for ${member.user?.name || member.user?.email}?`)) return;
    setRemovingId(member.id);
    try {
      await vendorAPI.removeRestaurantStaff(member.id);
      setStaff((prev) => prev.filter((s) => s.id !== member.id));
      toast.success('Access revoked');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to revoke access');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Kitchen Staff Access" size="md">
      <div className="space-y-4">
        <p className="text-sm text-neutral-500">
          Grant an existing user a Kitchen Display-only login for this Restaurant POS — they&apos;ll see tickets and
          can advance order/item status, but not Menu, Tables, Reports, or other bookings.
        </p>

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Staff member's account email..."
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button size="sm" type="submit" loading={adding} disabled={!email.trim()}>
            <UserPlus className="h-4 w-4" /> Grant
          </Button>
        </form>

        {loading ? (
          <p className="text-sm text-neutral-400 text-center py-4">Loading...</p>
        ) : staff.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-6">No kitchen staff granted access yet.</p>
        ) : (
          <div className="space-y-2">
            {staff.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 bg-neutral-50 rounded-xl px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{member.user?.name || 'Unknown'}</p>
                  <p className="text-xs text-neutral-500 truncate">{member.user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(member)}
                  disabled={removingId === member.id}
                  className="text-red-500 hover:bg-red-50 rounded-lg p-1.5 disabled:opacity-40 shrink-0"
                  title="Revoke access"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default KitchenStaffModal;
