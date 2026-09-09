const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireRole } = require('../middleware/authMiddleware');

// All dashboard endpoints require authority officer or admin authorization
router.use(requireRole(['AUTHORITY_OFFICER', 'ADMIN']));

router.get('/summary', dashboardController.getSummary);
router.get('/categories', dashboardController.getCategories);
router.get('/districts', dashboardController.getDistricts);
router.get('/trends', dashboardController.getTrends);
router.get('/map', dashboardController.getMapData);
router.get('/related-cases', dashboardController.getRelatedCases);
router.get('/cases', dashboardController.getDashboardCases);

module.exports = router;
