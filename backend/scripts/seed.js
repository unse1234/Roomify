import dotenv from 'dotenv';
dotenv.config();

const { default: mongoose } = await import('mongoose');
const { default: connectDB } = await import('../src/config/database.js');
const { default: User } = await import('../src/models/users.model.js');
const { default: Property } = await import('../src/models/property.model.js');
const { default: Booking } = await import('../src/models/booking.model.js');
const { default: Review } = await import('../src/models/review.model.js');

const CITIES = [
  { city: 'Islamabad', state: 'Punjab', country: 'Pakistan', lng: 73.0479, lat: 33.6844 },
  { city: 'Lahore', state: 'Punjab', country: 'Pakistan', lng: 74.3587, lat: 31.5204 },
  { city: 'Karachi', state: 'Sindh', country: 'Pakistan', lng: 67.0011, lat: 24.8607 },
  { city: 'Dubai', state: 'Dubai', country: 'UAE', lng: 55.2708, lat: 25.2048 },
];

const placeholderImage = (seed) => ({
  url: `https://picsum.photos/seed/${seed}/800/600`,
  publicId: `seed_${seed}`,
});

const seed = async () => {
  await connectDB();
  console.log('Connected. Clearing existing data...');

  await Promise.all([
    User.deleteMany({}),
    Property.deleteMany({}),
    Booking.deleteMany({}),
    Review.deleteMany({}),
  ]);

  // ── Users ──────────────────────────────────────────────
  const [admin, host1, host2, guest1, guest2, guest3] = await User.create([
    { name: 'Admin User', email: 'admin@roomify.test', password: 'Password123', roles: ['admin'] },
    { name: 'Ahmed Raza', email: 'ahmed.host@roomify.test', password: 'Password123', roles: ['host'] },
    { name: 'Sara Khan', email: 'sara.host@roomify.test', password: 'Password123', roles: ['host'] },
    { name: 'Bilal Ahmad', email: 'bilal@roomify.test', password: 'Password123', roles: ['guest'] },
    { name: 'Ayesha Malik', email: 'ayesha@roomify.test', password: 'Password123', roles: ['guest'] },
    { name: 'Usman Tariq', email: 'usman@roomify.test', password: 'Password123', roles: ['guest', 'host'] },
  ]);

  console.log('Created 6 users');

  // ── Properties ─────────────────────────────────────────
  const propertyDefs = [
    { title: 'Modern Apartment in F-7', host: host1, type: 'apartment', price: 8500, bedrooms: 2, bathrooms: 2, maxGuests: 4, city: CITIES[0] },
    { title: 'Cozy Studio near Centaurus', host: host1, type: 'studio', price: 5000, bedrooms: 1, bathrooms: 1, maxGuests: 2, city: CITIES[0] },
    { title: 'Luxury Villa in DHA', host: host2, type: 'villa', price: 25000, bedrooms: 5, bathrooms: 4, maxGuests: 10, city: CITIES[1] },
    { title: 'Downtown Karachi Flat', host: host2, type: 'apartment', price: 7000, bedrooms: 2, bathrooms: 1, maxGuests: 4, city: CITIES[2] },
    { title: 'Beachside Karachi Bungalow', host: host2, type: 'house', price: 15000, bedrooms: 3, bathrooms: 3, maxGuests: 6, city: CITIES[2] },
    { title: 'Dubai Marina Penthouse', host: host1, type: 'apartment', price: 60000, bedrooms: 3, bathrooms: 3, maxGuests: 6, city: CITIES[3] },
    { title: 'Compact Apartment near NUST', host: guest3, type: 'apartment', price: 2000, bedrooms: 1, bathrooms: 1, maxGuests: 1, city: CITIES[0] },
    { title: 'Family House in Gulberg', host: host2, type: 'house', price: 12000, bedrooms: 4, bathrooms: 3, maxGuests: 8, city: CITIES[1] },
  ];

  const properties = await Property.create(
    propertyDefs.map((p, i) => ({
      title: p.title,
      description: `A beautiful ${p.type.replace('_', ' ')} located in the heart of ${p.city.city}. Perfect for your next stay.`,
      host: p.host._id,
      type: p.type,
      price: p.price,
      currency: 'PKR',
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      area: { value: p.bedrooms * 250, unit: 'sqft' },
      maxGuests: p.maxGuests,
      images: [placeholderImage(`prop${i}-1`), placeholderImage(`prop${i}-2`), placeholderImage(`prop${i}-3`)],
      amenities: ['wifi', 'kitchen', 'parking', 'air_conditioning'].slice(0, 2 + (i % 3)),
      address: {
        street: `${100 + i} Main Boulevard`,
        city: p.city.city,
        state: p.city.state,
        country: p.city.country,
        zipCode: `${44000 + i}`,
        location: { type: 'Point', coordinates: [p.city.lng + i * 0.01, p.city.lat + i * 0.01] },
      },
      status: 'active',
    }))
  );

  console.log(`Created ${properties.length} properties`);

  // ── Bookings ───────────────────────────────────────────
  // "completed" bookings are intentionally backdated (checkIn in the
  // past) to simulate stays that already happened — this trips the
  // model's "checkIn cannot be in the past" validator by design, so
  // those specific saves skip validation. Future-dated bookings
  // (confirmed/pending/cancelled) go through normal validation.
  const bookingDefs = [
    { property: properties[0], guest: guest1, status: 'completed', nights: 3, daysFromNow: -20 },
    { property: properties[2], guest: guest2, status: 'completed', nights: 5, daysFromNow: -35 },
    { property: properties[4], guest: guest3, status: 'confirmed', nights: 2, daysFromNow: 5 },
    { property: properties[1], guest: guest1, status: 'cancelled', nights: 2, daysFromNow: 10 },
    { property: properties[3], guest: guest2, status: 'pending', nights: 4, daysFromNow: 15 },
  ];

  const bookings = [];
  for (const b of bookingDefs) {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + b.daysFromNow);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + b.nights);

    const subtotal = b.property.price * b.nights;
    const serviceFee = Math.round(subtotal * 0.05);

    const booking = new Booking({
      property: b.property._id,
      guest: b.guest._id,
      host: b.property.host._id ?? b.property.host,
      checkIn,
      checkOut,
      guestCount: 2,
      priceBreakdown: {
        basePrice: b.property.price,
        nights: b.nights,
        subtotal,
        serviceFee,
        totalAmount: subtotal + serviceFee,
        currency: b.property.currency,
      },
      status: b.status,
      paymentStatus: b.status === 'completed' || b.status === 'confirmed' ? 'paid' : 'unpaid',
      isReviewed: false,
      ...(b.status === 'cancelled' && {
        cancellation: {
          cancelledBy: 'guest',
          reason: 'Change of plans',
          cancelledAt: new Date(),
        },
      }),
    });

    const isBackdated = b.daysFromNow < 0;
    await booking.save(isBackdated ? { validateBeforeSave: false } : undefined);
    bookings.push(booking);
  }

  console.log(`Created ${bookings.length} bookings`);

  // ── Reviews (only for completed bookings) ────────────────
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const reviewComments = [
    'Amazing stay! The host was very responsive and the place was exactly as described.',
    'Great location and clean apartment. Would definitely book again.',
  ];

  for (const [i, booking] of completedBookings.entries()) {
    await Review.create({
      property: booking.property,
      reviewer: booking.guest,
      booking: booking._id,
      rating: 4 + (i % 2),
      categoryRatings: {
        cleanliness: 5,
        communication: 5,
        checkIn: 4,
        accuracy: 4,
        location: 5,
        value: 4,
      },
      comment: reviewComments[i % reviewComments.length],
      type: 'guest_to_property',
    });

    booking.isReviewed = true;
    await booking.save({ validateBeforeSave: false });
  }

  console.log(`Created ${completedBookings.length} reviews`);

  console.log('Seeding complete.');
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});