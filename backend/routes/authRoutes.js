const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.get('/me', authController.getMe);
router.get('/demo-accounts', authController.getDemoAccounts);

module.exports = router;
