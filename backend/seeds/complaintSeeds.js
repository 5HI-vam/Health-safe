const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Authority = require('../models/Authority');
const CaseEvent = require('../models/CaseEvent');
const Evidence = require('../models/Evidence');

const initialComplaints = [
  {
    caseId: 'HS-MP-2026-000101',
    category: 'Suspected unauthorized medical practice',
    practitionerDetails: {
      name: 'Dr. Vikram Shetty (Claimed)',
      registrationNumber: 'KMC-88219-B',
      phone: '+91 98450 11223',
      qualificationClaimed: 'MS Orthopaedics, FRCS',
    },
    facilityDetails: {
      clinicName: 'Bengaluru Ortho Care Clinic',
      address: '42 100ft Road, Indiranagar',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
    },
    description: 'Practitioner performing complex joint injections and laser spine decompression without verified registration in the state medical council register.',
    location: {
      address: '42 100ft Road, Indiranagar, Bengaluru',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      latitude: 12.9784,
      longitude: 77.6408,
    },
    status: 'UNDER_REVIEW',
    priority: 'HIGH',
    assignedOfficer: {
      officerId: 'usr_blr_dha_01',
      officerName: 'Dr. Anand Kumar',
      assignedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
    },
    reporterDetails: {
      name: 'Patient Relative (Confidential)',
      contact: 'confidential@citizen.gov',
    },
    reporterConsent: true,
    createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
  },
  {
    caseId: 'HS-MP-2026-000102',
    category: 'Suspected unauthorized clinic',
    practitionerDetails: {
      name: 'Dr. Vikram Shetty',
      registrationNumber: 'KMC-88219-B',
      phone: '+91 98450 11223',
      qualificationClaimed: 'MS Ortho',
    },
    facilityDetails: {
      clinicName: 'Bengaluru Ortho Care Clinic',
      address: 'Branch 2, 5th Block, Koramangala',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
    },
    description: 'Facility operating a surgical day-care center without KPME establishment registration license.',
    location: {
      address: '5th Block, Koramangala, Bengaluru',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      latitude: 12.9352,
      longitude: 77.6245,
    },
    status: 'INVESTIGATION',
    priority: 'CRITICAL',
    assignedOfficer: {
      officerId: 'usr_blr_dha_01',
      officerName: 'Dr. Anand Kumar',
      assignedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    },
    reporterDetails: {
      name: 'Anonymous Citizen',
      contact: '',
    },
    reporterConsent: true,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
  },
  {
    caseId: 'HS-MP-2026-000103',
    category: 'Suspected fake qualification',
    practitionerDetails: {
      name: 'Rameshwar Gowda',
      registrationNumber: 'KMC-77192-A',
      phone: '+91 94480 33445',
      qualificationClaimed: 'MD Internal Medicine (Forged Ukraine Diploma)',
    },
    facilityDetails: {
      clinicName: 'Gowda Poly Clinic & Day Care',
      address: 'Main Road, Devanahalli',
      district: 'Bengaluru Rural',
      state: 'Karnataka',
    },
    description: 'Practitioner displaying an unaccredited foreign medical diploma; council verified no Foreign Medical Graduate Examination (FMGE) clearance record exists.',
    location: {
      address: 'Devanahalli Main Road, Bengaluru Rural',
      district: 'Bengaluru Rural',
      state: 'Karnataka',
      latitude: 13.2483,
      longitude: 77.7126,
    },
    status: 'ACTION_TAKEN',
    priority: 'HIGH',
    assignedOfficer: {
      officerId: 'usr_kmc_01',
      officerName: 'Dr. Sneha Rao',
      assignedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    },
    reporterDetails: {
      name: 'Local Resident Welfare Association',
      contact: '',
    },
    reporterConsent: true,
    createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000),
  },
  {
    caseId: 'HS-MP-2026-000104',
    category: 'Person claiming to be a doctor without verification',
    practitionerDetails: {
      name: 'Suresh Chandra',
      registrationNumber: '',
      phone: '+91 97410 99881',
      qualificationClaimed: 'Cardio Consultant',
    },
    facilityDetails: {
      clinicName: 'Chamundi Heart & General Care',
      address: 'VV Mohalla, Mysuru',
      district: 'Mysuru',
      state: 'Karnataka',
    },
    description: 'Dispensing schedule H prescription medications without any valid state council medical registration number.',
    location: {
      address: 'VV Mohalla, Mysuru',
      district: 'Mysuru',
      state: 'Karnataka',
      latitude: 12.3168,
      longitude: 76.6342,
    },
    status: 'SUBMITTED',
    priority: 'HIGH',
    reporterDetails: {
      name: 'Patient Family Member',
      contact: '',
    },
    reporterConsent: true,
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
  },
  {
    caseId: 'HS-MP-2026-000105',
    category: 'Suspected unauthorized clinic',
    practitionerDetails: {
      name: 'Dr. Alok Verma',
      registrationNumber: 'DMC-90412',
      phone: '+91 98110 44556',
      qualificationClaimed: 'MBBS, DNB',
    },
    facilityDetails: {
      clinicName: 'Apex Diagnostic & Wellness Clinic',
      address: 'Ring Road, Lajpat Nagar',
      district: 'South Delhi',
      state: 'Delhi',
    },
    description: 'Facility advertising advanced radiological scanning and aesthetic minor surgery without municipal establishment clearance.',
    location: {
      address: 'Lajpat Nagar IV, South Delhi',
      district: 'South Delhi',
      state: 'Delhi',
      latitude: 28.5683,
      longitude: 77.2433,
    },
    status: 'UNDER_REVIEW',
    priority: 'MEDIUM',
    assignedOfficer: {
      officerId: 'usr_dmc_01',
      officerName: 'Dr. Rajiv Malhotra',
      assignedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    },
    reporterDetails: {
      name: 'Concerned Citizen',
      contact: '',
    },
    reporterConsent: true,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
  },
  {
    caseId: 'HS-MP-2026-000106',
    category: 'Registration could not be verified',
    practitionerDetails: {
      name: 'Dr. Alok Verma',
      registrationNumber: 'DMC-90412',
      phone: '+91 98110 44556',
      qualificationClaimed: 'MBBS, DNB',
    },
    facilityDetails: {
      clinicName: 'Apex Diagnostic & Wellness Clinic',
      address: 'Ring Road, Lajpat Nagar',
      district: 'South Delhi',
      state: 'Delhi',
    },
    description: 'Patient checked Health-Safe registry and doctor state registration could not be verified against the Delhi Medical Council live register.',
    location: {
      address: 'Lajpat Nagar IV, South Delhi',
      district: 'South Delhi',
      state: 'Delhi',
      latitude: 28.5695,
      longitude: 77.2415,
    },
    status: 'EVIDENCE_REQUESTED',
    priority: 'HIGH',
    assignedOfficer: {
      officerId: 'usr_dmc_01',
      officerName: 'Dr. Rajiv Malhotra',
      assignedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    },
    reporterDetails: {
      name: 'Patient (Confidential)',
      contact: '',
    },
    reporterConsent: true,
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
  },
  {
    caseId: 'HS-MP-2026-000107',
    category: 'Suspected forged certificate',
    practitionerDetails: {
      name: 'Prakash Sharma',
      registrationNumber: 'DMC-81729',
      phone: '+91 98711 22334',
      qualificationClaimed: 'MD Dermatology (Forged Fellowship)',
    },
    facilityDetails: {
      clinicName: 'DermaCare Skin & Laser Institute',
      address: 'Connaught Circus',
      district: 'Central Delhi',
      state: 'Delhi',
    },
    description: 'Practitioner displayed certificates from an unaccredited overseas skin institute while prescribing experimental biological agents.',
    location: {
      address: 'Connaught Circus, Central Delhi',
      district: 'Central Delhi',
      state: 'Delhi',
      latitude: 28.6328,
      longitude: 77.2197,
    },
    status: 'INVESTIGATION',
    priority: 'HIGH',
    assignedOfficer: {
      officerId: 'usr_dmc_01',
      officerName: 'Dr. Rajiv Malhotra',
      assignedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
    },
    reporterDetails: {
      name: 'Patient Advocacy Group',
      contact: '',
    },
    reporterConsent: true,
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
  },
  {
    caseId: 'HS-MP-2026-000108',
    category: 'Suspected unauthorized medical practice',
    practitionerDetails: {
      name: 'Prakash Sharma',
      registrationNumber: 'DMC-81729',
      phone: '+91 98711 22334',
      qualificationClaimed: 'Cosmetic Surgeon',
    },
    facilityDetails: {
      clinicName: 'DermaCare Skin & Laser Institute',
      address: 'Barakhamba Road',
      district: 'Central Delhi',
      state: 'Delhi',
    },
    description: 'Performing invasive cosmetic hair transplants and surgical liposuction without certified operating theatre infrastructure.',
    location: {
      address: 'Barakhamba Road, Central Delhi',
      district: 'Central Delhi',
      state: 'Delhi',
      latitude: 28.6289,
      longitude: 77.2274,
    },
    status: 'ASSIGNED',
    priority: 'CRITICAL',
    assignedOfficer: {
      officerId: 'usr_dmc_01',
      officerName: 'Dr. Rajiv Malhotra',
      assignedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    },
    reporterDetails: {
      name: 'Anonymous Report',
      contact: '',
    },
    reporterConsent: true,
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
  },
  {
    caseId: 'HS-MP-2026-000109',
    category: 'Suspected unauthorized medical practice',
    practitionerDetails: {
      name: 'Dr. Rajesh Deshmukh',
      registrationNumber: 'MMC-45192-M',
      phone: '+91 98200 55667',
      qualificationClaimed: 'General Surgeon',
    },
    facilityDetails: {
      clinicName: 'Deshmukh Surgical Nursing Home',
      address: 'SV Road, Andheri West',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
    },
    description: 'Operating an uncertified surgical suite with inadequate resuscitation and emergency sterilization equipment.',
    location: {
      address: 'SV Road, Andheri West, Mumbai',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
      latitude: 19.1197,
      longitude: 72.8464,
    },
    status: 'RESOLVED',
    priority: 'HIGH',
    assignedOfficer: {
      officerId: 'usr_mmc_01',
      officerName: 'Dr. Meera Kulkarni',
      assignedAt: new Date(Date.now() - 12 * 24 * 3600 * 1000),
    },
    reporterDetails: {
      name: 'Citizen Informant',
      contact: '',
    },
    reporterConsent: true,
    createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000),
  },
  {
    caseId: 'HS-MP-2026-000110',
    category: 'Suspected unauthorized clinic',
    practitionerDetails: {
      name: 'Sunil Patil',
      registrationNumber: '',
      phone: '+91 98900 11223',
      qualificationClaimed: 'Ayush Practitioner (Practicing Allopathy)',
    },
    facilityDetails: {
      clinicName: 'Shivaji Nagar Health Hub',
      address: 'FC Road, Shivaji Nagar',
      district: 'Pune',
      state: 'Maharashtra',
    },
    description: 'Cross-practice allegation: practitioner licensed solely in traditional medicine administering intravenous allopathic antibiotics and steroids.',
    location: {
      address: 'FC Road, Shivaji Nagar, Pune',
      district: 'Pune',
      state: 'Maharashtra',
      latitude: 18.5308,
      longitude: 73.8475,
    },
    status: 'UNDER_REVIEW',
    priority: 'MEDIUM',
    reporterDetails: {
      name: 'Pharmacist Alert',
      contact: '',
    },
    reporterConsent: true,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
  },
  {
    caseId: 'HS-MP-2026-000111',
    category: 'Person claiming to be a doctor without verification',
    practitionerDetails: {
      name: 'Mohd. Imran Khan',
      registrationNumber: 'TSMC-Claimed-Pending',
      phone: '+91 98490 88776',
      qualificationClaimed: 'Pediatric Consultant',
    },
    facilityDetails: {
      clinicName: 'Charminar Child Care Clinic',
      address: 'Pathergatti, Old City',
      district: 'Hyderabad',
      state: 'Telangana',
    },
    description: 'Practicing pediatric care and vaccine administration without verified state council medical council registration.',
    location: {
      address: 'Pathergatti, Hyderabad',
      district: 'Hyderabad',
      state: 'Telangana',
      latitude: 17.3616,
      longitude: 78.4747,
    },
    status: 'SUBMITTED',
    priority: 'CRITICAL',
    reporterDetails: {
      name: 'Concerned Mother',
      contact: '',
    },
    reporterConsent: true,
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
  },
  {
    caseId: 'HS-MP-2026-000112',
    category: 'Other',
    practitionerDetails: {
      name: 'Dr. Harish Nayak',
      registrationNumber: 'KMC-55410-C',
      phone: '+91 94490 12345',
      qualificationClaimed: 'Consultant Physician',
    },
    facilityDetails: {
      clinicName: 'Nayak Diagnostics & Medicare',
      address: 'Jayanagar 4th Block',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
    },
    description: 'Billing concern: diagnostic clinic billing exorbitant undocumented emergency equipment surcharges with refusal to provide statutory receipts.',
    location: {
      address: 'Jayanagar 4th Block, Bengaluru',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      latitude: 12.9299,
      longitude: 77.5824,
    },
    status: 'RESOLVED',
    priority: 'LOW',
    assignedOfficer: {
      officerId: 'usr_blr_dha_01',
      officerName: 'Dr. Anand Kumar',
      assignedAt: new Date(Date.now() - 8 * 24 * 3600 * 1000),
    },
    reporterDetails: {
      name: 'Patient Consumer Group',
      contact: '',
    },
    reporterConsent: true,
    createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000),
  },
];

async function seedComplaints() {
  try {
    const existingCount = await Complaint.countDocuments();
    if (existingCount > 0) {
      console.log(`[Complaint Seed] Complaints collection already populated (${existingCount} records). Skipping default seed.`);
      return;
    }

    console.log('[Complaint Seed] Seeding Phase 6 geographic and intelligence complaint records...');

    // Fetch seeded authorities to link correctly
    const authorities = await Authority.find();
    const kmc = authorities.find((a) => a.code === 'KMC_VIGILANCE');
    const blrDha = authorities.find((a) => a.code === 'BLR_URBAN_DHA');
    const dmc = authorities.find((a) => a.code === 'DMC_ANTI_QUACKERY');

    for (const c of initialComplaints) {
      // Determine assigned authority
      let assignedAuth = kmc;
      if (c.facilityDetails.district === 'Bengaluru Urban') {
        assignedAuth = blrDha || kmc;
      } else if (c.facilityDetails.state === 'Delhi') {
        assignedAuth = dmc || kmc;
      }

      const complaintDoc = new Complaint({
        ...c,
        assignedAuthority: {
          authorityId: assignedAuth?._id || null,
          authorityCode: assignedAuth?.code || 'DEFAULT_AUTHORITY',
          authorityName: assignedAuth?.name || 'State Medical Council & District Health Authority',
          authorityType: assignedAuth?.type || 'STATE_MEDICAL_COUNCIL',
          jurisdiction: assignedAuth?.jurisdiction || 'State Medical Council',
          routingStatus: 'Your report has been routed for appropriate review.',
          assignedAt: c.createdAt,
        },
        routingDecision: {
          authorityId: assignedAuth?._id || null,
          authorityCode: assignedAuth?.code || 'DEFAULT_AUTHORITY',
          authorityName: assignedAuth?.name || 'State Medical Council',
          authorityType: assignedAuth?.type || 'STATE_MEDICAL_COUNCIL',
          reason: `Auto-routed under v2.0 jurisdiction matrix based on state (${c.facilityDetails.state}) and district (${c.facilityDetails.district}).`,
          routedAt: c.createdAt,
          routingRuleVersion: 'v2.0-jurisdiction-matrix',
        },
      });

      await complaintDoc.save();

      // Seed initial CaseEvent audit log for the complaint
      await CaseEvent.create({
        caseId: c.caseId,
        eventType: 'CASE_CREATED',
        actorId: 'citizen_anonymous',
        actorRole: 'CITIZEN',
        description: `Suspected unauthorized practice report submitted for ${c.facilityDetails.clinicName}.`,
        metadata: {
          category: c.category,
          district: c.facilityDetails.district,
          state: c.facilityDetails.state,
        },
        isInternal: false,
        timestamp: c.createdAt,
      });

      await CaseEvent.create({
        caseId: c.caseId,
        eventType: 'CASE_ROUTED',
        actorId: 'system',
        actorRole: 'SYSTEM',
        description: `Case routed to ${assignedAuth?.name || 'competent authority'} for formal inquiry.`,
        metadata: {
          authorityCode: assignedAuth?.code,
          authorityName: assignedAuth?.name,
        },
        isInternal: false,
        timestamp: new Date(c.createdAt.getTime() + 60 * 1000),
      });

      if (c.status !== 'SUBMITTED') {
        await CaseEvent.create({
          caseId: c.caseId,
          eventType: 'STATUS_CHANGED',
          actorId: c.assignedOfficer?.officerId || 'officer_default',
          actorRole: 'AUTHORITY_OFFICER',
          description: `Case transitioned to status: ${c.status}.`,
          metadata: {
            newStatus: c.status,
            officerName: c.assignedOfficer?.officerName || 'Investigating Officer',
          },
          isInternal: false,
          timestamp: new Date(c.createdAt.getTime() + 3600 * 1000),
        });
      }
    }

    console.log(`[Complaint Seed] Successfully seeded ${initialComplaints.length} complaint intelligence records with audit events.`);
  } catch (err) {
    console.error('[Complaint Seed] Error seeding complaints:', err.message);
  }
}

module.exports = { seedComplaints };
