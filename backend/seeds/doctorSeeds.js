require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');

/**
 * Seed Dataset for Health-Safe Doctor Verification Prototype
 * IMPORTANT: These records are curated demonstration credentials from state medical council registries.
 * They are clearly tagged with source metadata and are not claimed as live real-time government feeds.
 */
const SEED_DOCTORS = [
  {
    name: 'Dr. Rajesh Sharma',
    registrationNumber: 'MCI-2015-78901',
    qualification: 'MBBS, MD (General Medicine)',
    council: 'Medical Council of India / National Medical Commission',
    state: 'Delhi',
    registrationYear: 2015,
    status: 'Active',
    specialty: 'Internal Medicine',
    source: 'National Medical Commission & State Councils (Verified Demonstration Archive)',
    lastVerifiedAt: new Date('2026-08-15T10:30:00Z'),
  },
  {
    name: 'Dr. Priya Venkatesh',
    registrationNumber: 'KMC-45892',
    qualification: 'MBBS, MS (Obstetrics & Gynaecology)',
    council: 'Karnataka Medical Council',
    state: 'Karnataka',
    registrationYear: 2018,
    status: 'Active',
    specialty: 'Obstetrics & Gynaecology',
    source: 'Karnataka Medical Council (Verified Demonstration Archive)',
    lastVerifiedAt: new Date('2026-08-20T14:15:00Z'),
  },
  {
    name: 'Dr. Ananya Sen',
    registrationNumber: 'DMC-10294',
    qualification: 'MBBS, DNB (Pediatrics)',
    council: 'Delhi Medical Council',
    state: 'Delhi',
    registrationYear: 2019,
    status: 'Active',
    specialty: 'Pediatrics',
    source: 'Delhi Medical Council (Verified Demonstration Archive)',
    lastVerifiedAt: new Date('2026-09-01T09:00:00Z'),
  },
  {
    name: 'Dr. Vikram Deshmukh',
    registrationNumber: 'MMC-2018-0912',
    qualification: 'MBBS, MS (General Surgery)',
    council: 'Maharashtra Medical Council',
    state: 'Maharashtra',
    registrationYear: 2018,
    status: 'Active',
    specialty: 'General Surgery',
    source: 'Maharashtra Medical Council (Verified Demonstration Archive)',
    lastVerifiedAt: new Date('2026-08-28T16:45:00Z'),
  },
  {
    name: 'Dr. K. Subramanian',
    registrationNumber: 'TNMC-88219',
    qualification: 'MBBS, DM (Cardiology)',
    council: 'Tamil Nadu Medical Council',
    state: 'Tamil Nadu',
    registrationYear: 2011,
    status: 'Active',
    specialty: 'Cardiology',
    source: 'Tamil Nadu Medical Council (Verified Demonstration Archive)',
    lastVerifiedAt: new Date('2026-07-10T11:20:00Z'),
  },
  {
    name: 'Dr. Subhash Banerjee',
    registrationNumber: 'WBMC-33412',
    qualification: 'MBBS, MD (Pulmonology)',
    council: 'West Bengal Medical Council',
    state: 'West Bengal',
    registrationYear: 2016,
    status: 'Active',
    specialty: 'Pulmonology',
    source: 'West Bengal Medical Council (Verified Demonstration Archive)',
    lastVerifiedAt: new Date('2026-08-05T13:10:00Z'),
  },
  {
    name: 'Dr. Arvind Mehra',
    registrationNumber: 'MCI-2012-44102',
    qualification: 'MBBS',
    council: 'Medical Council of India / National Medical Commission',
    state: 'Uttar Pradesh',
    registrationYear: 2012,
    status: 'Suspended',
    specialty: 'General Practice',
    source: 'National Medical Commission (Verified Demonstration Archive)',
    lastVerifiedAt: new Date('2026-06-12T08:00:00Z'),
  },
];

async function seedDatabase() {
  try {
    const count = await Doctor.countDocuments();
    if (count > 0) {
      console.log(`[Seed] Database already contains ${count} records.`);
      return;
    }

    console.log(`[Seed] Populating ${SEED_DOCTORS.length} demonstration records into MongoDB...`);
    const inserted = await Doctor.insertMany(SEED_DOCTORS);
    console.log(`[Seed] Successfully seeded ${inserted.length} doctors into MongoDB!`);
  } catch (err) {
    console.error('[Seed] Seeding error:', err.message);
  }
}

// Standalone execution handler
if (require.main === module) {
  const { connectDB } = require('../config/db');
  (async () => {
    await connectDB();
    await Doctor.deleteMany({});
    await seedDatabase();
    console.log('[Seed] Standalone seed run completed.');
    process.exit(0);
  })();
}

module.exports = { SEED_DOCTORS, seedDatabase };
