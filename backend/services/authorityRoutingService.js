const Authority = require('../models/Authority');

/**
 * Authority Routing Engine
 * Evaluates complaint category, state, district, and facility type against active
 * statutory authority jurisdiction configurations.
 */
class AuthorityRoutingService {
  constructor() {
    this.RULE_VERSION = 'v2.0-jurisdiction-matrix';
  }

  /**
   * Evaluates and selects the optimal statutory review authority for a given complaint.
   *
   * @param {Object} complaint
   * @returns {Promise<Object>} routingDecision
   */
  async routeComplaint(complaint) {
    const category = complaint.category || 'Suspected unauthorized medical practice';
    const state = (
      complaint.facility?.state ||
      complaint.facilityDetails?.state ||
      complaint.location?.state ||
      complaint.state ||
      ''
    ).trim();
    const district = (
      complaint.facility?.district ||
      complaint.facilityDetails?.district ||
      complaint.location?.district ||
      complaint.district ||
      ''
    ).trim();
    const clinicName = (
      complaint.facility?.name ||
      complaint.facilityDetails?.clinicName ||
      complaint.clinicName ||
      ''
    ).trim();

    // Fetch all active authorities from database
    let activeAuthorities = await Authority.find({ active: true }).lean();

    if (!activeAuthorities || activeAuthorities.length === 0) {
      console.warn('[AuthorityRoutingService] No active authorities in database. Using fallback emergency authority.');
      return this._generateFallbackDecision(state, category);
    }

    const scoredCandidates = [];

    for (const auth of activeAuthorities) {
      let score = 0;
      const reasons = [];

      // 1. STATE JURISDICTION MATCH
      const authState = (auth.state || '').trim().toLowerCase();
      const targetState = state.toLowerCase();

      if (authState === targetState) {
        score += 30;
        reasons.push(`State jurisdiction match (${auth.state})`);
      } else if (auth.type === 'OTHER_AUTHORITY' || auth.state.toLowerCase() === 'national') {
        score += 5; // National fallback
        reasons.push('National statutory oversight fallback');
      } else {
        // Mismatched state cannot take jurisdiction
        continue;
      }

      // 2. DISTRICT JURISDICTION SPECIFICITY
      const authDistrict = (auth.district || '').trim().toLowerCase();
      const targetDistrict = district.toLowerCase();

      if (authDistrict && targetDistrict) {
        if (authDistrict === targetDistrict) {
          score += 45; // High priority for local district enforcement proximity
          reasons.push(`Direct district-level jurisdiction (${auth.district})`);
        } else {
          // Authority is bound to a specific different district
          continue;
        }
      } else if (authDistrict && !targetDistrict) {
        // Authority is district-specific, but complaint did not provide district -> deprioritize
        score -= 10;
      }

      // 3. COMPLAINT CATEGORY MATCH
      const handlesCategory = Array.isArray(auth.categories) && auth.categories.some(
        (c) => c.toLowerCase() === category.toLowerCase() || category.toLowerCase().includes(c.toLowerCase())
      );

      if (handlesCategory) {
        score += 50;
        reasons.push(`Specialized mandate for category: "${category}"`);
      } else {
        score -= 10;
      }

      // 4. TYPE & FACILITY AFFINITY
      const isFacilityConcern =
        category === 'Suspected unauthorized clinic' ||
        category.toLowerCase().includes('clinic') ||
        Boolean(clinicName);

      const isRegistrationConcern =
        category === 'Registration could not be verified' ||
        category === 'Suspected fake qualification' ||
        category === 'Suspected forged certificate' ||
        category === 'Person claiming to be a doctor without verification';

      const isClinicalCareConcern =
        category === 'Critical-care concern' ||
        category === 'Treatment concern' ||
        category === 'Concern about communication regarding patient condition' ||
        category === 'Consent/documentation concern';

      const isEstablishmentGrievance =
        category === 'Billing concern' ||
        category === 'Medical records concern';

      if (isClinicalCareConcern) {
        if (auth.type === 'STATE_MEDICAL_COUNCIL') {
          score += 45;
          reasons.push('Statutory authority for clinical standards and medical ethics review');
        } else if (auth.type === 'DISTRICT_HEALTH_AUTHORITY') {
          score += 35;
          reasons.push('District Health Authority oversight over local healthcare delivery');
        }
      } else if (isEstablishmentGrievance) {
        if (auth.type === 'CLINICAL_ESTABLISHMENT_AUTHORITY') {
          score += 45;
          reasons.push('Clinical Establishments Authority mandate over transparent billing and patient records charters');
        } else if (auth.type === 'DISTRICT_HEALTH_AUTHORITY') {
          score += 35;
          reasons.push('District Health Officer enforcement mandate');
        }
      } else if (isFacilityConcern) {
        if (auth.type === 'CLINICAL_ESTABLISHMENT_AUTHORITY') {
          score += 40;
          reasons.push('Statutory mandate under Clinical Establishments Regulation Act');
        } else if (auth.type === 'DISTRICT_HEALTH_AUTHORITY') {
          score += 30;
          reasons.push('District Health Officer enforcement mandate over clinical facilities');
        } else if (auth.type === 'STATE_MEDICAL_COUNCIL') {
          score += 5;
        }
      } else if (isRegistrationConcern) {
        if (auth.type === 'STATE_MEDICAL_COUNCIL') {
          score += 45;
          reasons.push('Statutory register holder and disciplinary authority for medical practitioners');
        } else if (auth.type === 'DISTRICT_HEALTH_AUTHORITY') {
          score += 15;
        }
      } else {
        // General or other suspected practice
        if (auth.type === 'STATE_MEDICAL_COUNCIL') score += 25;
        if (auth.type === 'DISTRICT_HEALTH_AUTHORITY') score += 25;
      }

      // 5. CONFIGURABLE PRIORITY WEIGHT
      const configuredWeight = auth.priorityRules?.weight || 0;
      score += configuredWeight;

      scoredCandidates.push({
        authority: auth,
        score,
        reasonSummary: reasons.join('; '),
      });
    }

    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    if (scoredCandidates.length === 0) {
      return this._generateFallbackDecision(state, category);
    }

    const selected = scoredCandidates[0];
    const auth = selected.authority;

    const detailedReason = `Auto-routed to ${auth.name} under ${this.RULE_VERSION}. Factors: ${selected.reasonSummary}.`;

    return {
      authorityId: auth._id,
      authorityCode: auth.code,
      authorityName: auth.name,
      authorityType: auth.type,
      jurisdiction: auth.jurisdiction,
      reason: detailedReason,
      routedAt: new Date(),
      routingRuleVersion: this.RULE_VERSION,
      score: selected.score,
    };
  }

  _generateFallbackDecision(state, category) {
    return {
      authorityId: null,
      authorityCode: 'NMC_NATIONAL_FALLBACK',
      authorityName: 'National Medical Commission & State Statutory Health Directorate',
      authorityType: 'OTHER_AUTHORITY',
      jurisdiction: `${state || 'National'} Statutory Health Oversight Jurisdiction`,
      reason: `Default statutory routing applied for ${state || 'State'} under ${this.RULE_VERSION} for category: "${category}".`,
      routedAt: new Date(),
      routingRuleVersion: this.RULE_VERSION,
      score: 10,
    };
  }
}

const authorityRoutingService = new AuthorityRoutingService();

module.exports = {
  authorityRoutingService,
  AuthorityRoutingService,
};
