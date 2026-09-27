import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, MapPin, User, Compass, Users as UsersIcon, ListChecks } from 'lucide-react';
import { publicAPI } from '../services/api';
import { getHotelImage, getActivityImage } from '../utils/images';
import SEO from '../components/SEO';
import { Card, Badge, RatingStars, Container, SectionHeading } from '../components/ui';

const VendorProfile = () => {
  const { slug } = useParams();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchVendor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const fetchVendor = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const response = await publicAPI.getVendorProfile(slug);
      setVendor(response.data);
    } catch (error) {
      console.error('Error fetching vendor profile:', error);
      setNotFound(true);
      setVendor(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (notFound || !vendor) {
    return (
      <Container className="py-24 text-center">
        <User className="h-16 w-16 mx-auto text-neutral-300 mb-4" />
        <h2 className="font-display text-2xl font-bold text-neutral-900 mb-2">Vendor not found</h2>
        <p className="text-neutral-500 mb-6">This vendor profile may be unpublished or no longer available.</p>
        <Link to="/" className="text-primary-600 hover:underline font-medium">
          Back to home
        </Link>
      </Container>
    );
  }

  const displayName = vendor.company_name || vendor.name;
  const memberSinceYear = vendor.member_since ? new Date(vendor.member_since).getFullYear() : null;
  const hotels = vendor.hotels || [];
  const activities = vendor.activities || [];
  const tourGuides = vendor.tour_guides || [];
  const listingsCount = vendor.listings_count || 0;

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      <SEO
        title={displayName}
        description={vendor.bio || `View listings from ${displayName}${vendor.city ? ` in ${vendor.city}` : ''}.`}
        keywords={`${displayName}, vendor, ${vendor.city || ''}`}
        canonical={`/vendors/${vendor.slug}`}
      />

      {/* Cover header */}
      <div className="relative w-full aspect-[21/9] sm:aspect-[3/1] bg-gradient-to-r from-primary-600 to-primary-800 overflow-hidden">
        {vendor.cover_image && (
          <img
            src={vendor.cover_image}
            alt={displayName}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      </div>

      <Container>
        <div className="relative -mt-12 sm:-mt-16 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 pb-6">
          <div className="h-24 w-24 sm:h-32 sm:w-32 shrink-0 rounded-full ring-4 ring-white bg-neutral-100 overflow-hidden shadow-card">
            {vendor.avatar ? (
              <img src={vendor.avatar} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-100">
                <User className="h-10 w-10 text-primary-400" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pb-1 sm:pb-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 truncate">
              {displayName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-neutral-500">
              {vendor.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {vendor.city}
                </span>
              )}
              {memberSinceYear && (
                <span>Member since {memberSinceYear}</span>
              )}
              <span className="inline-flex items-center gap-1">
                <ListChecks className="h-4 w-4" />
                {listingsCount} {listingsCount === 1 ? 'listing' : 'listings'}
              </span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {vendor.bio && (
          <div className="mb-10 max-w-3xl">
            <p className="text-neutral-600 leading-relaxed whitespace-pre-line">{vendor.bio}</p>
          </div>
        )}

        {/* Empty state */}
        {listingsCount === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl shadow-card border border-neutral-100">
            <Compass className="h-12 w-12 mx-auto text-neutral-300 mb-3" />
            <p className="text-neutral-500">This vendor doesn't have any published listings yet.</p>
          </div>
        ) : (
          <div className="space-y-14">
            {/* Hotels */}
            {hotels.length > 0 && (
              <section>
                <SectionHeading
                  title="Hotels"
                  align="left"
                  className="mb-6 max-w-none"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                  {hotels.map((hotel, index) => (
                    <Card key={hotel.id} as={Link} to={`/hotels/${hotel.slug}`} className="flex flex-col">
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img
                          src={hotel.featured_image || getHotelImage(index)}
                          alt={hotel.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        {hotel.star_rating && (
                          <Badge tone="neutral" className="absolute bottom-3 left-3 shadow-sm">
                            {hotel.star_rating} Star
                          </Badge>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex items-center text-neutral-500 text-xs mb-1.5">
                          <MapPin className="h-3.5 w-3.5 mr-1 shrink-0" />
                          <span className="truncate">{hotel.city}</span>
                        </div>
                        <h3 className="font-display text-base sm:text-lg font-bold text-neutral-900 group-hover:text-primary-600 transition mb-2 line-clamp-2">
                          {hotel.name}
                        </h3>
                        <div className="mb-3">
                          <RatingStars rating={hotel.rating || 0} />
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-3 border-t border-neutral-100">
                          <div>
                            <span className="text-lg font-bold text-primary-600">${hotel.price_per_night}</span>
                            <span className="text-xs text-neutral-500">/night</span>
                          </div>
                          <span className="text-sm font-semibold text-primary-600 group-hover:underline">View</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Activities */}
            {activities.length > 0 && (
              <section>
                <SectionHeading
                  title="Activities"
                  align="left"
                  className="mb-6 max-w-none"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                  {activities.map((activity) => (
                    <Card key={activity.id} as={Link} to={`/activities/${activity.slug}`} className="flex flex-col">
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img
                          src={activity.featured_image || getActivityImage(activity.type)}
                          alt={activity.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        {activity.type && (
                          <Badge tone="primary" className="absolute bottom-3 left-3 shadow-sm capitalize">
                            {String(activity.type).replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex items-center text-neutral-500 text-xs mb-1.5">
                          <MapPin className="h-3.5 w-3.5 mr-1 shrink-0" />
                          <span className="truncate">{activity.city}</span>
                        </div>
                        <h3 className="font-display text-base sm:text-lg font-bold text-neutral-900 group-hover:text-primary-600 transition mb-2 line-clamp-2">
                          {activity.name}
                        </h3>
                        <div className="flex items-center justify-between mb-3">
                          <RatingStars rating={activity.rating || 0} />
                          {activity.duration && (
                            <span className="text-xs text-neutral-500">{activity.duration}</span>
                          )}
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-3 border-t border-neutral-100">
                          <div>
                            <span className="text-lg font-bold text-primary-600">${activity.price}</span>
                          </div>
                          <span className="text-sm font-semibold text-primary-600 group-hover:underline">View</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Tour Guides */}
            {tourGuides.length > 0 && (
              <section>
                <SectionHeading
                  title="Tour Guides"
                  align="left"
                  className="mb-6 max-w-none"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                  {tourGuides.map((guide) => (
                    <Card key={guide.id} as={Link} to={`/tour-guides/${guide.slug}`} className="flex flex-col">
                      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
                        {guide.image ? (
                          <img
                            src={guide.image}
                            alt={guide.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UsersIcon className="h-10 w-10 text-neutral-300" />
                          </div>
                        )}
                        {guide.is_available_for_hire && (
                          <Badge tone="success" className="absolute bottom-3 left-3 shadow-sm">
                            Available for hire
                          </Badge>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        {guide.role && (
                          <div className="flex items-center text-neutral-500 text-xs mb-1.5">
                            <span className="truncate">{guide.role}</span>
                          </div>
                        )}
                        <h3 className="font-display text-base sm:text-lg font-bold text-neutral-900 group-hover:text-primary-600 transition mb-2 line-clamp-2">
                          {guide.name}
                        </h3>
                        <div className="mb-3">
                          <RatingStars rating={guide.rating || 0} />
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-3 border-t border-neutral-100">
                          <div>
                            <span className="text-lg font-bold text-primary-600">${guide.hire_price_per_day}</span>
                            <span className="text-xs text-neutral-500">/day</span>
                          </div>
                          <span className="text-sm font-semibold text-primary-600 group-hover:underline">View</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </Container>
    </div>
  );
};

export default VendorProfile;
