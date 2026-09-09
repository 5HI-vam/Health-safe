const express = require('express');
const router = express.Router();
const evidenceController = require('../controllers/evidenceController');
const { uploadMiddleware } = require('../services/evidenceStorageService');

// Case timeline audit log (public milestones for citizens; all events for officers)
router.get('/complaints/:caseId/timeline', evidenceController.getCaseTimeline);

// Case evidence locker listing with SHA-256 hashes
router.get('/complaints/:caseId/evidence', evidenceController.getCaseEvidence);

// Supplementary evidence upload
router.post(
  '/complaints/:caseId/evidence',
  uploadMiddleware.array('evidenceFiles', 5),
  evidenceController.uploadSupplementaryEvidence
);

// Secure evidence file download/stream (tamper-checked on disk before streaming)
router.get('/evidence/:id', evidenceController.streamEvidence);

module.exports = router;
