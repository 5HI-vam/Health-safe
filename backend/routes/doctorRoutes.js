const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');

// Verification endpoint (Manual & Query based)
router.get('/verify', doctorController.verifyDoctor);

// QR Verification endpoint
router.get('/verify/qr/:registrationNumber', doctorController.verifyDoctorByQR);

// Multi-criteria search
router.get('/search', doctorController.searchDoctors);

// Metadata for dropdowns
router.get('/meta/councils', doctorController.getMetadata);

// Single record retrieval
router.get('/:id', doctorController.getDoctorById);

module.exports = router;
