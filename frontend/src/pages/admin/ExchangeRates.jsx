import { useState, useEffect } from 'react';
import { DollarSign, Loader2, Save, Trash2 } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { Button, Input, Card } from '../../components/ui';

const COMMON_CURRENCIES = ['NPR', 'EUR', 'GBP', 'INR', 'AUD', 'MYR'];

const AdminExchangeRates = () => {
  const [rates, setRates] = useState([]);
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [newCurrency, setNewCurrency] = useState('');
  const [newRate, setNewRate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      const response = await adminAPI.getExchangeRates();
      setRates(response.data.rates || []);
      setBaseCurrency(response.data.base_currency || 'USD');
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRate = async (targetCurrency, rate) => {
    if (!targetCurrency || !rate) return;
    setSaving(true);
    try {
      const response = await adminAPI.updateExchangeRate({ target_currency: targetCurrency, rate: parseFloat(rate) });
      setRates((prev) => {
        const others = prev.filter((r) => r.target_currency !== targetCurrency);
        return [...others, response.data.rate];
      });
      toast.success(`${targetCurrency} rate saved`);
      setNewCurrency('');
      setNewRate('');
    } catch (error) {
      console.error('Error saving exchange rate:', error);
      toast.error(error.response?.data?.message || 'Failed to save rate');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rateRecord) => {
    if (!window.confirm(`Remove ${rateRecord.target_currency} from the currency selector?`)) return;
    try {
      await adminAPI.deleteExchangeRate(rateRecord.id);
      setRates((prev) => prev.filter((r) => r.id !== rateRecord.id));
      toast.success('Rate removed');
    } catch (error) {
      console.error('Error deleting exchange rate:', error);
      toast.error('Failed to remove rate');
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
      <div>
        <h2 className="text-2xl font-bold font-display text-neutral-900 flex items-center">
          <DollarSign className="h-6 w-6 mr-2 text-primary-600" />
          Currency & Exchange Rates
        </h2>
        <p className="text-neutral-500 mt-1">
          Prices are entered and stored in <strong>{baseCurrency}</strong> everywhere in the app. These rates only control the
          display-time conversion shown to visitors who pick a different currency in the header — nothing about how bookings are charged changes.
        </p>
      </div>

      <Card hoverLift={false} className="p-6">
        <h3 className="font-semibold text-neutral-900 mb-4">Active Currencies</h3>
        {rates.length === 0 ? (
          <p className="text-sm text-neutral-500 mb-4">No additional currencies configured yet — only {baseCurrency} is shown to visitors.</p>
        ) : (
          <div className="space-y-3 mb-4">
            {rates.map((r) => (
              <div key={r.id} className="flex items-center gap-3">
                <span className="w-16 font-mono font-semibold text-neutral-700">{r.target_currency}</span>
                <Input
                  type="number"
                  min="0"
                  step="0.000001"
                  defaultValue={r.rate}
                  onBlur={(e) => e.target.value !== String(r.rate) && handleSaveRate(r.target_currency, e.target.value)}
                  className="flex-1 max-w-xs"
                />
                <span className="text-xs text-neutral-500">{baseCurrency} 1 = {r.target_currency} {r.rate}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(r)}
                  className="ml-auto p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Remove currency"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-neutral-100">
          <h4 className="text-sm font-semibold text-neutral-700 mb-3">Add a currency</h4>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={newCurrency}
              onChange={(e) => setNewCurrency(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-xl text-sm"
            >
              <option value="">Select currency...</option>
              {COMMON_CURRENCIES.filter((c) => !rates.some((r) => r.target_currency === c)).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Input
              type="number"
              min="0"
              step="0.000001"
              placeholder={`${baseCurrency} 1 = ? ${newCurrency || 'XXX'}`}
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              className="max-w-xs"
            />
            <Button
              type="button"
              onClick={() => handleSaveRate(newCurrency, newRate)}
              disabled={saving || !newCurrency || !newRate}
              loading={saving}
            >
              <Save className="h-4 w-4" />
              Save Rate
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminExchangeRates;
