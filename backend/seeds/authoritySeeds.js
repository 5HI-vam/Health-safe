const Authority = require('../models/Authority');

const sampleAuthorities = [
  {
    name: 'Karnataka Medical Council (KMC) — Vigilance & Licensure Directorate',
    code: 'KMC_COUNCIL',
    type: 'STATE_MEDICAL_COUNCIL',
    state: 'Karnataka',
    district: '',
    jurisdiction: 'Karnataka Medical Council Act — Statewide Medical Practitioner Licensure & Professional Conduct',
    categories: [
      'Registration could not be verified',
      'Suspected unauthorized medical practice',
      'Suspected fake qualification',
      'Suspected forged certificate',
      'Person claiming to be a doctor without verification',
    ],
    facilityTypes: ['INDIVIDUAL_PRACTICE', 'ALL'],
    contactInformation: {
      email: 'vigilance@karnatakamedicalcouncil.in',
      phone: '+91-80-2226-4444',
      portalUrl: 'https://karnatakamedicalcouncil.in/vigilance',
      address: '7/1, Miller Tank Bund Road, Vasanth Nagar, Bengaluru, Karnataka 560052',
    },
    active: true,
    priorityRules: {
      weight: 25,
    },
  },
  {
    name: 'Karnataka Private Medical Establishments (KPME) Authority',
    code: 'KPME_AUTHORITY',
    type: 'CLINICAL_ESTABLISHMENT_AUTHORITY',
    state: 'Karnataka',
    district: '',
    jurisdiction: 'Karnataka Private Medical Establishments Act — Statewide Clinical Establishments Registration & Compliance',
    categories: [
      'Suspected unauthorized clinic',
      'Suspected unauthorized medical practice',
    ],
    facilityTypes: ['CLINIC', 'HOSPITAL', 'NURSING_HOME', 'DIAGNOSTIC_LAB'],
    contactInformation: {
      email: 'kpme-compliance@karnataka.gov.in',
      phone: '+91-80-2235-5555',
      portalUrl: 'https://kpme.karnataka.gov.in',
      address: 'Directorate of Health and Family Welfare Services, Ananda Rao Circle, Bengaluru, Karnataka 560009',
    },
    active: true,
    priorityRules: {
      weight: 35,
    },
  },
  {
    name: 'Bengaluru Urban District Health & Family Welfare Authority',
    code: 'BLR_URBAN_DHA',
    type: 'DISTRICT_HEALTH_AUTHORITY',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    jurisdiction: 'Chief District Health Officer (DHO) Statutory Jurisdiction — Bengaluru Urban District',
    categories: [
      'Suspected unauthorized clinic',
      'Suspected unauthorized medical practice',
      'Other',
    ],
    facilityTypes: ['CLINIC', 'HOSPITAL', 'INDIVIDUAL_PRACTICE', 'ALL'],
    contactInformation: {
      email: 'dho-bengaluru-urban@karnataka.gov.in',
      phone: '+91-80-2286-3333',
      portalUrl: 'https://bengaluruurban.nic.in/health',
      address: 'District Health Office, Old DC Office Compound, K.R. Market, Bengaluru 560002',
    },
    active: true,
    priorityRules: {
      weight: 45, // Highest local specificity for Bengaluru Urban district clinics
    },
  },
  {
    name: 'Delhi Medical Council (DMC) — Anti-Quackery & Ethics Cell',
    code: 'DMC_COUNCIL',
    type: 'STATE_MEDICAL_COUNCIL',
    state: 'Delhi',
    district: '',
    jurisdiction: 'Delhi Medical Council Act 1997 — NCT of Delhi Professional Licensure & Anti-Quackery Vigilance',
    categories: [
      'Registration could not be verified',
      'Suspected unauthorized medical practice',
      'Suspected fake qualification',
      'Suspected forged certificate',
      'Person claiming to be a doctor without verification',
    ],
    facilityTypes: ['INDIVIDUAL_PRACTICE', 'ALL'],
    contactInformation: {
      email: 'antiquackery@delhimedicalcouncil.org',
      phone: '+91-11-2323-8888',
      portalUrl: 'https://delhimedicalcouncil.org/anti-quackery',
      address: '308A, 3rd Floor, Administrative Block, Maulana Azad Medical College, New Delhi 110002',
    },
    active: true,
    priorityRules: {
      weight: 25,
    },
  },
  {
    name: 'Delhi Directorate of Health Services — Nursing Homes & Clinics Regulatory Cell',
    code: 'DELHI_DHS_CLINICS',
    type: 'CLINICAL_ESTABLISHMENT_AUTHORITY',
    state: 'Delhi',
    district: '',
    jurisdiction: 'Delhi Nursing Homes Registration Act — NCT of Delhi Clinical Facilities & Clinics Compliance',
    categories: [
      'Suspected unauthorized clinic',
    ],
    facilityTypes: ['CLINIC', 'HOSPITAL', 'NURSING_HOME'],
    contactInformation: {
      email: 'dhs-nursinghomes@delhi.gov.in',
      phone: '+91-11-2230-7777',
      portalUrl: 'https://dhs.delhigovt.nic.in',
      address: 'F-17, Karkardooma, Delhi 110032',
    },
    active: true,
    priorityRules: {
      weight: 35,
    },
  },
  {
    name: 'Maharashtra Medical Council (MMC) — Ethics & Licensure Enforcement Branch',
    code: 'MMC_COUNCIL',
    type: 'STATE_MEDICAL_COUNCIL',
    state: 'Maharashtra',
    district: '',
    jurisdiction: 'Maharashtra Medical Council Act 1965 — Statewide Licensure, Ethics & Malpractice Vigilance',
    categories: [
      'Registration could not be verified',
      'Suspected unauthorized medical practice',
      'Suspected fake qualification',
      'Suspected forged certificate',
      'Person claiming to be a doctor without verification',
      'Suspected unauthorized clinic',
    ],
    facilityTypes: ['ALL'],
    contactInformation: {
      email: 'ethics@maharashtramedicalcouncil.in',
      phone: '+91-22-2262-1111',
      portalUrl: 'https://maharashtramedicalcouncil.in',
      address: '189-A, Anand Bhuvan, Babu Genu Road, Princess Street, Mumbai, Maharashtra 400002',
    },
    active: true,
    priorityRules: {
      weight: 25,
    },
  },
  {
    name: 'National Medical Commission (NMC) — Inter-State & National Compliance Division',
    code: 'NMC_NATIONAL',
    type: 'OTHER_AUTHORITY',
    state: 'National',
    district: '',
    jurisdiction: 'National Medical Commission Act 2019 — Multi-State Jurisdiction & Statutory Oversight',
    categories: [
      'Registration could not be verified',
      'Suspected unauthorized medical practice',
      'Suspected fake qualification',
      'Suspected forged certificate',
      'Person claiming to be a doctor without verification',
      'Suspected unauthorized clinic',
      'Other',
    ],
    facilityTypes: ['ALL'],
    contactInformation: {
      email: 'statutory-oversight@nmc.org.in',
      phone: '+91-11-2536-7033',
      portalUrl: 'https://nmc.org.in',
      address: 'Pocket-14, Sector-8, Dwarka Phase-1, New Delhi 110077',
    },
    active: true,
    priorityRules: {
      weight: 5, // Fallback when specific state authority is not configured
    },
  },
];

async function seedAuthorities() {
  try {
    const existingCount = await Authority.countDocuments();
    if (existingCount > 0) {
      console.log(`[AuthoritySeeds] Database already contains ${existingCount} authorities. Refreshing configurations...`);
      // Upsert by code to keep seeds fresh
      for (const item of sampleAuthorities) {
        await Authority.findOneAndUpdate(
          { code: item.code },
          { $set: item },
          { upsert: true, new: true }
        );
      }
      console.log('[AuthoritySeeds] Statutory authority configurations refreshed successfully.');
      return;
    }

    console.log('[AuthoritySeeds] Seeding initial statutory regulatory authorities...');
    await Authority.insertMany(sampleAuthorities);
    console.log(`[AuthoritySeeds] Successfully seeded ${sampleAuthorities.length} statutory authorities.`);
  } catch (err) {
    console.error('[AuthoritySeeds] Seeding failed:', err.message);
  }
}

module.exports = { seedAuthorities, sampleAuthorities };
