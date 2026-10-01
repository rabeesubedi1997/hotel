import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Upload } from 'lucide-react';
import { Button, Modal } from '../../../../components/ui';
import { vendorAPI } from '../../../../services/api';
import { useRestaurant } from '../context/RestaurantContext';

const TEMPLATE_HEADER = [
  'name', 'category', 'sku', 'price', 'cost_price',
  'stock_quantity', 'low_stock_threshold', 'station', 'description', 'image', 'allergens', 'available',
];

const TEMPLATE_SAMPLE_ROWS = [
  ['Chicken Momo', 'Appetizers', 'MOMO-CHK', '8.99', '3.50', '40', '10', 'kitchen', 'Steamed dumplings with chicken filling', '', 'gluten', 'yes'],
  ['House Lager', 'Beverages', 'BEV-LAGER', '5.00', '1.80', '120', '24', 'bar', '', '', '', 'yes'],
];

/**
 * Bulk add/restock menu items from a CSV — the upload counterpart to the
 * existing client-side "Export CSV" button. A row's `sku` is the match key:
 * present + matches an existing item for this owner -> that item is updated
 * (price/stock/etc.); otherwise a new item is created. `category` is plain
 * text here too, same as the Add/Edit Menu Item form.
 */
const ImportMenuModal = ({ open, onClose }) => {
  const { ownerType, ownerId, owner, setMenuItems, loadAll, toast } = useRestaurant();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleClose = () => {
    setSelectedFile(null);
    setResult(null);
    onClose();
  };

  const downloadTemplate = () => {
    const escapeCsv = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [TEMPLATE_HEADER, ...TEMPLATE_SAMPLE_ROWS].map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'menu-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e) => {
    setResult(null);
    setSelectedFile(e.target.files?.[0] || null);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setResult(null);
    try {
      const response = await vendorAPI.importMenuItems(ownerType, ownerId, selectedFile);
      setResult(response.data);
      setMenuItems(response.data.items || []);
      // Picks up any new free-text categories introduced by the import so
      // the category filter pills reflect them immediately.
      loadAll();
      if (response.data.errors?.length === 0) {
        toast.success(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import Menu Items" size="md">
      <div className="space-y-5">
        <div>
          <p className="text-sm text-neutral-600 mb-3">
            Add or restock menu items in bulk from a CSV file. Download the template, fill it in,
            then upload it below.
          </p>
          <Button size="sm" variant="secondary" onClick={downloadTemplate}>
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        </div>

        <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 text-xs text-neutral-500 space-y-1">
          <p><strong className="text-neutral-700">name, category, price</strong> are required for every row.</p>
          <p><strong className="text-neutral-700">sku</strong> is optional but matches an existing item for {owner?.name || 'this property'} — if it matches, that item is updated (including stock) instead of a duplicate being created.</p>
          <p><strong className="text-neutral-700">allergens</strong> can list multiple values separated by semicolons, e.g. <code>gluten; dairy</code>.</p>
          <p><strong className="text-neutral-700">available</strong> accepts yes/no (defaults to yes if left blank). Leave <strong className="text-neutral-700">stock_quantity</strong> blank if this item&apos;s stock isn&apos;t tracked.</p>
          <p><strong className="text-neutral-700">image</strong> is an optional photo URL. On a row that updates an existing item (matched by sku), leaving it blank clears that item&apos;s current photo too — leave the column filled with its existing URL if you want to keep it.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Upload filled-in CSV</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-neutral-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
        </div>

        {result && (
          <div className="rounded-xl bg-primary-50 border border-primary-100 p-3 text-sm text-primary-800 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{result.message}</span>
          </div>
        )}

        {result?.errors?.length > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 max-h-48 overflow-y-auto">
            <div className="flex items-center gap-2 font-medium mb-2">
              <AlertTriangle className="h-4 w-4" />
              {result.errors.length} row(s) skipped
            </div>
            <ul className="space-y-1 text-xs">
              {result.errors.map((e) => (
                <li key={e.row}>Row {e.row}: {e.errors.join(' ')}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={handleClose}>Close</Button>
          <Button size="sm" onClick={handleImport} loading={importing} disabled={!selectedFile}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ImportMenuModal;
