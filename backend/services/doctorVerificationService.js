const Doctor = require('../models/Doctor');
const { getDBStatus } = require('../config/db');

/**
 * Standard Legal & Ethical Disclaimer
 * Strictly aligns with clinical credential verification standards.
 */
const VERIFICATION_DISCLAIMER =
  'Verification indicates only that an official registration record exists in the designated medical council archive. It is NOT an endorsement of clinical competence, safety, or medical quality.';

/**
 * External Registry Adapter Interface (Stub for future live government API integration)
 */
class ExternalGovtRegistryAdapter {
  constructor() {
    this.name = 'National Medical Register (NMC) Live API Adapter';
    this.isLive = false; // Flagged as stub for prototype
  }

  async fetchRecordByRegNo(normalizedRegNo) {
    // In production, this would make authenticated HTTPS calls to the official NMC/SMC API gateway.
    // For the prototype, returns null to fall back to cached/seeded demonstration archive.
    return null;
  }
}

const externalAdapter = new ExternalGovtRegistryAdapter();

class DoctorVerificationService {
  /**
   * Normalizes a registration number for resilient querying
   * @param {string} regNo 
   * @returns {string} Normalized alphanumeric string
   */
  normalizeRegistrationNumber(regNo) {
    if (!regNo || typeof regNo !== 'string') return '';
    return regNo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Verifies a doctor primarily via authoritative cached registry / seed records,
   * falling back to external live registry when configured.
   * 
   * @param {string} registrationNumber 
   * @returns {Promise<Object>} Standardized verification response
   */
  async verifyDoctor(registrationNumber) {
    if (!registrationNumber || typeof registrationNumber !== 'string' || !registrationNumber.trim()) {
      throw new Error('A valid registration number must be provided.');
    }

    const normalized = this.normalizeRegistrationNumber(registrationNumber);
    const dbStatus = getDBStatus();

    try {
      // 1. Check live external registry adapter if enabled
      if (externalAdapter.isLive) {
        const liveRecord = await externalAdapter.fetchRecordByRegNo(normalized);
        if (liveRecord) {
          return this._formatVerificationResponse({
            status: 'Registration Verified',
            isVerified: true,
            doctor: liveRecord,
            source: externalAdapter.name,
            searchedQuery: { registrationNumber },
          });
        }
      }

      // 2. Query cached/seeded authoritative MongoDB registry
      let record = null;
      if (dbStatus.isConnected) {
        record = await Doctor.findOne({
          $or: [
            { normalizedRegNo: normalized },
            { registrationNumber: new RegExp(`^${registrationNumber.trim()}$`, 'i') },
          ],
        }).lean();
      }

      // 3. Evaluate record and assign standardized status
      if (record) {
        const isSuspendedOrLapsed = ['Suspended', 'Lapsed', 'Under Review'].includes(record.status);
        const verificationStatus = isSuspendedOrLapsed ? 'Registration Found' : 'Registration Verified';

        return this._formatVerificationResponse({
          status: verificationStatus,
          isVerified: !isSuspendedOrLapsed,
          doctor: record,
          source: record.source || 'State Medical Council Registry (Demonstration Archive)',
          searchedQuery: { registrationNumber },
        });
      }

      // 4. Record not found
      return this._formatVerificationResponse({
        status: 'Registration Not Found',
        isVerified: false,
        doctor: null,
        source: 'Health-Safe Registry Database & Verified Demonstration Archive',
        searchedQuery: { registrationNumber },
        guidance:
          'No matching medical registration was found. Please double-check for typos, confirm the state council, or report suspected unauthorized practice if a practitioner cannot provide valid credentials.',
      });
    } catch (err) {
      console.error('[DoctorVerificationService] Verification error:', err);
      return this._formatVerificationResponse({
        status: 'Unable to Verify',
        isVerified: false,
        doctor: null,
        source: 'Registry Service',
        searchedQuery: { registrationNumber },
        error: 'The verification system encountered a temporary error while querying registry archives.',
      });
    }
  }

  /**
   * Multi-criteria search by Name, State, and Council
   */
  async searchDoctors({ name, state, council, limit = 20, page = 1 }) {
    const filter = {};

    if (name && name.trim()) {
      // Case-insensitive regex on practitioner name
      filter.name = { $regex: name.trim(), $options: 'i' };
    }

    if (state && state.trim()) {
      filter.state = { $regex: `^${state.trim()}$`, $options: 'i' };
    }

    if (council && council.trim()) {
      filter.council = { $regex: council.trim(), $options: 'i' };
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [results, total] = await Promise.all([
      Doctor.find(filter).sort({ name: 1 }).skip(skip).limit(safeLimit).lean(),
      Doctor.countDocuments(filter),
    ]);

    return {
      status: results.length > 0 ? 'Results Found' : 'No Results Found',
      totalCount: total,
      page: safePage,
      limit: safeLimit,
      disclaimer: VERIFICATION_DISCLAIMER,
      doctors: results.map((doc) => ({
        ...doc,
        verificationStatus: doc.status === 'Active' ? 'Registration Verified' : 'Registration Found',
      })),
    };
  }

  /**
   * Fetch single doctor record by MongoDB ID
   */
  async getDoctorById(id) {
    const doctor = await Doctor.findById(id).lean();
    if (!doctor) return null;

    return {
      ...doctor,
      verificationStatus: doctor.status === 'Active' ? 'Registration Verified' : 'Registration Found',
      disclaimer: VERIFICATION_DISCLAIMER,
    };
  }

  /**
   * Returns distinct list of councils and states for search dropdowns
   */
  async getMetadata() {
    const [councils, states] = await Promise.all([
      Doctor.distinct('council'),
      Doctor.distinct('state'),
    ]);

    return { councils: councils.sort(), states: states.sort() };
  }

  /**
   * Standardizes response payload
   */
  _formatVerificationResponse({ status, isVerified, doctor, source, searchedQuery, guidance, error }) {
    return {
      status, // 'Registration Verified' | 'Registration Found' | 'Registration Not Found' | 'Unable to Verify'
      isVerified,
      doctor: doctor || null,
      source: source || 'Medical Council Registry Archive',
      disclaimer: VERIFICATION_DISCLAIMER,
      lastVerifiedAt: doctor?.lastVerifiedAt || new Date().toISOString(),
      searchedQuery,
      guidance: guidance || null,
      error: error || null,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new DoctorVerificationService();
