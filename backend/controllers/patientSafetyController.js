const PatientSafetyComplaint = require('../models/PatientSafetyComplaint');
const Evidence = require('../models/Evidence');
const { authorityRoutingService } = require('../services/authorityRoutingService');
const { caseTimelineService } = require('../services/caseTimelineService');
const { evidenceStorageService } = require('../services/evidenceStorageService');

const STATUTORY_NOTICE =
  'Health-Safe does not independently determine medical negligence, death, treatment necessity, or other clinical/legal outcomes. Reports are submitted for review by the appropriate competent authority.';

const EMERGENCY_ADVISORY =
  'IMMEDIATE EMERGENCY ADVISORY: If a patient is currently experiencing an acute, life-threatening medical emergency or urgent distress, immediately call emergency services (112 / ambulance) or go directly to the nearest hospital emergency department. Do not delay emergency medical care waiting for administrative grievance processing.';

/**
 * POST /api/patient-safety
 * Registers a new Patient Safety & Care Grievance
 */
exports.createGrievance = async (req, res) => {
  try {
    const {
      facilityName,
      facilityAddress,
      district,
      state,
      practitionerName,
      registrationNumber,
      specialization,
      practitionerPhone,
      patientRelationship,
      category,
      description,
      incidentDate,
      latitude,
      longitude,
      isEmergency,
      reporterName,
      reporterContact,
      reporterConsent,
    } = req.body;

    // Mandatory Field Validations
    if (!facilityName || !facilityName.trim()) {
      return res.status(400).json({ success: false, error: 'Facility or hospital name is required.' });
    }

    if (!state || !state.trim()) {
      return res.status(400).json({ success: false, error: 'State jurisdiction is required for statutory authority routing.' });
    }

    if (!district || !district.trim()) {
      return res.status(400).json({ success: false, error: 'District is required for jurisdictional routing.' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, error: 'Grievance description is required.' });
    }

    const consentValue = reporterConsent === true || reporterConsent === 'true';
    if (!consentValue) {
      return res.status(400).json({ success: false, error: 'Good-faith declaration must be confirmed.' });
    }

    // Emergency Detection
    const isEmergencyFlag =
      isEmergency === true ||
      isEmergency === 'true' ||
      (category === 'Critical-care concern' &&
        (description.toLowerCase().includes('immediate emergency') ||
          description.toLowerCase().includes('actively deteriorating') ||
          description.toLowerCase().includes('acute crisis')));

    // Process attached evidence files with SHA-256 hashing
    let processedEvidence = [];
    if (req.files && req.files.length > 0) {
      processedEvidence = await evidenceStorageService.processUploadedFiles(req.files);
    }

    // Generate unique case ID: HS-PSC-YYYY-XXXXXX
    const caseId = await PatientSafetyComplaint.generateCaseId();

    // Determine priority
    let priority = 'MEDIUM';
    if (category === 'Critical-care concern' || isEmergencyFlag) {
      priority = 'CRITICAL';
    } else if (category === 'Treatment concern') {
      priority = 'HIGH';
    }

    // Formulate preliminary grievance document for authority routing
    const preliminaryDoc = {
      category: category || 'Treatment concern',
      facility: {
        name: facilityName.trim(),
        address: (facilityAddress || '').trim(),
        district: district.trim(),
        state: state.trim(),
      },
      practitioner: {
        name: (practitionerName || 'Unspecified / Unknown').trim(),
        registrationNumber: (registrationNumber || '').trim().toUpperCase(),
        specialization: (specialization || '').trim(),
        phone: (practitionerPhone || '').trim(),
      },
      patientRelationship: patientRelationship || 'Self',
      description: description.trim(),
    };

    // Route to appropriate competent authority
    const routingDecision = await authorityRoutingService.routeComplaint(preliminaryDoc);

    const assignedAuthority = {
      authorityId: routingDecision.authorityId,
      authorityCode: routingDecision.authorityCode,
      authorityName: routingDecision.authorityName,
      authorityType: routingDecision.authorityType,
      jurisdiction: routingDecision.jurisdiction,
      routingStatus: 'Your grievance has been routed for appropriate statutory review.',
      assignedAt: routingDecision.routedAt,
    };

    // Construct Mongoose Document
    const grievance = new PatientSafetyComplaint({
      caseId,
      category: preliminaryDoc.category,
      facility: preliminaryDoc.facility,
      practitioner: preliminaryDoc.practitioner,
      patientRelationship: preliminaryDoc.patientRelationship,
      description: preliminaryDoc.description,
      incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
      location: {
        address: (facilityAddress || '').trim(),
        district: district.trim(),
        state: state.trim(),
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
      evidence: processedEvidence,
      authority: assignedAuthority,
      routingDecision,
      status: 'SUBMITTED',
      priority,
      isEmergencyIndicated: isEmergencyFlag,
      caseTimeline: [
        {
          status: 'SUBMITTED',
          timestamp: new Date(),
          notes: 'Patient safety & care grievance received and cryptographically logged.',
        },
        {
          status: 'SUBMITTED',
          timestamp: new Date(Date.now() + 500),
          notes: `Grievance auto-routed to ${assignedAuthority.authorityName} under ${routingDecision.routingRuleVersion}. Reason: ${routingDecision.reason}`,
        },
      ],
      reporterDetails: {
        name: reporterName ? reporterName.trim() : 'Confidential Grievant',
        contact: reporterContact ? reporterContact.trim() : '',
      },
      reporterConsent: true,
    });

    await grievance.save();

    // Persist attached evidence into Evidence collection for Evidence Locker inspection
    if (processedEvidence.length > 0) {
      for (const ev of processedEvidence) {
        await Evidence.create({
          caseId,
          fileName: ev.fileName,
          fileType: ev.fileType,
          fileCategory: 'DOCUMENT',
          size: ev.size,
          storageReference: ev.storageReference,
          sha256Hash: ev.sha256Hash,
          uploadedByRole: 'CITIZEN',
          uploadedByName: reporterName ? reporterName.trim() : 'Family / Patient Grievant',
          status: 'VERIFIED_INTEGRITY',
          isConfidential: true,
          uploadedAt: ev.uploadedAt,
        });
      }
    }

    // Log immutable audit events
    await caseTimelineService.logEvent({
      caseId,
      eventType: 'CASE_CREATED',
      actorId: 'citizen_grievant',
      actorRole: 'CITIZEN',
      description: `Patient safety & care grievance registered for ${facilityName.trim()} (${category}).`,
      metadata: {
        category,
        facilityName: facilityName.trim(),
        district: district.trim(),
        state: state.trim(),
        patientRelationship,
        evidenceCount: processedEvidence.length,
      },
      isInternal: false,
    });

    await caseTimelineService.logEvent({
      caseId,
      eventType: 'CASE_ROUTED',
      actorId: 'system',
      actorRole: 'SYSTEM',
      description: `Grievance routed to ${assignedAuthority.authorityName} for formal clinical inquiry.`,
      metadata: {
        authorityCode: assignedAuthority.authorityCode,
        authorityName: assignedAuthority.authorityName,
        reason: routingDecision.reason,
      },
      isInternal: false,
    });

    if (processedEvidence.length > 0) {
      await caseTimelineService.logEvent({
        caseId,
        eventType: 'EVIDENCE_UPLOADED',
        actorId: 'citizen_grievant',
        actorRole: 'CITIZEN',
        description: `Initial supporting clinical records & bills attached (${processedEvidence.length} files) with SHA-256 integrity verification.`,
        metadata: {
          fileCount: processedEvidence.length,
          fileNames: processedEvidence.map((e) => e.fileName),
        },
        isInternal: false,
      });
    }

    return res.status(201).json({
      success: true,
      caseId: grievance.caseId,
      category: grievance.category,
      facilityName: grievance.facility.name,
      district: grievance.facility.district,
      state: grievance.facility.state,
      status: grievance.status,
      priority: grievance.priority,
      assignedAuthority: {
        authorityName: assignedAuthority.authorityName,
        authorityType: assignedAuthority.authorityType,
        jurisdiction: assignedAuthority.jurisdiction,
        routingStatus: assignedAuthority.routingStatus,
      },
      routingDecision: {
        authorityName: routingDecision.authorityName,
        reason: routingDecision.reason,
      },
      evidenceCount: processedEvidence.length,
      isEmergencyIndicated: isEmergencyFlag,
      emergencyAdvisory: isEmergencyFlag ? EMERGENCY_ADVISORY : null,
      statutoryNotice: STATUTORY_NOTICE,
    });
  } catch (error) {
    console.error('[PatientSafetyController] createGrievance error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while registering your care grievance.',
    });
  }
};

/**
 * GET /api/patient-safety/:caseId/status
 * Public status tracking for patient safety grievances (strictly sanitizes PHI)
 */
exports.getGrievanceStatus = async (req, res) => {
  try {
    const { caseId } = req.params;
    if (!caseId || !caseId.trim()) {
      return res.status(400).json({ success: false, error: 'Case ID parameter is required.' });
    }

    const grievance = await PatientSafetyComplaint.findOne({
      caseId: caseId.trim().toUpperCase(),
    }).lean();

    if (!grievance) {
      return res.status(404).json({
        success: false,
        error: `Grievance Case ID "${caseId}" could not be found.`,
      });
    }

    // Public view: strictly omits patient relationship, description narrative, and reporter contact
    return res.status(200).json({
      success: true,
      caseId: grievance.caseId,
      status: grievance.status,
      category: grievance.category,
      submittedDate: grievance.createdAt,
      facilityName: grievance.facility?.name || 'Medical Facility',
      district: grievance.facility?.district || '',
      state: grievance.facility?.state || '',
      assignedAuthority: {
        authorityName: grievance.authority?.authorityName,
        authorityType: grievance.authority?.authorityType,
        jurisdiction: grievance.authority?.jurisdiction,
        routingStatus: 'Your grievance has been routed for appropriate statutory review.',
      },
      routingDecision: {
        authorityName: grievance.routingDecision?.authorityName,
        reason: grievance.routingDecision?.reason,
      },
      evidenceCount: grievance.evidence?.length || 0,
      statutoryNotice: STATUTORY_NOTICE,
      caseTimeline: (grievance.caseTimeline || []).map((t) => ({
        status: t.status,
        timestamp: t.timestamp,
        notes: t.notes,
      })),
    });
  } catch (error) {
    console.error('[PatientSafetyController] getGrievanceStatus error:', error);
    return res.status(500).json({ success: false, error: 'Unable to retrieve grievance status.' });
  }
};

/**
 * GET /api/patient-safety/:caseId
 * Full case inspection for authorized officers or verified tracker
 */
exports.getGrievanceByCaseId = async (req, res) => {
  try {
    const { caseId } = req.params;
    const user = req.user;
    const isAuthorizedOfficer = user && ['AUTHORITY_OFFICER', 'ADMIN'].includes(user.role);

    const grievance = await PatientSafetyComplaint.findOne({
      caseId: caseId.trim().toUpperCase(),
    }).lean();

    if (!grievance) {
      return res.status(404).json({ success: false, error: 'Patient safety grievance not found.' });
    }

    // If caller is public/citizen, sanitize out internal notes & reporter contact
    if (!isAuthorizedOfficer) {
      delete grievance.reporterDetails?.contact;
      grievance.investigationNotes = (grievance.investigationNotes || []).filter((n) => !n.isInternal);
    }

    return res.json({
      success: true,
      data: grievance,
      statutoryNotice: STATUTORY_NOTICE,
    });
  } catch (error) {
    console.error('[PatientSafetyController] getGrievanceByCaseId error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve grievance dossier.' });
  }
};

/**
 * PATCH or POST /api/patient-safety/:caseId/action
 * Authorized officer executes action on patient safety grievance
 */
exports.updateGrievanceAction = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { actionType, notes, officerName, targetStatus, actionRecordType } = req.body;
    const user = req.user;

    const grievance = await PatientSafetyComplaint.findOne({
      caseId: caseId.trim().toUpperCase(),
    });

    if (!grievance) {
      return res.status(404).json({ success: false, error: 'Patient safety grievance not found.' });
    }

    const actingOfficerName = officerName || user?.name || 'Statutory Vigilance Officer';
    let newStatus = grievance.status;
    let auditEventType = 'STATUS_CHANGED';
    let actionSummary = '';

    switch (actionType) {
      case 'ACCEPT_CASE':
        newStatus = targetStatus || 'UNDER_REVIEW';
        actionSummary = `Grievance accepted by ${grievance.authority?.authorityName || 'competent authority'} for formal inquiry.`;
        break;

      case 'ASSIGN_OFFICER':
        newStatus = 'ASSIGNED';
        grievance.assignedOfficer = {
          officerId: user?.id || 'officer_assigned',
          officerName: actingOfficerName,
          assignedAt: new Date(),
        };
        auditEventType = 'CASE_ASSIGNED';
        actionSummary = `Inquiry allocated to Investigating Officer: ${actingOfficerName}.`;
        break;

      case 'REQUEST_EVIDENCE':
        newStatus = 'EVIDENCE_REQUESTED';
        auditEventType = 'EVIDENCE_REQUESTED';
        actionSummary = `Supplementary clinical documents or records requested from grievant.`;
        break;

      case 'ADD_NOTE':
        auditEventType = 'OFFICER_NOTE_ADDED';
        actionSummary = `Confidential investigative review note recorded.`;
        break;

      case 'RECORD_ACTION':
        newStatus = 'ACTION_TAKEN';
        grievance.actionsTaken.push({
          actionType: actionRecordType || 'CLINICAL_INQUIRY_ORDERED',
          details: notes || 'Statutory regulatory measure enacted.',
          recordedBy: actingOfficerName,
          timestamp: new Date(),
        });
        auditEventType = 'ACTION_RECORDED';
        actionSummary = `Statutory action recorded: ${actionRecordType || 'REGULATORY_MEASURE'}.`;
        break;

      case 'CHANGE_STATUS':
        newStatus = targetStatus || grievance.status;
        actionSummary = `Grievance status transitioned to: ${newStatus}.`;
        break;

      case 'CLOSE_CASE':
        newStatus = targetStatus || 'RESOLVED';
        auditEventType = 'CASE_RESOLVED';
        actionSummary = `Grievance inquiry concluded and resolved.`;
        break;

      default:
        return res.status(400).json({ success: false, error: `Unrecognized actionType: ${actionType}` });
    }

    // Append internal investigation note if notes provided
    if (notes && notes.trim()) {
      grievance.investigationNotes.push({
        author: actingOfficerName,
        authorRole: user?.designation || 'Authority Officer',
        note: notes.trim(),
        timestamp: new Date(),
        isInternal: actionType === 'ADD_NOTE' || actionType === 'RECORD_ACTION',
      });
    }

    grievance.status = newStatus;
    grievance.caseTimeline.push({
      status: newStatus,
      timestamp: new Date(),
      notes: actionSummary,
    });

    await grievance.save();

    // Log immutable audit event
    await caseTimelineService.logEvent({
      caseId: grievance.caseId,
      eventType: auditEventType,
      actorId: user?.id || 'officer_authority',
      actorRole: user?.role || 'AUTHORITY_OFFICER',
      description: actionSummary,
      metadata: {
        actionType,
        newStatus,
        officerName: actingOfficerName,
        notes: notes ? notes.substring(0, 150) : null,
      },
      isInternal: actionType === 'ADD_NOTE',
    });

    return res.json({
      success: true,
      message: `Action "${actionType}" executed successfully.`,
      data: {
        caseId: grievance.caseId,
        status: grievance.status,
        assignedOfficer: grievance.assignedOfficer,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    console.error('[PatientSafetyController] updateGrievanceAction error:', error);
    return res.status(500).json({ success: false, error: 'Failed to record grievance action.' });
  }
};
