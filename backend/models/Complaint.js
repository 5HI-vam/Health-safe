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

const complaintSchema = new mongoose.Schema(
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
      required: [true, 'Type of concern is required'],
      enum: [
        'Registration could not be verified',
        'Suspected unauthorized medical practice',
        'Suspected fake qualification',
        'Suspected forged certificate',
        'Person claiming to be a doctor without verification',
        'Suspected unauthorized clinic',
        'Other',
      ],
      default: 'Suspected unauthorized medical practice',
    },
    practitionerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null,
    },
    practitionerDetails: {
      name: { type: String, trim: true, default: 'Unspecified / Unknown' },
      registrationNumber: { type: String, trim: true, uppercase: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      qualificationClaimed: { type: String, trim: true, default: '' },
    },
    facilityDetails: {
      clinicName: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' },
      district: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, required: [true, 'State jurisdiction is required'] },
    },
    description: {
      type: String,
      required: [true, 'Incident description is required'],
      trim: true,
      maxlength: 3000,
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
        'APPEAL',
      ],
      default: 'SUBMITTED',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    evidence: [evidenceSchema],
    assignedAuthority: {
      authorityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Authority', default: null },
      authorityCode: { type: String, trim: true, default: '' },
      authorityName: { type: String, trim: true, default: 'State Medical Council & District Health Vigilance Cell' },
      authorityType: { type: String, trim: true, default: 'STATE_MEDICAL_COUNCIL' },
      jurisdiction: { type: String, trim: true, default: 'State Medical Council' },
      routingStatus: { type: String, trim: true, default: 'Your report has been routed for appropriate review.' },
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
    reporterDetails: {
      name: { type: String, trim: true, default: 'Confidential Citizen' },
      contact: { type: String, trim: true, default: '' },
    },
    reporterConsent: {
      type: Boolean,
      required: [true, 'Reporter declaration and consent is required'],
      validate: {
        validator: (v) => v === true,
        message: 'You must confirm the good-faith declaration to submit this report.',
      },
    },
    caseTimeline: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// High-Performance Indexes for Dashboard Aggregations & Case Registers
complaintSchema.index({ 'facilityDetails.state': 1, 'facilityDetails.district': 1 });
complaintSchema.index({ 'assignedAuthority.authorityId': 1, status: 1 });
complaintSchema.index({ 'assignedAuthority.authorityCode': 1, status: 1 });
complaintSchema.index({ category: 1, priority: 1, status: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ 'practitionerDetails.registrationNumber': 1 });
complaintSchema.index({ 'facilityDetails.clinicName': 1 });
complaintSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

// Helper function to generate unique case ID: HS-MP-YYYY-XXXXXX
complaintSchema.statics.generateCaseId = async function () {
  const currentYear = new Date().getFullYear();
  const prefix = `HS-MP-${currentYear}-`;

  // Count existing cases created this year to formulate sequential suffix
  const count = await this.countDocuments({
    caseId: new RegExp(`^${prefix}`),
  });

  const sequentialNum = String(count + 1).padStart(6, '0');
  return `${prefix}${sequentialNum}`;
};

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;
