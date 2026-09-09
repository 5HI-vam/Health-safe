const mongoose = require('mongoose');
const doctorVerificationService = require('../services/doctorVerificationService');

/**
 * GET /api/doctors/verify?registrationNumber=
 * Verifies a doctor's registration number
 */
exports.verifyDoctor = async (req, res) => {
  try {
    const { registrationNumber } = req.query;

    if (!registrationNumber || !registrationNumber.trim()) {
      return res.status(400).json({
        success: false,
        status: 'Unable to Verify',
        error: 'Missing required query parameter: registrationNumber',
      });
    }

    const verificationResult = await doctorVerificationService.verifyDoctor(registrationNumber);

    if (verificationResult.status === 'Registration Not Found') {
      return res.status(404).json({
        success: false,
        ...verificationResult,
      });
    }

    if (verificationResult.status === 'Unable to Verify') {
      return res.status(500).json({
        success: false,
        ...verificationResult,
      });
    }

    return res.status(200).json({
      success: true,
      ...verificationResult,
    });
  } catch (error) {
    console.error('[DoctorController] verifyDoctor error:', error);
    return res.status(500).json({
      success: false,
      status: 'Unable to Verify',
      error: 'An internal error occurred while processing the verification request.',
    });
  }
};

/**
 * GET /api/doctors/search?name=&state=&council=
 * Multi-criteria search by name, state, and council
 */
exports.searchDoctors = async (req, res) => {
  try {
    const { name, state, council, limit, page } = req.query;

    if (!name && !state && !council) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least one search criterion (name, state, or council).',
      });
    }

    const searchResults = await doctorVerificationService.searchDoctors({
      name,
      state,
      council,
      limit,
      page,
    });

    return res.status(200).json({
      success: true,
      ...searchResults,
    });
  } catch (error) {
    console.error('[DoctorController] searchDoctors error:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while performing search.',
    });
  }
};

/**
 * GET /api/doctors/:id
 * Fetches single doctor record by ID
 */
exports.getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid doctor record ID format.',
      });
    }

    const doctor = await doctorVerificationService.getDoctorById(id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        status: 'Registration Not Found',
        error: 'Doctor record not found.',
      });
    }

    return res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    console.error('[DoctorController] getDoctorById error:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred.',
    });
  }
};

/**
 * GET /api/doctors/meta/councils
 * Returns list of councils and states for UI filters
 */
exports.getMetadata = async (req, res) => {
  try {
    const metadata = await doctorVerificationService.getMetadata();
    return res.status(200).json({
      success: true,
      ...metadata,
    });
  } catch (error) {
    console.error('[DoctorController] getMetadata error:', error);
    return res.status(500).json({
      success: false,
      councils: [],
      states: [],
    });
  }
};

/**
 * GET /api/doctors/verify/qr/:registrationNumber
 * Verifies doctor credential via QR identifier against MongoDB
 */
exports.verifyDoctorByQR = async (req, res) => {
  try {
    const { registrationNumber } = req.params;

    if (!registrationNumber || !registrationNumber.trim() || registrationNumber.length > 50) {
      return res.status(400).json({
        success: false,
        verificationStatus: 'UNABLE_TO_VERIFY',
        doctor: null,
        error: 'Invalid or malformed registration number identifier.',
        verifiedAt: new Date().toISOString(),
      });
    }

    const cleanRegNo = registrationNumber.trim();
    if (!/^[A-Za-z0-9\-\s/]+$/.test(cleanRegNo)) {
      return res.status(400).json({
        success: false,
        verificationStatus: 'UNABLE_TO_VERIFY',
        doctor: null,
        error: 'Registration number contains invalid characters.',
        verifiedAt: new Date().toISOString(),
      });
    }

    const result = await doctorVerificationService.verifyDoctor(cleanRegNo);

    if (result.status === 'Registration Verified' && result.doctor) {
      const safeDoctor = {
        name: result.doctor.name,
        registrationNumber: result.doctor.registrationNumber,
        qualification: result.doctor.qualification,
        council: result.doctor.council,
        state: result.doctor.state,
        registrationYear: result.doctor.registrationYear,
        status: result.doctor.status,
        specialty: result.doctor.specialty || 'General Practice',
      };

      return res.status(200).json({
        success: true,
        verificationStatus: 'VERIFIED',
        doctor: safeDoctor,
        source: result.source || 'State Medical Council Registry Archive',
        disclaimer: result.disclaimer,
        verifiedAt: new Date().toISOString(),
      });
    }

    if (result.status === 'Registration Not Found') {
      return res.status(404).json({
        success: false,
        verificationStatus: 'NOT_FOUND',
        doctor: null,
        source: result.source || 'Medical Council Registry Archive',
        message: 'Registration could not be verified',
        guidance: result.guidance,
        verifiedAt: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: false,
      verificationStatus: 'UNABLE_TO_VERIFY',
      doctor: result.doctor ? {
        name: result.doctor.name,
        registrationNumber: result.doctor.registrationNumber,
        status: result.doctor.status,
      } : null,
      source: result.source || 'Medical Council Registry Archive',
      message: result.doctor?.status === 'Suspended'
        ? 'Registration found but currently marked SUSPENDED by medical council.'
        : 'Registration could not be verified due to incomplete or restricted records.',
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DoctorController] verifyDoctorByQR error:', error);
    return res.status(500).json({
      success: false,
      verificationStatus: 'UNABLE_TO_VERIFY',
      doctor: null,
      error: 'An internal error occurred while processing the QR verification request.',
      verifiedAt: new Date().toISOString(),
    });
  }
};
