const Complaint = require('../models/Complaint');
const Evidence = require('../models/Evidence');
const { evidenceStorageService } = require('../services/evidenceStorageService');
const { authorityRoutingService } = require('../services/authorityRoutingService');
const { caseTimelineService } = require('../services/caseTimelineService');

/**
 * POST /api/complaints
 * Submits a new incident report for suspected unauthorized practice
 */
exports.createComplaint = async (req, res) => {
  try {
    const {
      practitionerName,
      registrationNumber,
      practitionerPhone,
      qualificationClaimed,
      clinicName,
      address,
      district,
      state,
      category,
      description,
      incidentDate,
      latitude,
      longitude,
      reporterName,
      reporterContact,
      reporterConsent,
    } = req.body;

    // Validate mandatory fields
    if (!state || !state.trim()) {
      return res.status(400).json({
        success: false,
        error: 'State jurisdiction is required for statutory authority routing.',
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Incident description is required.',
      });
    }

    const consentValue = reporterConsent === true || reporterConsent === 'true';
    if (!consentValue) {
      return res.status(400).json({
        success: false,
        error: 'You must confirm the good-faith declaration to submit this report.',
      });
    }

    // Process attached evidence files
    const evidenceList = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const evidenceMetadata = await evidenceStorageService.processUploadedEvidence(file);
        evidenceList.push(evidenceMetadata);
      }
    }

    // Generate unique formatted Case ID
    const caseId = await Complaint.generateCaseId();

    // Dynamically evaluate routing using the Authority Routing Engine
    const routingDecision = await authorityRoutingService.routeComplaint({
      category: category || 'Suspected unauthorized medical practice',
      state: state.trim(),
      district: (district || '').trim(),
      clinicName: (clinicName || '').trim(),
      practitionerName: (practitionerName || '').trim(),
    });

    const assignedAuthority = {
      authorityId: routingDecision.authorityId,
      authorityCode: routingDecision.authorityCode,
      authorityName: routingDecision.authorityName,
      authorityType: routingDecision.authorityType,
      jurisdiction: routingDecision.jurisdiction,
      routingStatus: 'Your report has been routed for appropriate review.',
      assignedAt: routingDecision.routedAt,
    };

    const newComplaint = new Complaint({
      caseId,
      category: category || 'Suspected unauthorized medical practice',
      practitionerDetails: {
        name: (practitionerName || '').trim() || 'Unspecified Practitioner',
        registrationNumber: (registrationNumber || '').trim().toUpperCase(),
        phone: (practitionerPhone || '').trim(),
        qualificationClaimed: (qualificationClaimed || '').trim(),
      },
      facilityDetails: {
        clinicName: (clinicName || '').trim() || 'Unspecified Clinic / Facility',
        address: (address || '').trim(),
        district: (district || '').trim(),
        state: state.trim(),
      },
      description: description.trim(),
      incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
      location: {
        address: (address || '').trim(),
        district: (district || '').trim(),
        state: state.trim(),
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
      status: 'SUBMITTED',
      priority: 'MEDIUM',
      evidence: evidenceList,
      assignedAuthority,
      routingDecision,
      reporterDetails: {
        name: (reporterName || '').trim() || 'Anonymous Citizen',
        contact: (reporterContact || '').trim(),
      },
      reporterConsent: true,
      caseTimeline: [
        {
          status: 'SUBMITTED',
          timestamp: new Date(),
          notes: `Report received and securely registered. Routed to ${routingDecision.authorityName}.`,
        },
      ],
    });

    const saved = await newComplaint.save();

    // Persist attached files to Evidence model with verified SHA-256
    if (evidenceList.length > 0) {
      for (const ev of evidenceList) {
        const evDoc = new Evidence({
          caseId: saved.caseId,
          fileName: ev.fileName,
          fileType: ev.fileType,
          fileCategory: 'DOCUMENT',
          size: ev.size,
          storageReference: ev.storageReference,
          sha256Hash: ev.sha256Hash,
          uploadedByRole: 'CITIZEN',
          uploadedByName: reporterName ? reporterName.trim() : 'Citizen Reporter',
          status: 'VERIFIED_INTEGRITY',
          uploadedAt: ev.uploadedAt || new Date(),
        });
        await evDoc.save();
      }
    }

    // Immutable timeline events
    await caseTimelineService.logEvent({
      caseId: saved.caseId,
      eventType: 'CASE_CREATED',
      actorId: reporterName ? reporterName.trim() : 'citizen_anonymous',
      actorRole: 'CITIZEN',
      description: `Report registered for suspected unauthorized practice (${saved.category}).`,
      metadata: { category: saved.category, state: saved.facilityDetails?.state },
    });

    if (evidenceList.length > 0) {
      await caseTimelineService.logEvent({
        caseId: saved.caseId,
        eventType: 'EVIDENCE_UPLOADED',
        actorId: reporterName ? reporterName.trim() : 'citizen_anonymous',
        actorRole: 'CITIZEN',
        description: `Initial evidence attached (${evidenceList.length} document(s)) with SHA-256 cryptographic verification.`,
        metadata: { count: evidenceList.length, hashes: evidenceList.map((e) => e.sha256Hash) },
      });
    }

    await caseTimelineService.logEvent({
      caseId: saved.caseId,
      eventType: 'CASE_ROUTED',
      actorId: 'system_routing_engine',
      actorRole: 'SYSTEM',
      description: `Case routed to ${saved.assignedAuthority?.authorityName}.`,
      metadata: { reason: saved.routingDecision?.reason, version: saved.routingDecision?.routingRuleVersion },
    });

    return res.status(201).json({
      success: true,
      message: 'Your report has been routed for appropriate review.',
      caseId: saved.caseId,
      status: saved.status,
      submittedDate: saved.createdAt,
      assignedAuthority: saved.assignedAuthority,
      routingDecision: {
        authorityName: saved.routingDecision.authorityName,
        reason: saved.routingDecision.reason,
        routedAt: saved.routingDecision.routedAt,
        routingRuleVersion: saved.routingDecision.routingRuleVersion,
      },
      evidenceCount: saved.evidence.length,
    });
  } catch (error) {
    console.error('[ComplaintController] createComplaint error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An internal error occurred while registering your report.',
    });
  }
};

/**
 * POST /api/complaints/:caseId/route
 * Explicitly evaluate or re-evaluate routing rules for a case
 */
exports.routeComplaintEndpoint = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { overrideAuthorityId, reason: customReason } = req.body || {};

    const complaint = await Complaint.findOne({
      caseId: caseId.trim().toUpperCase(),
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: `Case ID "${caseId}" not found.`,
      });
    }

    let routingDecision;
    if (overrideAuthorityId) {
      const Authority = require('../models/Authority');
      const auth = await Authority.findById(overrideAuthorityId).lean();
      if (!auth) {
        return res.status(404).json({ success: false, error: 'Specified authority not found.' });
      }
      routingDecision = {
        authorityId: auth._id,
        authorityCode: auth.code,
        authorityName: auth.name,
        authorityType: auth.type,
        jurisdiction: auth.jurisdiction,
        reason: customReason || `Manual authority reassignment to ${auth.name}.`,
        routedAt: new Date(),
        routingRuleVersion: 'v2.0-manual-override',
      };
    } else {
      routingDecision = await authorityRoutingService.routeComplaint(complaint);
    }

    complaint.routingDecision = routingDecision;
    complaint.assignedAuthority = {
      authorityId: routingDecision.authorityId,
      authorityCode: routingDecision.authorityCode,
      authorityName: routingDecision.authorityName,
      authorityType: routingDecision.authorityType,
      jurisdiction: routingDecision.jurisdiction,
      routingStatus: 'Your report has been routed for appropriate review.',
      assignedAt: routingDecision.routedAt,
    };

    complaint.caseTimeline.push({
      status: complaint.status,
      timestamp: new Date(),
      notes: `Case re-routed to: ${routingDecision.authorityName}. Reason: ${routingDecision.reason}`,
    });

    await complaint.save();

    await caseTimelineService.logEvent({
      caseId: complaint.caseId,
      eventType: 'CASE_ROUTED',
      actorId: req.user ? req.user.id : 'authorized_officer',
      actorRole: req.user ? req.user.role : 'AUTHORITY_OFFICER',
      description: `Case routed to ${routingDecision.authorityName}. Reason: ${routingDecision.reason}`,
      metadata: { routingDecision },
    });

    return res.json({
      success: true,
      message: 'Complaint successfully routed.',
      routingDecision: complaint.routingDecision,
      assignedAuthority: complaint.assignedAuthority,
    });
  } catch (error) {
    console.error('[ComplaintController] routeComplaintEndpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to route complaint.',
    });
  }
};

/**
 * GET /api/complaints/authority/cases
 * Authority Officer case queue with KPI counts and status filtering
 * Enforces backend RBAC (AUTHORITY_OFFICER, ADMIN)
 */
exports.getAuthorityCases = async (req, res) => {
  try {
    const user = req.user;
    const { status, filter, search } = req.query;

    const query = {};

    // Scope to officer's designated authority unless ADMIN
    if (user.role === 'AUTHORITY_OFFICER' && user.authorityCode && user.authorityCode !== '*') {
      query.$or = [
        { 'assignedAuthority.authorityCode': user.authorityCode },
        { 'routingDecision.authorityCode': user.authorityCode },
      ];
    }

    // Filter categorization
    if (filter === 'new') {
      query.status = 'SUBMITTED';
    } else if (filter === 'awaiting_review') {
      query.status = { $in: ['UNDER_REVIEW', 'EVIDENCE_REQUESTED'] };
    } else if (filter === 'assigned') {
      query.status = { $in: ['ASSIGNED', 'INVESTIGATION'] };
    } else if (filter === 'high_priority') {
      query.priority = { $in: ['HIGH', 'CRITICAL'] };
    } else if (filter === 'resolved') {
      query.status = { $in: ['RESOLVED', 'REJECTED', 'ACTION_TAKEN'] };
    } else if (status) {
      query.status = status.toUpperCase();
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { caseId: searchRegex },
          { 'practitionerDetails.name': searchRegex },
          { 'practitionerDetails.registrationNumber': searchRegex },
          { 'facilityDetails.clinicName': searchRegex },
        ],
      });
    }

    // Retrieve cases
    const cases = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Calculate live KPI metrics across this authority's scope
    const baseScope = {};
    if (user.role === 'AUTHORITY_OFFICER' && user.authorityCode && user.authorityCode !== '*') {
      baseScope.$or = [
        { 'assignedAuthority.authorityCode': user.authorityCode },
        { 'routingDecision.authorityCode': user.authorityCode },
      ];
    }

    const [newCount, reviewCount, assignedCount, highPriorityCount, resolvedCount, totalCount] =
      await Promise.all([
        Complaint.countDocuments({ ...baseScope, status: 'SUBMITTED' }),
        Complaint.countDocuments({ ...baseScope, status: { $in: ['UNDER_REVIEW', 'EVIDENCE_REQUESTED'] } }),
        Complaint.countDocuments({ ...baseScope, status: { $in: ['ASSIGNED', 'INVESTIGATION'] } }),
        Complaint.countDocuments({ ...baseScope, priority: { $in: ['HIGH', 'CRITICAL'] } }),
        Complaint.countDocuments({ ...baseScope, status: { $in: ['RESOLVED', 'REJECTED', 'ACTION_TAKEN'] } }),
        Complaint.countDocuments(baseScope),
      ]);

    return res.json({
      success: true,
      officer: {
        id: user.id,
        name: user.name,
        role: user.role,
        designation: user.designation,
        authorityName: user.authorityName,
        authorityCode: user.authorityCode,
      },
      kpis: {
        total: totalCount,
        newCases: newCount,
        awaitingReview: reviewCount,
        assigned: assignedCount,
        highPriority: highPriorityCount,
        resolved: resolvedCount,
      },
      count: cases.length,
      cases,
    });
  } catch (error) {
    console.error('[ComplaintController] getAuthorityCases error:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve authority cases at this time.',
    });
  }
};

/**
 * PATCH /api/complaints/:caseId/action
 * Authorized action handler for Authority Officers & Admins:
 * - Accept Case (UNDER_REVIEW)
 * - Assign Officer (ASSIGNED)
 * - Request Evidence (EVIDENCE_REQUESTED)
 * - Change Case Status
 * - Add Investigation Notes
 * - Record Action
 * - Close Case (RESOLVED / REJECTED)
 */
exports.updateCaseAction = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { actionType, officerName, status, notes, actionDetails, isInternal } = req.body;
    const user = req.user;

    const complaint = await Complaint.findOne({
      caseId: caseId.trim().toUpperCase(),
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: `Case ID "${caseId}" not found.`,
      });
    }

    const timestamp = new Date();
    const actorName = officerName || user.name || 'Authorized Officer';

    switch (actionType) {
      case 'ACCEPT_CASE':
        complaint.status = 'UNDER_REVIEW';
        complaint.caseTimeline.push({
          status: 'UNDER_REVIEW',
          timestamp,
          notes: notes || `Case accepted by ${user.authorityName} for formal inquiry.`,
        });
        break;

      case 'ASSIGN_OFFICER':
        complaint.status = 'ASSIGNED';
        complaint.assignedOfficer = {
          officerId: user.id || 'officer_ext',
          officerName: actorName,
          assignedAt: timestamp,
        };
        complaint.caseTimeline.push({
          status: 'ASSIGNED',
          timestamp,
          notes: notes || `Assigned to Investigating Officer ${actorName}.`,
        });
        break;

      case 'REQUEST_EVIDENCE':
        complaint.status = 'EVIDENCE_REQUESTED';
        complaint.investigationNotes.push({
          author: actorName,
          authorRole: user.role,
          note: notes || 'Additional statutory records or proof requested.',
          timestamp,
          isInternal: false, // Visible to citizen
        });
        complaint.caseTimeline.push({
          status: 'EVIDENCE_REQUESTED',
          timestamp,
          notes: notes || 'Statutory authority requested supplemental evidence/records.',
        });
        break;

      case 'ADD_NOTE':
        if (!notes || !notes.trim()) {
          return res.status(400).json({ success: false, error: 'Note text is required.' });
        }
        complaint.investigationNotes.push({
          author: actorName,
          authorRole: user.role,
          note: notes.trim(),
          timestamp,
          isInternal: isInternal !== false,
        });
        break;

      case 'RECORD_ACTION':
        complaint.status = 'ACTION_TAKEN';
        complaint.actionsTaken.push({
          actionType: req.body.actionRecordType || 'STATUTORY_MEASURE',
          details: actionDetails || notes || 'Official action recorded.',
          recordedBy: actorName,
          timestamp,
        });
        complaint.caseTimeline.push({
          status: 'ACTION_TAKEN',
          timestamp,
          notes: actionDetails || notes || 'Formal statutory action or notice recorded.',
        });
        break;

      case 'CHANGE_STATUS':
        if (!status) {
          return res.status(400).json({ success: false, error: 'Target status is required.' });
        }
        complaint.status = status;
        complaint.caseTimeline.push({
          status,
          timestamp,
          notes: notes || `Status updated to ${status} by ${actorName}.`,
        });
        break;

      case 'CLOSE_CASE':
        const finalStatus = status === 'REJECTED' ? 'REJECTED' : 'RESOLVED';
        complaint.status = finalStatus;
        complaint.actionsTaken.push({
          actionType: finalStatus === 'RESOLVED' ? 'CASE_RESOLVED' : 'CASE_DISMISSED',
          details: actionDetails || notes || 'Inquiry officially concluded and filed.',
          recordedBy: actorName,
          timestamp,
        });
        complaint.caseTimeline.push({
          status: finalStatus,
          timestamp,
          notes: notes || `Case ${finalStatus.toLowerCase()} by ${user.authorityName}.`,
        });
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown actionType: "${actionType}". Supported: ACCEPT_CASE, ASSIGN_OFFICER, REQUEST_EVIDENCE, ADD_NOTE, RECORD_ACTION, CHANGE_STATUS, CLOSE_CASE.`,
        });
    }

    const updated = await complaint.save();

    // Log immutable audit event based on actionType
    let eventType = 'STATUS_CHANGED';
    let eventDescription = notes || `Action ${actionType} recorded.`;
    let isInternalNote = false;

    if (actionType === 'ACCEPT_CASE') {
      eventType = 'STATUS_CHANGED';
      eventDescription = `Case accepted by ${user.authorityName} for formal inquiry. Status: UNDER_REVIEW.`;
    } else if (actionType === 'ASSIGN_OFFICER') {
      eventType = 'CASE_ASSIGNED';
      eventDescription = `Case assigned to Investigating Officer ${actorName}.`;
    } else if (actionType === 'REQUEST_EVIDENCE') {
      eventType = 'EVIDENCE_REQUESTED';
      eventDescription = notes || 'Statutory authority requested supplemental evidence/records.';
    } else if (actionType === 'ADD_NOTE') {
      eventType = 'OFFICER_NOTE_ADDED';
      eventDescription = notes.trim();
      isInternalNote = isInternal !== false;
    } else if (actionType === 'RECORD_ACTION') {
      eventType = 'ACTION_RECORDED';
      eventDescription = `Official statutory action recorded: ${req.body.actionRecordType || 'STATUTORY_MEASURE'}. ${actionDetails || notes || ''}`;
    } else if (actionType === 'CLOSE_CASE') {
      const finalStatus = status === 'REJECTED' ? 'REJECTED' : 'RESOLVED';
      eventType = finalStatus === 'RESOLVED' ? 'CASE_RESOLVED' : 'CASE_REJECTED';
      eventDescription = `Case ${finalStatus.toLowerCase()} by ${user.authorityName}. Determination: ${notes || actionDetails || 'Inquiry officially filed.'}`;
    } else if (actionType === 'CHANGE_STATUS') {
      eventType = 'STATUS_CHANGED';
      eventDescription = `Case status updated to ${status} by ${actorName}.`;
    }

    await caseTimelineService.logEvent({
      caseId: updated.caseId,
      eventType,
      actorId: user.id || 'officer',
      actorRole: user.role || 'AUTHORITY_OFFICER',
      description: eventDescription,
      isInternal: isInternalNote,
      metadata: { actionType, actorName, notes, targetStatus: status },
      timestamp,
    });

    return res.json({
      success: true,
      message: `Action "${actionType}" executed successfully on case ${caseId}.`,
      case: updated,
    });
  } catch (error) {
    console.error('[ComplaintController] updateCaseAction error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute case action.',
    });
  }
};

/**
 * GET /api/complaints/:caseId/status
 * Public tracking endpoint for citizens to follow case review progress
 * Sanitizes internal notes to prevent leaking confidential authority notes.
 */
exports.getComplaintStatus = async (req, res) => {
  try {
    const { caseId } = req.params;

    if (!caseId || !caseId.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Case ID parameter is required.',
      });
    }

    let complaint = await Complaint.findOne({
      caseId: caseId.trim().toUpperCase(),
    }).lean();

    if (!complaint) {
      const PatientSafetyComplaint = require('../models/PatientSafetyComplaint');
      const psc = await PatientSafetyComplaint.findOne({
        caseId: caseId.trim().toUpperCase(),
      }).lean();

      if (psc) {
        const publicNotes = (psc.investigationNotes || [])
          .filter((n) => !n.isInternal)
          .map((n) => ({
            author: n.authorRole || 'Statutory Authority',
            note: n.note,
            timestamp: n.timestamp,
          }));

        return res.status(200).json({
          success: true,
          caseId: psc.caseId,
          status: psc.status,
          category: psc.category,
          submittedDate: psc.createdAt,
          lastUpdatedAt: psc.updatedAt,
          practitionerName: psc.practitioner?.name || 'Unspecified',
          claimedRegNumber: psc.practitioner?.registrationNumber || '',
          clinicName: psc.facility?.name || '',
          state: psc.facility?.state || '',
          assignedAuthority: {
            authorityName: psc.authority?.authorityName,
            authorityType: psc.authority?.authorityType,
            jurisdiction: psc.authority?.jurisdiction,
            routingStatus: psc.authority?.routingStatus || 'Your grievance has been routed for appropriate review.',
            assignedAt: psc.authority?.assignedAt,
          },
          routingDecision: {
            authorityName: psc.routingDecision?.authorityName,
            reason: psc.routingDecision?.reason,
            routedAt: psc.routingDecision?.routedAt,
          },
          publicNotes,
          evidenceCount: psc.evidence?.length || 0,
          caseTimeline: psc.caseTimeline || [],
        });
      }

      return res.status(404).json({
        success: false,
        error: `Case ID "${caseId}" could not be found in our statutory registry records.`,
      });
    }

    // Citizen sees public timeline & public notes only
    const publicNotes = (complaint.investigationNotes || [])
      .filter((n) => !n.isInternal)
      .map((n) => ({
        author: n.authorRole || 'Statutory Authority',
        note: n.note,
        timestamp: n.timestamp,
      }));

    return res.status(200).json({
      success: true,
      caseId: complaint.caseId,
      status: complaint.status,
      category: complaint.category,
      submittedDate: complaint.createdAt,
      lastUpdatedAt: complaint.updatedAt,
      practitionerName: complaint.practitionerDetails?.name || 'Unspecified',
      claimedRegNumber: complaint.practitionerDetails?.registrationNumber || '',
      clinicName: complaint.facilityDetails?.clinicName || '',
      state: complaint.facilityDetails?.state || '',
      assignedAuthority: {
        authorityName: complaint.assignedAuthority?.authorityName,
        authorityType: complaint.assignedAuthority?.authorityType,
        jurisdiction: complaint.assignedAuthority?.jurisdiction,
        routingStatus: 'Your report has been routed for appropriate review.',
        assignedAt: complaint.assignedAuthority?.assignedAt,
      },
      routingDecision: {
        authorityName: complaint.routingDecision?.authorityName,
        reason: complaint.routingDecision?.reason,
        routedAt: complaint.routingDecision?.routedAt,
      },
      publicNotes,
      evidenceCount: complaint.evidence?.length || 0,
      caseTimeline: complaint.caseTimeline || [],
    });
  } catch (error) {
    console.error('[ComplaintController] getComplaintStatus error:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve case tracking details at this time.',
    });
  }
};

/**
 * GET /api/complaints/:caseId
 * Full case inspection
 */
exports.getComplaintByCaseId = async (req, res) => {
  try {
    const { caseId } = req.params;
    const user = req.user;

    const complaint = await Complaint.findOne({
      caseId: caseId.trim().toUpperCase(),
    }).lean();

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found.',
      });
    }

    const isAuthorized = user && ['AUTHORITY_OFFICER', 'ADMIN'].includes(user.role);

    return res.status(200).json({
      success: true,
      complaint: {
        ...complaint,
        // Internal notes only shown if authorized officer/admin
        investigationNotes: isAuthorized
          ? complaint.investigationNotes
          : (complaint.investigationNotes || []).filter((n) => !n.isInternal),
        // Sanitize disk storage path references
        evidence: (complaint.evidence || []).map((e) => ({
          fileName: e.fileName,
          fileType: e.fileType,
          size: e.size,
          sha256Hash: e.sha256Hash,
          uploadedAt: e.uploadedAt,
        })),
      },
    });
  } catch (error) {
    console.error('[ComplaintController] getComplaintByCaseId error:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred.',
    });
  }
};
