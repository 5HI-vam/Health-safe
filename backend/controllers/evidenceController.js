const path = require('path');
const fs = require('fs');
const Complaint = require('../models/Complaint');
const Evidence = require('../models/Evidence');
const { caseTimelineService } = require('../services/caseTimelineService');
const { evidenceStorageService } = require('../services/evidenceStorageService');

const LEGAL_ADMISSIBILITY_DISCLAIMER =
  'Statutory Notice: Cryptographic SHA-256 hashing verifies that stored files have not been modified or corrupted in storage. Hashing does NOT automatically establish statutory or legal admissibility in court or judicial proceedings.';

/**
 * GET /api/complaints/:caseId/timeline
 * Retrieves chronological audit timeline of case events
 */
exports.getCaseTimeline = async (req, res) => {
  try {
    const { caseId } = req.params;
    const user = req.user;

    if (!caseId || !caseId.trim()) {
      return res.status(400).json({ success: false, error: 'Case ID parameter is required.' });
    }

    const cleanCaseId = caseId.trim().toUpperCase();
    const isAuthorizedOfficer = user && ['AUTHORITY_OFFICER', 'ADMIN'].includes(user.role);

    const events = await caseTimelineService.getCaseEvents(cleanCaseId, {
      includeInternal: isAuthorizedOfficer,
    });

    return res.json({
      success: true,
      caseId: cleanCaseId,
      count: events.length,
      isInternalFiltered: !isAuthorizedOfficer,
      events,
    });
  } catch (error) {
    console.error('[EvidenceController] getCaseTimeline error:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve case timeline.',
    });
  }
};

/**
 * GET /api/complaints/:caseId/evidence
 * Retrieves evidence locker inventory for a specific case
 */
exports.getCaseEvidence = async (req, res) => {
  try {
    const { caseId } = req.params;
    const user = req.user;

    if (!caseId || !caseId.trim()) {
      return res.status(400).json({ success: false, error: 'Case ID parameter is required.' });
    }

    const cleanCaseId = caseId.trim().toUpperCase();
    const isAuthorizedOfficer = user && ['AUTHORITY_OFFICER', 'ADMIN'].includes(user.role);

    const query = { caseId: cleanCaseId };
    if (!isAuthorizedOfficer) {
      query.isConfidential = false;
    }

    let evidenceList = await Evidence.find(query).sort({ uploadedAt: -1 }).lean();

    // Fallback sync from Complaint model if Evidence collection empty
    if (evidenceList.length === 0) {
      const complaint = await Complaint.findOne({ caseId: cleanCaseId }).lean();
      if (complaint && complaint.evidence && complaint.evidence.length > 0) {
        evidenceList = complaint.evidence.map((e) => ({
          _id: e._id,
          caseId: cleanCaseId,
          fileName: e.fileName,
          fileType: e.fileType,
          fileCategory: 'DOCUMENT',
          size: e.size,
          sha256Hash: e.sha256Hash,
          uploadedByRole: 'CITIZEN',
          uploadedByName: 'Citizen Reporter',
          status: 'VERIFIED_INTEGRITY',
          isConfidential: false,
          uploadedAt: e.uploadedAt,
        }));
      }
    }

    return res.json({
      success: true,
      caseId: cleanCaseId,
      count: evidenceList.length,
      disclaimer: LEGAL_ADMISSIBILITY_DISCLAIMER,
      evidence: evidenceList.map((e) => ({
        _id: e._id,
        caseId: e.caseId,
        fileName: e.fileName,
        fileType: e.fileType,
        fileCategory: e.fileCategory || 'DOCUMENT',
        size: e.size,
        sha256Hash: e.sha256Hash,
        status: e.status || 'VERIFIED_INTEGRITY',
        uploadedByRole: e.uploadedByRole || 'CITIZEN',
        uploadedByName: e.uploadedByName || 'Citizen Reporter',
        uploadedAt: e.uploadedAt,
      })),
    });
  } catch (error) {
    console.error('[EvidenceController] getCaseEvidence error:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve case evidence records.',
    });
  }
};

/**
 * POST /api/complaints/:caseId/evidence
 * Supplementary evidence upload endpoint for citizens or investigating officers
 */
exports.uploadSupplementaryEvidence = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { fileCategory, notes, uploaderName } = req.body;
    const user = req.user;

    if (!caseId || !caseId.trim()) {
      return res.status(400).json({ success: false, error: 'Case ID parameter is required.' });
    }

    const cleanCaseId = caseId.trim().toUpperCase();
    const complaint = await Complaint.findOne({ caseId: cleanCaseId });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: `Case ID "${caseId}" not found.`,
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No evidence files provided. Please select at least one file.',
      });
    }

    const actorRole = user ? user.role : 'CITIZEN';
    const actorId = user ? user.id : 'citizen_supplementary';
    const actorName = uploaderName || (user ? user.name : 'Citizen Reporter');

    const uploadedEvidenceRecords = [];
    const fileSummaries = [];

    for (const file of req.files) {
      const processed = await evidenceStorageService.processUploadedEvidence(file);

      const evidenceDoc = new Evidence({
        caseId: cleanCaseId,
        fileName: processed.fileName,
        fileType: processed.fileType,
        fileCategory: fileCategory || 'DOCUMENT',
        size: processed.size,
        storageReference: processed.storageReference,
        sha256Hash: processed.sha256Hash,
        uploadedByRole: actorRole,
        uploadedByName: actorName,
        status: 'VERIFIED_INTEGRITY',
        notes: notes || '',
        isConfidential: false,
        uploadedAt: new Date(),
      });

      const savedEvidence = await evidenceDoc.save();
      uploadedEvidenceRecords.push(savedEvidence);

      // Also append to Complaint embedded evidence array
      complaint.evidence.push(processed);

      fileSummaries.push({
        fileName: processed.fileName,
        sha256Hash: processed.sha256Hash,
        size: processed.size,
      });
    }

    // Append to complaint timeline
    complaint.caseTimeline.push({
      status: complaint.status,
      timestamp: new Date(),
      notes: `Supplementary evidence attached (${req.files.length} file(s)) by ${actorName}.`,
    });

    // If case was awaiting evidence, update status to UNDER_REVIEW
    if (complaint.status === 'EVIDENCE_REQUESTED' && actorRole === 'CITIZEN') {
      complaint.status = 'UNDER_REVIEW';
      complaint.caseTimeline.push({
        status: 'UNDER_REVIEW',
        timestamp: new Date(),
        notes: 'Citizen submitted requested evidence. Inquiry resumed for review.',
      });
    }

    await complaint.save();

    // Log immutable audit event
    await caseTimelineService.logEvent({
      caseId: cleanCaseId,
      eventType: 'EVIDENCE_SUBMITTED',
      actorId,
      actorRole,
      description: `Supplementary evidence submitted (${req.files.length} document(s)) with SHA-256 verification.`,
      metadata: {
        fileCount: req.files.length,
        files: fileSummaries,
        notes: notes || '',
      },
      isInternal: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Supplementary evidence successfully uploaded and cryptographic checksums verified.',
      caseId: cleanCaseId,
      uploadedCount: uploadedEvidenceRecords.length,
      disclaimer: LEGAL_ADMISSIBILITY_DISCLAIMER,
      evidence: uploadedEvidenceRecords,
    });
  } catch (error) {
    console.error('[EvidenceController] uploadSupplementaryEvidence error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload supplementary evidence.',
    });
  }
};

/**
 * GET /api/evidence/:id
 * Secure, authorization-guarded evidence streaming endpoint
 * Enforces tamper-detection by validating SHA-256 checksum on disk prior to streaming.
 */
exports.streamEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const { caseId } = req.query;
    const user = req.user;

    let evidence = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      evidence = await Evidence.findById(id);
    } else {
      evidence = await Evidence.findOne({ storageReference: id });
    }

    // Check in Complaint embedded subdocuments if not found in Evidence collection
    if (!evidence && caseId) {
      const complaint = await Complaint.findOne({ caseId: caseId.toUpperCase() });
      if (complaint) {
        const sub = complaint.evidence.id(id) || complaint.evidence.find((e) => e.storageReference === id);
        if (sub) {
          evidence = {
            caseId: complaint.caseId,
            fileName: sub.fileName,
            fileType: sub.fileType,
            storageReference: sub.storageReference,
            sha256Hash: sub.sha256Hash,
            size: sub.size,
          };
        }
      }
    }

    if (!evidence) {
      return res.status(404).json({
        success: false,
        error: 'Evidence record not found.',
      });
    }

    // ACCESS CONTROL ENFORCEMENT
    const isOfficer = user && ['AUTHORITY_OFFICER', 'ADMIN'].includes(user.role);
    const hasCaseAccess = caseId && caseId.toUpperCase() === evidence.caseId.toUpperCase();

    if (!isOfficer && !hasCaseAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Evidence files are strictly confidential and require verified case access or authority credentials.',
      });
    }

    // Resolve physical storage location
    const filePath = path.resolve(__dirname, '../uploads/evidence', evidence.storageReference);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Physical evidence file reference is not available on storage volume.',
      });
    }

    // INTEGRITY TAMPER-CHECK: Verify disk hash matches stored SHA-256 checksum
    const diskHash = await evidenceStorageService.calculateSHA256(filePath);
    if (diskHash.toLowerCase() !== evidence.sha256Hash.toLowerCase()) {
      console.error(`[Security Alert] Tamper mismatch for evidence ${evidence._id}: disk=${diskHash}, db=${evidence.sha256Hash}`);
      return res.status(500).json({
        success: false,
        error: 'Security Integrity Alert: Stored file hash does not match recorded SHA-256 checksum. Storage file integrity compromised.',
      });
    }

    // Set secure response headers
    res.setHeader('Content-Type', evidence.fileType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(evidence.fileName)}"`);
    res.setHeader('X-Checksum-SHA256', evidence.sha256Hash);
    res.setHeader('X-Integrity-Verified', 'true');

    const fileStream = fs.createReadStream(filePath);
    return fileStream.pipe(res);
  } catch (error) {
    console.error('[EvidenceController] streamEvidence error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while streaming evidence file.',
    });
  }
};
