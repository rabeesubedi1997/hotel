import { useState } from 'react';
import { Modal } from '../../../../components/ui';
import { vendorAPI } from '../../../../services/api';
import { useRestaurant } from '../context/RestaurantContext';

/**
 * Stock-deduction-timing toggle (on_order vs on_complete), per-vendor
 * setting — extracted verbatim from the old Restaurant.jsx monolith.
 */
const InventorySettingsModal = ({ open, onClose }) => {
  const { ownerType, ownerId, owner, setOwner, isApproved, toast } = useRestaurant();
  const [saving, setSaving] = useState(false);

  const updateStockDeductionMode = async (mode) => {
    setSaving(true);
    try {
      await vendorAPI.updateInventorySettings(ownerType, ownerId, { stock_deduction_mode: mode });
      setOwner((prev) => ({ ...prev, stock_deduction_mode: mode }));
      toast.success('Inventory settings updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update inventory settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Inventory Settings" size="md">
      <div className="space-y-3">
        <p className="text-sm text-neutral-500">Choose when stock gets deducted for tracked items.</p>
        {[
          {
            value: 'on_order',
            label: 'When the order is placed',
            hint: 'Default — stock is reserved the moment a ticket hits the kitchen. Cancelling an order restores it.',
          },
          {
            value: 'on_complete',
            label: 'When the order is completed',
            hint: "Stock isn't touched until the order is marked Complete. Cancelling before then has nothing to restore.",
          },
        ].map((option) => {
          const isActive = (owner?.stock_deduction_mode || 'on_order') === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={!isApproved || saving}
              onClick={() => updateStockDeductionMode(option.value)}
              className={`w-full text-left rounded-xl border p-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isActive ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isActive ? 'border-primary-600' : 'border-neutral-300'}`}>
                  {isActive && <span className="h-2 w-2 rounded-full bg-primary-600" />}
                </span>
                <span className="font-semibold text-neutral-900 text-sm">{option.label}</span>
              </div>
              <p className="text-xs text-neutral-500 mt-1 ml-6">{option.hint}</p>
            </button>
          );
        })}
      </div>
    </Modal>
  );
};

export default InventorySettingsModal;
