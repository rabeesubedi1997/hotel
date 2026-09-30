import { useEffect, useState } from 'react';
import { ChefHat, Trash2, UserPlus, UtensilsCrossed } from 'lucide-react';
import { Badge, Button, Modal, Select } from '../../../../components/ui';
import { vendorAPI } from '../../../../services/api';
import { useRestaurant } from '../context/RestaurantContext';

const ROLE_LABEL = { kitchen_staff: 'Kitchen', waiter: 'Waiter' };
const ROLE_ICON = { kitchen_staff: ChefHat, waiter: UtensilsCrossed };

/**
 * Grants an existing user department-scoped access to this hotel's/
 * activity's Restaurant POS — Kitchen (Display-only) or Waiter/Counter
 * (takes orders, manages tables, no per-item ticket control) — see
 * RoleSeeder. Without handing over the full vendor login. The user must
 * already have an account; this only scopes their access, it doesn't
 * create one.
 */
const StaffAccessModal = ({ open, onClose }) => {
  const { ownerType, ownerId, toast } = useRestaurant();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('waiter');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    vendorAPI.getRestaurantStaff(ownerType, ownerId)
      .then((res) => setStaff(res.data || []))
      .catch(() => toast.error('Failed to load staff'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ownerType, ownerId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    try {
      const response = await vendorAPI.addRestaurantStaff(ownerType, ownerId, { email: email.trim(), role });
      setStaff((prev) => [...prev.filter((s) => s.id !== response.data.staff.id), response.data.staff]);
      setEmail('');
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to grant access');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (member) => {
    if (!window.confirm(`Revoke access for ${member.user?.name || member.user?.email}?`)) return;
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
    <Modal open={open} onClose={onClose} title="Staff Access" size="md">
      <div className="space-y-4">
        <p className="text-sm text-neutral-500">
          Grant an existing user a department-scoped login for this Restaurant POS — <strong>Kitchen</strong> sees the
          Kitchen board and controls ticket/item status; <strong>Waiter</strong> takes orders, manages tables, and
          watches the Kitchen board, but doesn&apos;t control per-item cooking status. Neither gets Menu, Reports, or
          other bookings.
        </p>

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Staff member's account email..."
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-32 shrink-0">
            <option value="waiter">Waiter</option>
            <option value="kitchen_staff">Kitchen</option>
          </Select>
          <Button size="sm" type="submit" loading={adding} disabled={!email.trim()}>
            <UserPlus className="h-4 w-4" /> Grant
          </Button>
        </form>

        {loading ? (
          <p className="text-sm text-neutral-400 text-center py-4">Loading...</p>
        ) : staff.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-6">No staff granted access yet.</p>
        ) : (
          <div className="space-y-2">
            {staff.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 bg-neutral-50 rounded-xl px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{member.user?.name || 'Unknown'}</p>
                  <p className="text-xs text-neutral-500 truncate">{member.user?.email}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {(member.roles || []).map((slug) => {
                    const Icon = ROLE_ICON[slug];
                    return (
                      <Badge key={slug} tone="neutral" className="flex items-center gap-1">
                        {Icon && <Icon className="h-3 w-3" />} {ROLE_LABEL[slug] || slug}
                      </Badge>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => handleRemove(member)}
                    disabled={removingId === member.id}
                    className="text-red-500 hover:bg-red-50 rounded-lg p-1.5 disabled:opacity-40"
                    title="Revoke access"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default StaffAccessModal;
