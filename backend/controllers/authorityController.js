const Authority = require('../models/Authority');

/**
 * GET /api/authorities
 * List all active authorities with optional filtering by state, type, or district
 */
exports.getAuthorities = async (req, res) => {
  try {
    const { state, type, district, active } = req.query;
    const filter = {};

    if (state) filter.state = new RegExp(`^${state.trim()}$`, 'i');
    if (type) filter.type = type.trim();
    if (district) filter.district = new RegExp(`^${district.trim()}$`, 'i');
    if (active !== undefined) filter.active = active === 'true';

    const authorities = await Authority.find(filter).sort({ 'priorityRules.weight': -1, name: 1 }).lean();

    return res.json({
      success: true,
      count: authorities.length,
      authorities,
    });
  } catch (error) {
    console.error('[AuthorityController] getAuthorities error:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve statutory authorities at this time.',
    });
  }
};

/**
 * GET /api/authorities/:id
 * Retrieve a specific statutory authority by ID or Code
 */
exports.getAuthorityById = async (req, res) => {
  try {
    const { id } = req.params;

    let authority = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      authority = await Authority.findById(id).lean();
    } else {
      authority = await Authority.findOne({ code: id.toUpperCase() }).lean();
    }

    if (!authority) {
      return res.status(404).json({
        success: false,
        error: `Statutory authority "${id}" not found.`,
      });
    }

    return res.json({
      success: true,
      authority,
    });
  } catch (error) {
    console.error('[AuthorityController] getAuthorityById error:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve authority record.',
    });
  }
};

/**
 * POST /api/authorities
 * Configure a new statutory authority (ADMIN only)
 */
exports.createAuthority = async (req, res) => {
  try {
    const {
      name,
      code,
      type,
      state,
      district,
      jurisdiction,
      categories,
      facilityTypes,
      contactInformation,
      priorityRules,
    } = req.body;

    if (!name || !code || !type || !state || !jurisdiction) {
      return res.status(400).json({
        success: false,
        error: 'Required fields missing: name, code, type, state, and jurisdiction are mandatory.',
      });
    }

    const existing = await Authority.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Authority with code "${code.toUpperCase()}" already exists.`,
      });
    }

    const newAuth = new Authority({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      type,
      state: state.trim(),
      district: (district || '').trim(),
      jurisdiction: jurisdiction.trim(),
      categories: Array.isArray(categories) ? categories : ['Suspected unauthorized medical practice'],
      facilityTypes: Array.isArray(facilityTypes) ? facilityTypes : ['ALL'],
      contactInformation: contactInformation || {},
      priorityRules: priorityRules || { weight: 10 },
      active: true,
    });

    const saved = await newAuth.save();

    return res.status(201).json({
      success: true,
      message: 'Statutory authority configured successfully.',
      authority: saved,
    });
  } catch (error) {
    console.error('[AuthorityController] createAuthority error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create authority configuration.',
    });
  }
};

/**
 * PUT /api/authorities/:id
 * Update authority jurisdiction and rules (ADMIN only)
 */
exports.updateAuthority = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;

    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { code: id.toUpperCase() };

    const updated = await Authority.findOneAndUpdate(
      query,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Authority "${id}" not found.`,
      });
    }

    return res.json({
      success: true,
      message: 'Authority jurisdiction configuration updated successfully.',
      authority: updated,
    });
  } catch (error) {
    console.error('[AuthorityController] updateAuthority error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update authority configuration.',
    });
  }
};
