// scripts/seed.mongo.js
// Executed once by the MongoDB Docker entrypoint on first container start.
// Safe to run multiple times — the guard at the top prevents duplicate inserts.

db = db.getSiblingDB('trustchain');

const existingCount = db.pois.countDocuments({});
if (existingCount > 0) {
  print('[seed] pois collection already contains ' + existingCount + ' documents. Skipping.');
  quit(0);
}

const now = new Date();

const pois = [
  {
    name: 'Central Perk Cafe',
    description: 'A cozy neighbourhood cafe with excellent single-origin coffee and reliable wifi.',
    category: 'cafe',
    tags: ['coffee', 'wifi', 'vegan', 'quiet', 'laptop-friendly'],
    location: { type: 'Point', coordinates: [-74.0060, 40.7128] },
    address: { street: '123 Broadway', city: 'New York', country: 'US', postalCode: '10001' },
    metadata: { averageRating: 4.5, totalReviews: 24, totalCheckins: 87, verified: true },
    isActive: true,
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Prospect Park',
    description: 'A 585-acre green space in Brooklyn with walking trails, a boathouse, and a lake.',
    category: 'park',
    tags: ['outdoor', 'dog-friendly', 'picnic', 'running', 'cycling'],
    location: { type: 'Point', coordinates: [-73.9683, 40.6602] },
    address: { street: 'Flatbush Ave', city: 'Brooklyn', country: 'US', postalCode: '11215' },
    metadata: { averageRating: 4.8, totalReviews: 51, totalCheckins: 312, verified: true },
    isActive: true,
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Brooklyn Museum',
    description: 'One of the largest art museums in the United States with an encyclopaedic collection.',
    category: 'museum',
    tags: ['art', 'history', 'culture', 'indoor', 'accessible'],
    location: { type: 'Point', coordinates: [-73.9636, 40.6712] },
    address: { street: '200 Eastern Pkwy', city: 'Brooklyn', country: 'US', postalCode: '11238' },
    metadata: { averageRating: 4.6, totalReviews: 38, totalCheckins: 156, verified: true },
    isActive: true,
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Smorgasburg Williamsburg',
    description: 'Outdoor food market with over 100 local vendors running every weekend April-November.',
    category: 'market',
    tags: ['food', 'outdoor', 'weekend', 'street-food', 'local'],
    location: { type: 'Point', coordinates: [-73.9580, 40.7223] },
    address: { street: '90 Kent Ave', city: 'Brooklyn', country: 'US', postalCode: '11249' },
    metadata: { averageRating: 4.4, totalReviews: 19, totalCheckins: 73, verified: false },
    isActive: true,
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'The High Line',
    description: 'Elevated linear park built on a former New York Central Railroad spur on the West Side.',
    category: 'park',
    tags: ['outdoor', 'art', 'walking', 'views', 'photography'],
    location: { type: 'Point', coordinates: [-74.0048, 40.7480] },
    address: { street: 'Gansevoort St', city: 'New York', country: 'US', postalCode: '10014' },
    metadata: { averageRating: 4.7, totalReviews: 63, totalCheckins: 278, verified: true },
    isActive: true,
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Blue Bottle Coffee - Williamsburg',
    description: 'Minimalist specialty coffee bar serving pour-overs and espresso in a bright industrial space.',
    category: 'cafe',
    tags: ['coffee', 'specialty', 'pour-over', 'minimal'],
    location: { type: 'Point', coordinates: [-73.9558, 40.7142] },
    address: { street: '160 Berry St', city: 'Brooklyn', country: 'US', postalCode: '11249' },
    metadata: { averageRating: 4.3, totalReviews: 31, totalCheckins: 94, verified: true },
    isActive: true,
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'MoMA PS1',
    description: 'Contemporary art museum in a converted public school building in Long Island City.',
    category: 'museum',
    tags: ['contemporary-art', 'culture', 'indoor', 'exhibitions'],
    location: { type: 'Point', coordinates: [-73.9445, 40.7452] },
    address: { street: '22-25 Jackson Ave', city: 'Queens', country: 'US', postalCode: '11101' },
    metadata: { averageRating: 4.5, totalReviews: 27, totalCheckins: 88, verified: true },
    isActive: true,
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Chelsea Market',
    description: 'Indoor urban food hall and shopping mall in a former Nabisco factory in Chelsea.',
    category: 'market',
    tags: ['food', 'indoor', 'shopping', 'historic', 'diverse'],
    location: { type: 'Point', coordinates: [-74.0051, 40.7424] },
    address: { street: '75 9th Ave', city: 'New York', country: 'US', postalCode: '10011' },
    metadata: { averageRating: 4.4, totalReviews: 44, totalCheckins: 198, verified: true },
    isActive: true,
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
  },
];

const result = db.pois.insertMany(pois);
print('[seed] inserted ' + result.insertedIds.length + ' POIs into trustchain.pois.');
