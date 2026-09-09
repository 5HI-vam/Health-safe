const express = require('express');
const router = express.Router();
const patientSafetyController = require('../controllers/patientSafetyController');
const { uploadMiddleware } = require('../services/evidenceStorageService');
const { requireRole } = require('../middleware/authMiddleware');

// Citizen / Family: Submit Patient Safety & Care Grievance with optional evidence attachments
router.post(
  '/',
  uploadMiddleware.array('evidenceFiles', 5),
  patientSafetyController.createGrievance
);

// Citizen: Public sanitized tracking endpoint
router.get('/:caseId/status', patientSafetyController.getGrievanceStatus);
router.get('/:caseId/track', patientSafetyController.getGrievanceStatus);

// Full grievance details (sanitized if citizen, unredacted if officer)
router.get('/:caseId', patientSafetyController.getGrievanceByCaseId);

// Authority: Take authorized action on grievance
router.patch(
  '/:caseId/action',
  requireRole(['AUTHORITY_OFFICER', 'ADMIN']),
  patientSafetyController.updateGrievanceAction
);
router.post(
  '/:caseId/action',
  requireRole(['AUTHORITY_OFFICER', 'ADMIN']),
  patientSafetyController.updateGrievanceAction
);

module.exports = router;
