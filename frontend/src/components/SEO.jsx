import { Helmet } from 'react-helmet-async';

const SEO = ({ 
  title, 
  description, 
  keywords = '', 
  ogImage = '', 
  ogType = 'website',
  canonical = '',
  noindex = false,
  jsonLd = null
}) => {
  const siteName = 'Nepal Hotel & Adventure';
  const defaultDescription = 'Discover luxury hotels and thrilling adventures in Nepal. Book your perfect stay or exciting activities today.';
  const defaultImage = '/og-image.jpg';
  
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const fullDescription = description || defaultDescription;
  const fullImage = ogImage || defaultImage;
  const fullCanonical = canonical ? `${window.location.origin}${canonical}` : window.location.href;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullCanonical} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:site_name" content={siteName} />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={fullImage} />
      
      {/* Viewport for Mobile */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      
      {/* Theme Color */}
      <meta name="theme-color" content="#4f46e5" />
      
      {/* Structured Data (JSON-LD) */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

// Helper function to generate JSON-LD for Hotel
export const generateHotelJsonLd = (hotel) => ({
  '@context': 'https://schema.org',
  '@type': 'Hotel',
  name: hotel.name,
  description: hotel.description,
  image: hotel.featured_image,
  address: {
    '@type': 'PostalAddress',
    addressLocality: hotel.city,
    addressRegion: hotel.district,
    addressCountry: 'NP'
  },
  telephone: hotel.phone,
  starRating: {
    '@type': 'Rating',
    ratingValue: hotel.star_rating
  },
  priceRange: `$${hotel.price_per_night} per night`,
  aggregateRating: hotel.rating ? {
    '@type': 'AggregateRating',
    ratingValue: hotel.rating,
    reviewCount: hotel.reviews_count || 0
  } : undefined
});

// Helper function to generate JSON-LD for Activity
export const generateActivityJsonLd = (activity) => ({
  '@context': 'https://schema.org',
  '@type': 'TouristAttraction',
  name: activity.name,
  description: activity.description,
  image: activity.featured_image,
  location: {
    '@type': 'Place',
    name: activity.location,
    address: {
      '@type': 'PostalAddress',
      addressLocality: activity.city,
      addressCountry: 'NP'
    }
  },
  touristType: activity.type,
  additionalProperty: [
    {
      '@type': 'PropertyValue',
      name: 'Duration',
      value: activity.duration
    },
    {
      '@type': 'PropertyValue',
      name: 'Difficulty',
      value: activity.difficulty_level
    },
    {
      '@type': 'PropertyValue',
      name: 'Max Participants',
      value: activity.max_participants
    }
  ],
  offers: {
    '@type': 'Offer',
    price: activity.price,
    priceCurrency: 'USD',
    availability: activity.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
  }
});

export default SEO;
