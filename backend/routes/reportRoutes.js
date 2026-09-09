const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.post('/', reportController.submitReport);
router.get('/', reportController.getReports);

module.exports = router;
