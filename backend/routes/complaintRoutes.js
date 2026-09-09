const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { uploadMiddleware } = require('../services/evidenceStorageService');
const { requireRole } = require('../middleware/authMiddleware');

// Citizen: Submit complaint with optional multiple evidence attachments (max 5 files, 5MB each)
router.post(
  '/',
  uploadMiddleware.array('evidenceFiles', 5),
  complaintController.createComplaint
);

// Citizen: Public case tracking endpoint
router.get('/:caseId/status', complaintController.getComplaintStatus);
router.get('/:caseId/track', complaintController.getComplaintStatus);

// Authority: Officer queue with KPI counts (requires AUTHORITY_OFFICER or ADMIN)
router.get(
  '/authority/cases',
  requireRole(['AUTHORITY_OFFICER', 'ADMIN']),
  complaintController.getAuthorityCases
);

// Authority / Admin: Route or re-route complaint
router.post(
  '/:caseId/route',
  requireRole(['AUTHORITY_OFFICER', 'ADMIN']),
  complaintController.routeComplaintEndpoint
);

// Authority: Take authorized action on case (accept, assign, change status, add note, record action, close)
router.patch(
  '/:caseId/action',
  requireRole(['AUTHORITY_OFFICER', 'ADMIN']),
  complaintController.updateCaseAction
);
router.post(
  '/:caseId/action',
  requireRole(['AUTHORITY_OFFICER', 'ADMIN']),
  complaintController.updateCaseAction
);

// Full case details (with internal notes sanitized if citizen)
router.get('/:caseId', complaintController.getComplaintByCaseId);

module.exports = router;
