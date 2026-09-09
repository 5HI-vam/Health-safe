const Complaint = require('../models/Complaint');
const { findRelatedCases } = require('../services/relatedCaseService');

// Known geographic centroids for major districts (with deterministic fallback)
const DISTRICT_CENTROIDS = {
  'bengaluru urban': { lat: 12.9716, lng: 77.5946 },
  'bengaluru rural': { lat: 13.2847, lng: 77.5815 },
  'mysuru': { lat: 12.2958, lng: 76.6394 },
  'central delhi': { lat: 28.6139, lng: 77.209 },
  'south delhi': { lat: 28.4817, lng: 77.1873 },
  'new delhi': { lat: 28.6129, lng: 77.2295 },
  'mumbai suburban': { lat: 19.076, lng: 72.8777 },
  'mumbai': { lat: 18.922, lng: 72.8347 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'hyderabad': { lat: 17.385, lng: 78.4867 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'lucknow': { lat: 26.8467, lng: 80.9462 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'patna': { lat: 25.5941, lng: 85.1376 },
};

/**
 * Maps statutory complaint categories into the 4 requested map marker categories:
 * - Unauthorized practitioner
 * - Facility concern
 * - Patient safety concern
 * - Billing concern
 */
function getMarkerCategory(category = '', description = '') {
  const catLower = category.toLowerCase();
  const descLower = description.toLowerCase();

  if (
    catLower.includes('unauthorized clinic') ||
    catLower.includes('establishment') ||
    descLower.includes('facility license') ||
    descLower.includes('nursing home')
  ) {
    return 'Facility concern';
  }

  if (
    descLower.includes('billing') ||
    descLower.includes('receipt') ||
    descLower.includes('overcharg') ||
    catLower === 'other'
  ) {
    return 'Billing concern';
  }

  if (
    descLower.includes('resuscitation') ||
    descLower.includes('sterilization') ||
    descLower.includes('harm') ||
    descLower.includes('safety') ||
    descLower.includes('adverse')
  ) {
    return 'Patient safety concern';
  }

  // Default for unverified / fake qualification / unauthorized practice
  return 'Unauthorized practitioner';
}

/**
 * Build base MongoDB match filter based on user authority scope or query filters
 */
function buildScopeMatch(user, query = {}) {
  const match = {};

  // If user is an authority officer with specific authority scope, apply unless admin
  if (user && user.role === 'AUTHORITY_OFFICER' && user.authorityId) {
    // Officers can view cases assigned to their authority or jurisdiction
    match.$or = [
      { 'assignedAuthority.authorityId': user.authorityId },
      { 'assignedAuthority.authorityCode': user.authorityCode },
    ];
    if (user.state) {
      match.$or.push({ 'facilityDetails.state': user.state });
    }
  }

  // Query parameter overrides
  if (query.state && query.state !== 'ALL') {
    match['facilityDetails.state'] = query.state;
  }

  if (query.district && query.district !== 'ALL') {
    match['facilityDetails.district'] = query.district;
  }

  if (query.status && query.status !== 'ALL') {
    match.status = query.status;
  }

  if (query.category && query.category !== 'ALL') {
    match.category = query.category;
  }

  if (query.priority && query.priority !== 'ALL') {
    match.priority = query.priority;
  }

  if (query.dateFrom || query.dateTo) {
    match.createdAt = {};
    if (query.dateFrom) match.createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) match.createdAt.$lte = new Date(query.dateTo);
  }

  return match;
}

/**
 * GET /api/dashboard/summary
 * Returns KPI aggregates: total, new, under review, high priority, assigned, resolved
 */
exports.getSummary = async (req, res) => {
  try {
    const matchQuery = buildScopeMatch(req.user, req.query);

    const [facetResults] = await Complaint.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          total: [{ $count: 'count' }],
          newCases: [{ $match: { status: 'SUBMITTED' } }, { $count: 'count' }],
          underReview: [
            { $match: { status: { $in: ['UNDER_REVIEW', 'INVESTIGATION', 'EVIDENCE_REQUESTED'] } } },
            { $count: 'count' },
          ],
          highPriority: [
            { $match: { priority: { $in: ['HIGH', 'CRITICAL'] } } },
            { $count: 'count' },
          ],
          assigned: [
            { $match: { status: 'ASSIGNED' } },
            { $count: 'count' },
          ],
          resolved: [
            { $match: { status: 'RESOLVED' } },
            { $count: 'count' },
          ],
          actionTaken: [
            { $match: { status: 'ACTION_TAKEN' } },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const summary = {
      totalReports: facetResults?.total?.[0]?.count || 0,
      newReports: facetResults?.newCases?.[0]?.count || 0,
      underReview: facetResults?.underReview?.[0]?.count || 0,
      highPriority: facetResults?.highPriority?.[0]?.count || 0,
      assigned: facetResults?.assigned?.[0]?.count || 0,
      resolved: facetResults?.resolved?.[0]?.count || 0,
      actionTaken: facetResults?.actionTaken?.[0]?.count || 0,
      statutoryNotice:
        'Report counts represent submitted inquiries under regulatory review and do not constitute formal declarations of culpability.',
    };

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('[Dashboard] getSummary error:', error);
    res.status(500).json({ success: false, error: 'Failed to aggregate dashboard summary' });
  }
};

/**
 * GET /api/dashboard/categories
 * Returns complaint breakdown by category using MongoDB aggregation pipeline
 */
exports.getCategories = async (req, res) => {
  try {
    const matchQuery = buildScopeMatch(req.user, req.query);

    const totalCount = await Complaint.countDocuments(matchQuery);

    const categoryStats = await Complaint.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          highPriorityCount: {
            $sum: { $cond: [{ $in: ['$priority', ['HIGH', 'CRITICAL']] }, 1, 0] },
          },
          underReviewCount: {
            $sum: {
              $cond: [
                { $in: ['$status', ['UNDER_REVIEW', 'INVESTIGATION', 'EVIDENCE_REQUESTED']] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          category: '$_id',
          count: 1,
          highPriorityCount: 1,
          underReviewCount: 1,
        },
      },
    ]);

    const formatted = categoryStats.map((item) => ({
      ...item,
      percentage: totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0,
    }));

    res.json({
      success: true,
      totalCount,
      data: formatted,
    });
  } catch (error) {
    console.error('[Dashboard] getCategories error:', error);
    res.status(500).json({ success: false, error: 'Failed to aggregate category distribution' });
  }
};

/**
 * GET /api/dashboard/districts
 * Heatmap / District-level summary:
 * District, Reported cases, Cases under review, Category distribution, Trend
 */
exports.getDistricts = async (req, res) => {
  try {
    const matchQuery = buildScopeMatch(req.user, req.query);

    const districtStats = await Complaint.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            district: {
              $cond: [
                { $and: ['$facilityDetails.district', { $ne: ['$facilityDetails.district', ''] }] },
                '$facilityDetails.district',
                'Unspecified District',
              ],
            },
            state: {
              $cond: [
                { $and: ['$facilityDetails.state', { $ne: ['$facilityDetails.state', ''] }] },
                '$facilityDetails.state',
                'Statewide',
              ],
            },
          },
          reportedCases: { $sum: 1 },
          casesUnderReview: {
            $sum: {
              $cond: [
                { $in: ['$status', ['UNDER_REVIEW', 'INVESTIGATION', 'EVIDENCE_REQUESTED']] },
                1,
                0,
              ],
            },
          },
          highPriorityCount: {
            $sum: { $cond: [{ $in: ['$priority', ['HIGH', 'CRITICAL']] }, 1, 0] },
          },
          resolvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] },
          },
          categories: { $push: '$category' },
          recentDates: { $push: '$createdAt' },
        },
      },
      { $sort: { reportedCases: -1 } },
    ]);

    const formatted = districtStats.map((d) => {
      // Calculate category distribution counts
      const categoryDistribution = {};
      d.categories.forEach((cat) => {
        categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
      });

      // Calculate simple trend based on created dates within last 7 days vs older
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;
      const recentCount = d.recentDates.filter((dt) => new Date(dt).getTime() >= sevenDaysAgo).length;
      let trend = 'STABLE';
      if (recentCount >= 2) trend = 'INCREASING';
      else if (d.resolvedCount > d.casesUnderReview) trend = 'DECREASING';

      return {
        district: d._id.district,
        state: d._id.state,
        reportedCases: d.reportedCases,
        casesUnderReview: d.casesUnderReview,
        highPriorityCount: d.highPriorityCount,
        resolvedCount: d.resolvedCount,
        categoryDistribution,
        trend,
      };
    });

    res.json({
      success: true,
      statutoryNotice:
        'A high number of reported cases does not indicate guilt or criminal activity; all matters represent reported inquiries subject to formal verification.',
      data: formatted,
    });
  } catch (error) {
    console.error('[Dashboard] getDistricts error:', error);
    res.status(500).json({ success: false, error: 'Failed to aggregate district heatmap' });
  }
};

/**
 * GET /api/dashboard/trends
 * Returns reports over time using MongoDB date grouping
 */
exports.getTrends = async (req, res) => {
  try {
    const matchQuery = buildScopeMatch(req.user, req.query);

    const trendStats = await Complaint.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          total: { $sum: 1 },
          highPriority: {
            $sum: { $cond: [{ $in: ['$priority', ['HIGH', 'CRITICAL']] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          total: 1,
          highPriority: 1,
          resolved: 1,
        },
      },
    ]);

    res.json({ success: true, data: trendStats });
  } catch (error) {
    console.error('[Dashboard] getTrends error:', error);
    res.status(500).json({ success: false, error: 'Failed to aggregate trend metrics' });
  }
};

/**
 * GET /api/dashboard/map
 * Returns sanitized geographic markers for permitted complaint data
 * Strictly strips patient details and personal phone numbers!
 */
exports.getMapData = async (req, res) => {
  try {
    const matchQuery = buildScopeMatch(req.user, req.query);

    const complaints = await Complaint.find(matchQuery)
      .select('caseId category status priority facilityDetails location createdAt evidence description')
      .lean();

    const mapPoints = [];

    complaints.forEach((c, index) => {
      let lat = c.location?.latitude;
      let lng = c.location?.longitude;

      const district = c.facilityDetails?.district?.trim() || '';
      const state = c.facilityDetails?.state?.trim() || '';
      const districtKey = district.toLowerCase();

      // If exact coordinates are missing, fall back to known district centroid with deterministic jitter
      if (lat == null || lng == null) {
        const centroid = DISTRICT_CENTROIDS[districtKey] || { lat: 20.5937, lng: 78.9629 };
        // Jitter based on caseId hash so multiple pins in same district disperse slightly
        const hash = (c.caseId || `case_${index}`)
          .split('')
          .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        const jitterLat = ((hash % 100) - 50) * 0.0007;
        const jitterLng = (((hash * 7) % 100) - 50) * 0.0007;

        lat = centroid.lat + jitterLat;
        lng = centroid.lng + jitterLng;
      }

      const markerCategory = getMarkerCategory(c.category, c.description);

      mapPoints.push({
        caseId: c.caseId,
        category: c.category,
        markerCategory,
        status: c.status,
        priority: c.priority,
        facilityName: c.facilityDetails?.clinicName || 'Facility Unspecified',
        district: district || 'Unspecified',
        state: state || 'Unspecified',
        coordinates: [lat, lng],
        hasEvidence: Boolean(c.evidence && c.evidence.length > 0),
        createdAt: c.createdAt,
      });
    });

    res.json({
      success: true,
      totalMarkers: mapPoints.length,
      statutoryNotice:
        'Geographic markers represent reported inquiry locations. Marker density does not constitute a legal finding or declaration of unlawful activity.',
      data: mapPoints,
    });
  } catch (error) {
    console.error('[Dashboard] getMapData error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve map points' });
  }
};

/**
 * GET /api/dashboard/related-cases
 * Detects potentially related cases by registration number, facility, proximity
 */
exports.getRelatedCases = async (req, res) => {
  try {
    const { caseId } = req.query;
    if (!caseId) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "caseId" is required to find potentially related cases',
      });
    }

    const result = await findRelatedCases(caseId, { limit: parseInt(req.query.limit, 10) || 10 });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Dashboard] getRelatedCases error:', error);
    res.status(500).json({ success: false, error: 'Failed to identify potentially related cases' });
  }
};

/**
 * GET /api/dashboard/cases
 * Paginated and filtered case register table
 */
exports.getDashboardCases = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const matchQuery = buildScopeMatch(req.user, req.query);

    // Free-text search
    if (req.query.search && req.query.search.trim()) {
      const s = req.query.search.trim();
      matchQuery.$or = [
        { caseId: new RegExp(s, 'i') },
        { 'facilityDetails.clinicName': new RegExp(s, 'i') },
        { 'facilityDetails.district': new RegExp(s, 'i') },
        { 'practitionerDetails.registrationNumber': new RegExp(s, 'i') },
        { 'practitionerDetails.name': new RegExp(s, 'i') },
      ];
    }

    const total = await Complaint.countDocuments(matchQuery);
    const cases = await Complaint.find(matchQuery)
      .select(
        'caseId category status priority facilityDetails practitionerDetails assignedOfficer assignedAuthority createdAt evidence routingDecision'
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formatted = cases.map((c) => ({
      _id: c._id,
      caseId: c.caseId,
      category: c.category,
      district: c.facilityDetails?.district || 'Unspecified',
      state: c.facilityDetails?.state || 'Unspecified',
      facilityName: c.facilityDetails?.clinicName || 'Unspecified',
      practitionerName: c.practitionerDetails?.name || 'Unspecified',
      registrationNumber: c.practitionerDetails?.registrationNumber || '',
      priority: c.priority,
      status: c.status,
      assignedOfficer: c.assignedOfficer?.officerName || 'Unassigned',
      assignedAuthorityName: c.assignedAuthority?.authorityName || 'State Medical Council',
      evidenceCount: c.evidence?.length || 0,
      createdAt: c.createdAt,
    }));

    res.json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      data: formatted,
    });
  } catch (error) {
    console.error('[Dashboard] getDashboardCases error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve cases register' });
  }
};
