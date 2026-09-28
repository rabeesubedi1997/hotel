import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Building2, Compass, Users as GuidesIcon, ArrowLeft, Search, ChevronRight, Store } from 'lucide-react';
import { adminAPI } from '../services/api';
import useActingVendorStore from '../stores/actingVendorStore';
import SEO from '../components/SEO';
import { Container, Input } from '../components/ui';

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
    <div className="min-h-screen bg-neutral-50">
      <SEO title="Choose a Vendor" noindex />

      <Container className="max-w-4xl py-10 sm:py-14">
        <button
          onClick={() => navigate('/select-system')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900 mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to system chooser
        </button>

        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-secondary-100 text-secondary-700 flex items-center justify-center shrink-0">
            <Store className="h-5 w-5" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900">Which business do you want to manage?</h1>
        </div>
        <p className="text-neutral-500 mb-6 ml-[52px]">Choose a vendor to enter their Management System panel.</p>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
          <Input
            placeholder="Search vendors by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-neutral-200">
            <Store className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500">No vendors found{search ? ` matching "${search}"` : ''}.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((vendor) => {
              const label = vendor.company_name || vendor.name || '?';
              return (
                <button
                  key={vendor.id}
                  type="button"
                  onClick={() => enterVendorPanel(vendor)}
                  className="group flex items-center gap-4 bg-white rounded-2xl border border-neutral-200 p-4 text-left
                    shadow-sm transition-all duration-200 hover:border-secondary-300 hover:shadow-md"
                >
                  <div className="h-11 w-11 rounded-full bg-secondary-100 text-secondary-700 font-display font-semibold flex items-center justify-center shrink-0 text-lg">
                    {label.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-neutral-900 truncate">{label}</p>
                    <p className="text-xs text-neutral-500 truncate">{vendor.email}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs text-neutral-500 shrink-0">
                    <span className="flex items-center gap-1.5 bg-neutral-50 rounded-full px-2.5 py-1">
                      <Building2 className="h-3.5 w-3.5" /> {vendor.hotels_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1.5 bg-neutral-50 rounded-full px-2.5 py-1">
                      <Compass className="h-3.5 w-3.5" /> {vendor.activities_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1.5 bg-neutral-50 rounded-full px-2.5 py-1">
                      <GuidesIcon className="h-3.5 w-3.5" /> {vendor.tour_guides_count ?? 0}
                    </span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-neutral-300 group-hover:text-secondary-500 shrink-0 transition-colors" />
                </button>
              );
            })}
          </div>
        )}
      </Container>
    </div>
  );
};

export default SelectVendor;
