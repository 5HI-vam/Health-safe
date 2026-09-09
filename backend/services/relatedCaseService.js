const Complaint = require('../models/Complaint');

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Calculate Haversine distance in kilometers between two lat/lng coordinates
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Detects potentially related complaints using registration number, facility,
 * geographic proximity, and category attributes.
 *
 * IMPORTANT STATUTORY RULE:
 * Strictly labeled as "Potentially related cases".
 * Do NOT label as "Repeat offender" or declare unlawful activity.
 */
async function findRelatedCases(caseId, options = {}) {
  const sourceCase = await Complaint.findOne({
    $or: [{ caseId }, { _id: caseId.match(/^[0-9a-fA-F]{24}$/) ? caseId : null }],
  }).lean();

  if (!sourceCase) {
    return {
      sourceCaseId: caseId,
      label: 'Potentially related cases',
      totalFound: 0,
      relatedCases: [],
      statutoryDisclaimer:
        'Potentially related cases are identified using preliminary algorithmic correlation of credentials, facility names, or geographic proximity. This does not establish guilt, repeat offending, or legal determination.',
    };
  }

  const regNum = sourceCase.practitionerDetails?.registrationNumber?.trim()?.toUpperCase() || '';
  const practitionerName = sourceCase.practitionerDetails?.name?.trim() || '';
  const clinicName = sourceCase.facilityDetails?.clinicName?.trim() || '';
  const district = sourceCase.facilityDetails?.district?.trim() || '';
  const state = sourceCase.facilityDetails?.state?.trim() || '';
  const category = sourceCase.category || '';
  const srcLat = sourceCase.location?.latitude;
  const srcLng = sourceCase.location?.longitude;

  const orConditions = [];

  // Match 1: Registration number (high correlation)
  if (regNum && regNum.length >= 4 && !regNum.includes('UNKNOWN') && !regNum.includes('CLAIMED')) {
    orConditions.push({ 'practitionerDetails.registrationNumber': regNum });
  }

  // Match 2: Clinic/Facility name
  if (clinicName && clinicName.length >= 3 && !clinicName.toLowerCase().includes('unknown')) {
    orConditions.push({
      'facilityDetails.clinicName': new RegExp(escapeRegex(clinicName), 'i'),
    });
  }

  // Match 3: Practitioner name
  if (
    practitionerName &&
    practitionerName.length >= 4 &&
    !practitionerName.toLowerCase().includes('unknown') &&
    !practitionerName.toLowerCase().includes('unspecified')
  ) {
    orConditions.push({
      'practitionerDetails.name': new RegExp(escapeRegex(practitionerName), 'i'),
    });
  }

  // Match 4: Geographic district proximity
  if (district && state) {
    orConditions.push({
      'facilityDetails.district': district,
      'facilityDetails.state': state,
    });
  }

  if (orConditions.length === 0) {
    return {
      sourceCaseId: sourceCase.caseId,
      label: 'Potentially related cases',
      totalFound: 0,
      relatedCases: [],
      statutoryDisclaimer:
        'Potentially related cases are identified using preliminary algorithmic correlation of credentials, facility names, or geographic proximity. This does not establish guilt, repeat offending, or legal determination.',
    };
  }

  // Search candidate complaints (exclude source case)
  const candidates = await Complaint.find({
    caseId: { $ne: sourceCase.caseId },
    $or: orConditions,
  })
    .select(
      'caseId category status priority facilityDetails practitionerDetails location createdAt assignedAuthority routingDecision'
    )
    .limit(options.limit || 15)
    .lean();

  const scoredResults = [];

  for (const candidate of candidates) {
    let score = 0;
    const reasons = [];

    const candReg = candidate.practitionerDetails?.registrationNumber?.trim()?.toUpperCase() || '';
    const candClinic = candidate.facilityDetails?.clinicName?.trim() || '';
    const candName = candidate.practitionerDetails?.name?.trim() || '';
    const candDistrict = candidate.facilityDetails?.district?.trim() || '';
    const candState = candidate.facilityDetails?.state?.trim() || '';

    // Registration match (+50 pts)
    if (regNum && candReg && regNum === candReg) {
      score += 50;
      reasons.push(`Exact Practitioner Registration Match: ${regNum}`);
    }

    // Clinic name match (+35 pts)
    if (clinicName && candClinic) {
      if (clinicName.toLowerCase() === candClinic.toLowerCase()) {
        score += 35;
        reasons.push(`Identical Facility Name: "${candClinic}"`);
      } else if (
        candClinic.toLowerCase().includes(clinicName.toLowerCase()) ||
        clinicName.toLowerCase().includes(candClinic.toLowerCase())
      ) {
        score += 25;
        reasons.push(`Partial Facility Name Match: "${candClinic}"`);
      }
    }

    // Practitioner name match (+30 pts)
    if (
      practitionerName &&
      candName &&
      !practitionerName.toLowerCase().includes('unknown') &&
      !candName.toLowerCase().includes('unknown')
    ) {
      if (practitionerName.toLowerCase() === candName.toLowerCase()) {
        score += 30;
        reasons.push(`Practitioner Name Match: "${candName}"`);
      }
    }

    // Proximity check (+15 - 25 pts)
    const distanceKm = calculateDistanceKm(
      srcLat,
      srcLng,
      candidate.location?.latitude,
      candidate.location?.longitude
    );

    if (distanceKm !== null && distanceKm <= 10) {
      score += 25;
      reasons.push(`Geographic Proximity: ${distanceKm} km apart`);
    } else if (district && candDistrict && district.toLowerCase() === candDistrict.toLowerCase()) {
      score += 15;
      reasons.push(`Same District Jurisdiction: ${district}`);
    }

    // Category match (+10 pts)
    if (category && candidate.category === category) {
      score += 10;
      reasons.push(`Identical Concern Category: "${category}"`);
    }

    // Minimum correlation threshold
    if (score >= 25) {
      scoredResults.push({
        caseId: candidate.caseId,
        relationshipScore: score,
        correlationStrength: score >= 60 ? 'STRONG_CORRELATION' : 'MODERATE_CORRELATION',
        reasons,
        category: candidate.category,
        status: candidate.status,
        priority: candidate.priority,
        facilityName: candidate.facilityDetails?.clinicName || 'Facility Unspecified',
        district: candDistrict || 'Unspecified',
        state: candState || 'Unspecified',
        practitionerName: candidate.practitionerDetails?.name || 'Unspecified',
        registrationNumber: candReg || null,
        distanceKm,
        createdAt: candidate.createdAt,
        assignedAuthorityName: candidate.assignedAuthority?.authorityName || null,
      });
    }
  }

  // Sort by correlation score descending
  scoredResults.sort((a, b) => b.relationshipScore - a.relationshipScore);

  return {
    sourceCaseId: sourceCase.caseId,
    label: 'Potentially related cases',
    totalFound: scoredResults.length,
    relatedCases: scoredResults,
    statutoryDisclaimer:
      'Potentially related cases are identified using preliminary algorithmic correlation of credentials, facility names, or geographic proximity. This does not establish guilt, repeat offending, or legal determination.',
  };
}

module.exports = { findRelatedCases, calculateDistanceKm };
