const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
    },
    storageReference: {
      type: String,
      required: true,
    },
    sha256Hash: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const patientSafetyComplaintSchema = new mongoose.Schema(
  {
    caseId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Care grievance category is required'],
      enum: [
        'Critical-care concern',
        'Concern about communication regarding patient condition',
        'Treatment concern',
        'Billing concern',
        'Medical records concern',
        'Consent/documentation concern',
        'Suspected unauthorized practice',
        'Other',
      ],
      default: 'Treatment concern',
    },
    facility: {
      name: { type: String, required: [true, 'Facility name is required'], trim: true },
      address: { type: String, trim: true, default: '' },
      district: { type: String, required: [true, 'District is required'], trim: true },
      state: { type: String, required: [true, 'State jurisdiction is required'], trim: true },
    },
    practitioner: {
      name: { type: String, trim: true, default: 'Unspecified / Unknown' },
      registrationNumber: { type: String, trim: true, uppercase: true, default: '' },
      specialization: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
    },
    patientRelationship: {
      type: String,
      required: [true, 'Patient relationship is required'],
      enum: [
        'Self',
        'Spouse',
        'Parent',
        'Child',
        'Sibling',
        'Legal Guardian',
        'Other Relative',
        'Authorized Representative',
      ],
      default: 'Self',
    },
    description: {
      type: String,
      required: [true, 'Grievance description is required'],
      trim: true,
      maxlength: 4000,
    },
    incidentDate: {
      type: Date,
      default: Date.now,
    },
    location: {
      address: { type: String, trim: true, default: '' },
      district: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    evidence: [evidenceSchema],
    authority: {
      authorityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Authority', default: null },
      authorityCode: { type: String, trim: true, default: '' },
      authorityName: { type: String, trim: true, default: 'State Medical Council & District Health Authority' },
      authorityType: { type: String, trim: true, default: 'STATE_MEDICAL_COUNCIL' },
      jurisdiction: { type: String, trim: true, default: 'State Medical Council' },
      routingStatus: { type: String, trim: true, default: 'Your grievance has been routed for appropriate review.' },
      assignedAt: { type: Date, default: Date.now },
    },
    routingDecision: {
      authorityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Authority', default: null },
      authorityCode: { type: String, trim: true, default: '' },
      authorityName: { type: String, trim: true, default: '' },
      authorityType: { type: String, trim: true, default: '' },
      reason: { type: String, trim: true, default: '' },
      routedAt: { type: Date, default: Date.now },
      routingRuleVersion: { type: String, trim: true, default: 'v2.0-jurisdiction-matrix' },
    },
    assignedOfficer: {
      officerId: { type: String, trim: true, default: '' },
      officerName: { type: String, trim: true, default: '' },
      assignedAt: { type: Date, default: null },
    },
    status: {
      type: String,
      enum: [
        'SUBMITTED',
        'UNDER_REVIEW',
        'EVIDENCE_REQUESTED',
        'ASSIGNED',
        'INVESTIGATION',
        'ACTION_TAKEN',
        'RESOLVED',
        'REJECTED',
      ],
      default: 'SUBMITTED',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    isEmergencyIndicated: {
      type: Boolean,
      default: false,
    },
    investigationNotes: [
      {
        author: { type: String, required: true, trim: true },
        authorRole: { type: String, trim: true, default: 'Authority Officer' },
        note: { type: String, required: true, trim: true },
        timestamp: { type: Date, default: Date.now },
        isInternal: { type: Boolean, default: true },
      },
    ],
    actionsTaken: [
      {
        actionType: { type: String, required: true, trim: true },
        details: { type: String, required: true, trim: true },
        recordedBy: { type: String, required: true, trim: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    caseTimeline: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String, default: '' },
      },
    ],
    reporterDetails: {
      name: { type: String, trim: true, default: 'Confidential Grievant' },
      contact: { type: String, trim: true, default: '' },
    },
    reporterConsent: {
      type: Boolean,
      required: [true, 'Good-faith declaration is required'],
      validate: {
        validator: (v) => v === true,
        message: 'You must confirm the good-faith declaration to register this grievance.',
      },
    },
  },
  {
    timestamps: true,
  }
);

// High-performance compound indexes
patientSafetyComplaintSchema.index({ 'facility.state': 1, 'facility.district': 1 });
patientSafetyComplaintSchema.index({ 'authority.authorityId': 1, status: 1 });
patientSafetyComplaintSchema.index({ category: 1, priority: 1, status: 1 });
patientSafetyComplaintSchema.index({ createdAt: -1 });
patientSafetyComplaintSchema.index({ 'practitioner.registrationNumber': 1 });

// Helper function to generate unique case ID: HS-PSC-YYYY-XXXXXX
patientSafetyComplaintSchema.statics.generateCaseId = async function () {
  const currentYear = new Date().getFullYear();
  const prefix = `HS-PSC-${currentYear}-`;

  const count = await this.countDocuments({
    caseId: new RegExp(`^${prefix}`),
  });

  const sequentialNum = String(count + 1).padStart(6, '0');
  return `${prefix}${sequentialNum}`;
};

const PatientSafetyComplaint = mongoose.model('PatientSafetyComplaint', patientSafetyComplaintSchema);

module.exports = PatientSafetyComplaint;
