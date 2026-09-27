import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Building2, Compass, Users as GuidesIcon, ArrowLeft } from 'lucide-react';
import { adminAPI } from '../services/api';
import useActingVendorStore from '../stores/actingVendorStore';
import SEO from '../components/SEO';
import { Container, Card, Input } from '../components/ui';

/**
 * Admin-only vendor picker for the Management System — choosing a vendor
 * here sets actingVendorStore, which every /vendor/* request then carries
 * as an X-Acting-Vendor-Id header (see services/api.js), and lands the
 * admin in that vendor's own panel (VendorLayout) exactly as if they were
 * that vendor.
 */
const SelectVendor = () => {
  const navigate = useNavigate();
  const { setActingVendor } = useActingVendorStore();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    adminAPI.getVendors()
      .then((res) => setVendors(res.data || []))
      .catch((err) => console.error('Error fetching vendors:', err))
      .finally(() => setLoading(false));
  }, []);

  const enterVendorPanel = (vendor) => {
    setActingVendor(vendor.id, vendor.company_name || vendor.name);
    navigate('/vendor');
  };

  const filtered = vendors.filter((v) =>
    (v.company_name || v.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Container className="max-w-4xl py-12">
      <SEO title="Choose a Vendor" noindex />

      <button
        onClick={() => navigate('/select-system')}
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="font-display text-2xl font-bold text-neutral-900 mb-1">Which business do you want to manage?</h1>
      <p className="text-neutral-600 mb-6">Choose a vendor to enter their Management System panel.</p>

      <Input
        placeholder="Search vendors..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-6"
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-neutral-500 py-16">No vendors found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((vendor) => (
            <Card
              key={vendor.id}
              hoverLift={false}
              className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-primary-300"
              onClick={() => enterVendorPanel(vendor)}
            >
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900 truncate">{vendor.company_name || vendor.name}</p>
                <p className="text-xs text-neutral-500">{vendor.email}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-neutral-500 shrink-0">
                <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {vendor.hotels_count ?? 0}</span>
                <span className="flex items-center gap-1"><Compass className="h-3.5 w-3.5" /> {vendor.activities_count ?? 0}</span>
                <span className="flex items-center gap-1"><GuidesIcon className="h-3.5 w-3.5" /> {vendor.tour_guides_count ?? 0}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
};

export default SelectVendor;
