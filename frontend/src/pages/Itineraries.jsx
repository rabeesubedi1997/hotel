import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, ChevronLeft, ChevronRight, Compass } from 'lucide-react';
import { itinerariesAPI } from '../services/api';
import SEO from '../components/SEO';
import ItineraryCard from '../components/ItineraryCard';
import { Button, Container } from '../components/ui';

// Duration-based tabs — a real, derivable grouping (there's no separate
// category field on Itinerary itself). Filters the already-fetched page
// client-side rather than adding unbacked server filters.
const DURATION_TABS = [
  { key: 'all', label: 'All Itineraries', test: () => true },
  { key: 'short', label: 'Short Escapes (1-4 Days)', test: (d) => d >= 1 && d <= 4 },
  { key: 'multi', label: 'Multi-Day (5-9 Days)', test: (d) => d >= 5 && d <= 9 },
  { key: 'grand', label: 'Grand Adventures (10+ Days)', test: (d) => d >= 10 },
];

const Itineraries = () => {
  // Pre-filled from the hero SearchWidget's Packages tab, e.g.
  // /itineraries?search=Everest&duration=multi
  const [searchParams] = useSearchParams();
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [durationTab, setDurationTab] = useState(searchParams.get('duration') || 'all');
  const [search] = useState(searchParams.get('search') || '');
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 12,
    total: 0,
  });

  useEffect(() => {
    fetchItineraries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page]);

  const fetchItineraries = async () => {
    setLoading(true);
    try {
      const response = await itinerariesAPI.getAll({
        page: pagination.current_page,
        per_page: pagination.per_page,
        ...(search ? { search } : {}),
      });
      setItineraries(response.data.data || []);
      setPagination({
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        per_page: response.data.per_page,
        total: response.data.total,
      });
    } catch (error) {
      console.error('Error fetching itineraries:', error);
      setItineraries([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.last_page) {
      setPagination((prev) => ({ ...prev, current_page: page }));
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const { current_page, last_page } = pagination;
    for (let i = Math.max(1, current_page - 2); i <= Math.min(last_page, current_page + 2); i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-8">
      <SEO
        title="Holiday Packages"
        description="Browse ready-made, day-by-day Nepal holiday packages combining hotels, activities, and tour guides into one seamless trip."
        keywords="Nepal holiday packages, Nepal itinerary, Nepal trip planner, curated Nepal tours, multi-day Nepal trips"
        canonical="/itineraries"
      />

      {/* Hero Section */}
      <div className="relative bg-neutral-900 py-14 sm:py-20 overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-primary-500/20 blur-3xl pointer-events-none" />
        <Container className="relative text-center text-white">
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            Holiday Packages
          </h1>
          <p className="text-lg sm:text-xl max-w-2xl mx-auto text-neutral-200">
            Ready-made Nepal trips — day-by-day packages combining the best hotels, activities, and guides
          </p>
          {pagination.total > 0 && (
            <div className="mt-8">
              <span className="font-display text-2xl sm:text-3xl font-bold text-primary-300 block">{pagination.total}</span>
              <span className="text-xs sm:text-sm text-neutral-300 uppercase tracking-wide">Holiday Packages</span>
            </div>
          )}
        </Container>
      </div>

      <Container className="pt-10">
        {/* Duration tabs — client-side filter over the current page */}
        {!loading && itineraries.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-6 scrollbar-hide">
            {DURATION_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setDurationTab(tab.key)}
                className={`px-4 py-2 rounded-full font-label-md text-label-md whitespace-nowrap transition-all ${
                  durationTab === tab.key ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : itineraries.length === 0 ? (
          <div className="text-center py-20">
            <Compass className="h-16 w-16 mx-auto text-neutral-300 mb-4" />
            <h2 className="font-display text-xl font-bold text-neutral-900 mb-2">
              No itineraries yet
            </h2>
            <p className="text-neutral-500 max-w-md mx-auto">
              We're putting together curated, day-by-day trips across Nepal. Check back soon — or browse our hotels, activities and tour guides in the meantime.
            </p>
          </div>
        ) : (
          <>
            {/* Holiday Packages — destination-grid cards */}
            {(() => {
              const activeTab = DURATION_TABS.find((t) => t.key === durationTab) || DURATION_TABS[0];
              const filtered = itineraries.filter((it) => activeTab.test(it.duration_days || 0));
              if (filtered.length === 0) {
                return (
                  <div className="text-center py-16 text-neutral-500">
                    No packages in this duration range on the current page.
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                  {filtered.map((itinerary) => (
                    <ItineraryCard key={itinerary.id} itinerary={itinerary} />
                  ))}
                </div>
              );
            })()}

            {/* Pagination */}
            {pagination.last_page > 1 && (
              <div className="flex justify-center items-center mt-10 gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {getPageNumbers().map((page) => (
                  <Button
                    key={page}
                    variant={page === pagination.current_page ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className="!px-4"
                  >
                    {page}
                  </Button>
                ))}

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={pagination.current_page === pagination.last_page}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </Container>
    </div>
  );
};

export default Itineraries;
