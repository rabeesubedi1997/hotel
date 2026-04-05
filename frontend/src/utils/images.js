// Unsplash image URLs for hotels and activities
export const getHotelImage = (id) => {
  const hotelImages = [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80', // Luxury resort
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80', // Modern hotel
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80', // Pool resort
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80', // City hotel
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80', // Mountain resort
    'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80', // Heritage hotel
    'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80', // Boutique hotel
    'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80', // Resort
  ];
  return hotelImages[id % hotelImages.length];
};

export const getActivityImage = (type) => {
  const activityImages = {
    bungee: 'https://images.unsplash.com/photo-1523287562758-66c7fc58967f?w=800&q=80',
    paragliding: 'https://images.unsplash.com/photo-1605891525466-5a5b7c9b2d34?w=800&q=80',
    rafting: 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=800&q=80',
    trekking: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80',
    zipline: 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?w=800&q=80',
    skydiving: 'https://images.unsplash.com/photo-1549798616-570507f00f73?w=800&q=80',
    canyoning: 'https://images.unsplash.com/photo-1504280509585-0d7a56c2c9e8?w=800&q=80',
    rock_climbing: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=80',
    hot_air_balloon: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=800&q=80',
    other: 'https://images.unsplash.com/photo-1533692328991-08159ff19fca?w=800&q=80',
  };
  return activityImages[type] || activityImages.other;
};

export const getHeroImage = () => 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1920&q=80';

export const getAdventureBanner = () => 'https://images.unsplash.com/photo-1519033645996-1865257e1239?w=1920&q=80';
