const express = require('express');
const router = express.Router();
const authorityController = require('../controllers/authorityController');
const { requireRole } = require('../middleware/authMiddleware');

// Public authority discovery
router.get('/', authorityController.getAuthorities);
router.get('/:id', authorityController.getAuthorityById);

// Admin-only authority & jurisdiction configuration
router.post('/', requireRole(['ADMIN']), authorityController.createAuthority);
router.put('/:id', requireRole(['ADMIN']), authorityController.updateAuthority);

module.exports = router;
