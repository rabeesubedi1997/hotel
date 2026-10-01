import { useEffect, useState } from 'react';
import { Award, Loader2, Search, Settings2 } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { Button, Input, Table, Th, Td, Modal, Textarea, Pagination } from '../../components/ui';
import usePagination from '../../hooks/usePagination';

const AdminLoyalty = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [adjustModal, setAdjustModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { pagination, applyResponse, goToPage, setPerPage, resetToFirstPage } = usePagination();

  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, appliedSearch]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getLoyaltyAccounts({
        page: pagination.current_page,
        per_page: pagination.per_page,
        ...(appliedSearch ? { search: appliedSearch } : {}),
      });
      setAccounts(response.data.data || []);
      applyResponse(response.data);
    } catch (error) {
      console.error('Error fetching loyalty accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    resetToFirstPage();
    setAppliedSearch(search);
  };

  const openAdjustModal = (account) => {
    setSelectedAccount(account);
    setAdjustPoints('');
    setAdjustNote('');
    setAdjustModal(true);
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await adminAPI.adjustLoyaltyPoints(selectedAccount.user.id, {
        points: parseInt(adjustPoints, 10),
        note: adjustNote,
      });
      setAccounts((prev) => prev.map((a) => (a.id === selectedAccount.id ? { ...a, points_balance: response.data.account.points_balance } : a)));
      toast.success('Points adjusted');
      setAdjustModal(false);
    } catch (error) {
      console.error('Error adjusting points:', error);
      toast.error(error.response?.data?.message || 'Failed to adjust points');
    } finally {
      setSaving(false);
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
      <h2 className="text-2xl font-bold font-display text-neutral-900 flex items-center">
        <Award className="h-6 w-6 mr-2 text-primary-600" />
        Loyalty Accounts
      </h2>

      <form onSubmit={handleSearch} className="flex gap-3">
        <Input
          icon={Search}
          placeholder="Search by customer name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      <Table>
        <thead>
          <tr>
            <Th>Customer</Th>
            <Th>Balance</Th>
            <Th>Lifetime Earned</Th>
            <Th>Lifetime Redeemed</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {accounts.map((account) => (
            <tr key={account.id}>
              <Td>
                <div className="text-sm font-medium text-neutral-900">{account.user?.name}</div>
                <div className="text-xs text-neutral-500">{account.user?.email}</div>
              </Td>
              <Td className="font-bold text-primary-600">{account.points_balance} pts</Td>
              <Td className="text-neutral-600">{account.lifetime_points_earned}</Td>
              <Td className="text-neutral-600">{account.lifetime_points_redeemed}</Td>
              <Td className="text-right">
                <Button variant="ghost" size="sm" onClick={() => openAdjustModal(account)}>
                  <Settings2 className="h-4 w-4 mr-1" /> Adjust
                </Button>
              </Td>
            </tr>
          ))}
          {accounts.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 sm:px-6 py-8 text-center text-sm text-neutral-500">
                No loyalty accounts found.
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      {pagination.total > 0 && (
        <Pagination pagination={pagination} onPageChange={goToPage} onPerPageChange={setPerPage} itemLabel="loyalty accounts" />
      )}

      <Modal open={adjustModal} onClose={() => setAdjustModal(false)} title="Adjust Points" size="md">
        <form onSubmit={handleAdjust} className="space-y-4">
          <p className="text-sm text-neutral-600">
            Adjusting balance for <strong>{selectedAccount?.user?.name}</strong> (currently {selectedAccount?.points_balance} pts).
          </p>
          <Input
            label="Points (use a negative number to deduct)"
            type="number"
            required
            value={adjustPoints}
            onChange={(e) => setAdjustPoints(e.target.value)}
            placeholder="e.g. 500 or -200"
          />
          <Textarea
            label="Reason"
            required
            rows={2}
            value={adjustNote}
            onChange={(e) => setAdjustNote(e.target.value)}
            placeholder="e.g. Goodwill gesture for a service issue"
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit" fullWidth loading={saving} disabled={saving}>
              Save Adjustment
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={() => setAdjustModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminLoyalty;
