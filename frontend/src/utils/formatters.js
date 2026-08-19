export const formatMoney = (value, currency = 'PKR') => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '';

  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
};

export const formatDate = (date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
};

export const formatAddress = (address) => {
  if (!address) return 'Location not provided';
  return [address.area, address.city, address.country].filter(Boolean).join(', ') || 'Location not provided';
};

export const formatAmenity = (amenity) =>
  amenity?.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase()) || '';

export const getCoverImage = (property) => property?.images?.find((image) => image?.url)?.url || '';

export const pluralize = (count, label) => `${count} ${label}${Number(count) === 1 ? '' : 's'}`;
