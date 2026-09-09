const Report = require('../models/Report');

/**
 * POST /api/reports
 * Submits a report for suspected unauthorized medical practice
 */
exports.submitReport = async (req, res) => {
  try {
    const {
      suspectName,
      claimedRegNumber,
      clinicName,
      city,
      state,
      reason,
      details,
      reporterName,
      reporterContact,
    } = req.body;

    if (!suspectName || !suspectName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Practitioner or clinic name is required.',
      });
    }

    if (!state || !state.trim()) {
      return res.status(400).json({
        success: false,
        error: 'State location is required.',
      });
    }

    if (!details || !details.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide descriptive details for your report.',
      });
    }

    const report = new Report({
      suspectName: suspectName.trim(),
      claimedRegNumber: claimedRegNumber ? claimedRegNumber.trim().toUpperCase() : undefined,
      clinicName: clinicName ? clinicName.trim() : undefined,
      city: city ? city.trim() : undefined,
      state: state.trim(),
      reason: reason || 'Registration Not Found in Registry',
      details: details.trim(),
      reporterName: reporterName ? reporterName.trim() : 'Anonymous Citizen',
      reporterContact: reporterContact ? reporterContact.trim() : undefined,
      status: 'Submitted',
    });

    const savedReport = await report.save();

    return res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Thank you for helping protect patient safety.',
      reportId: savedReport._id,
      timestamp: savedReport.createdAt,
    });
  } catch (error) {
    console.error('[ReportController] submitReport error:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while recording your report.',
    });
  }
};

/**
 * GET /api/reports
 * Helper for administrative review of submitted reports
 */
exports.getReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }).limit(50).lean();
    return res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error('[ReportController] getReports error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve reports.',
    });
  }
};
