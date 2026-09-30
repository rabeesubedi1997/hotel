import { useState } from 'react';
import { Button, Input, Modal, Select } from '../../../../components/ui';
import { vendorAPI } from '../../../../services/api';
import { useRestaurant } from '../context/RestaurantContext';
import { emptyTableForm } from '../constants';

/**
 * Add/Edit table form — extracted verbatim from the old Restaurant.jsx
 * monolith.
 */
const TableFormModal = ({ open, editingTable, onClose }) => {
  const { ownerType, ownerId, tables, setTables, toast } = useRestaurant();
  const [tableFormData, setTableFormData] = useState(() => toFormData(editingTable));
  const [saving, setSaving] = useState(false);

  const [lastEditingId, setLastEditingId] = useState(editingTable?.id ?? null);
  if (open && editingTable?.id !== lastEditingId) {
    setLastEditingId(editingTable?.id ?? null);
    setTableFormData(toFormData(editingTable));
  }

  const close = () => {
    onClose();
    setTableFormData(emptyTableForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTable) {
        const response = await vendorAPI.updateTable(editingTable.id, tableFormData);
        setTables((prev) => prev.map((t) => (t.id === editingTable.id ? response.data.table : t)));
        toast.success('Table updated!');
      } else {
        const response = await vendorAPI.createTable(ownerType, ownerId, tableFormData);
        setTables((prev) => [...prev, response.data.table]);
        toast.success('Table added!');
      }
      close();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save table');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title={editingTable ? 'Edit Table' : 'Add Table'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Table Number"
          type="text"
          required
          value={tableFormData.table_number}
          onChange={(e) => setTableFormData({ ...tableFormData, table_number: e.target.value })}
        />
        <Input
          label="Section"
          type="text"
          list="table-sections"
          placeholder="e.g. Main Dining, Patio, Bar"
          value={tableFormData.section}
          onChange={(e) => setTableFormData({ ...tableFormData, section: e.target.value })}
        />
        <datalist id="table-sections">
          {Array.from(new Set(tables.map((t) => t.section).filter(Boolean))).map((section) => (
            <option key={section} value={section} />
          ))}
        </datalist>
        <Input
          label="Capacity"
          type="number"
          required
          min="1"
          value={tableFormData.capacity}
          onChange={(e) => setTableFormData({ ...tableFormData, capacity: e.target.value })}
        />
        {editingTable && (
          <Select
            label="Status"
            value={tableFormData.status}
            onChange={(e) => setTableFormData({ ...tableFormData, status: e.target.value })}
          >
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="reserved">Reserved</option>
          </Select>
        )}
        <div className="flex space-x-3 pt-4">
          <Button type="button" variant="secondary" fullWidth disabled={saving} onClick={close}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={saving}>
            {editingTable ? 'Update Table' : 'Add Table'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const toFormData = (table) => table
  ? {
      table_number: table.table_number || '',
      section: table.section || '',
      capacity: table.capacity ?? 2,
      status: table.status || 'available',
    }
  : emptyTableForm;

export default TableFormModal;
