export const PROPERTY_TYPES = [
  { value: '', label: 'All Stays' },
  { value: 'apartment', label: 'Apartments' },
  { value: 'house', label: 'Homes' },
  { value: 'villa', label: 'Villas' },
  { value: 'cabin', label: 'Cabins' },
  { value: 'cottage', label: 'Cottages' },
  { value: 'studio', label: 'Studios' },
  { value: 'farmhouse', label: 'Farmhouses' },
];

export const AMENITIES = [
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'parking', label: 'Free parking' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'air_conditioning', label: 'Air conditioning' },
  { value: 'heating', label: 'Heating' },
  { value: 'washer', label: 'Washer' },
  { value: 'tv', label: 'TV' },
  { value: 'workspace', label: 'Workspace' },
  { value: 'pet_friendly', label: 'Pet friendly' },
];

export const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Recommended' },
  { value: 'price', label: 'Price: low to high' },
  { value: '-price', label: 'Price: high to low' },
  { value: '-averageRating', label: 'Top rated' },
];

export const buildPropertyParams = (searchParams) => {
  const params = {
    page: Number(searchParams.get('page') || 1),
    limit: 12,
    sort: searchParams.get('sort') || '-createdAt',
  };

  [
    'lng',
    'lat',
    'radius',
    'type',
    'minPrice',
    'maxPrice',
    'bedrooms',
    'bathrooms',
    'maxGuests',
    'amenities',
    'currency',
    'q',
  ].forEach((key) => {
    const value = searchParams.get(key);
    if (value) params[key] = value;
  });

  return params;
};
