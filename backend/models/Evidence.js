const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema(
  {
    caseId: {
      type: String,
      required: [true, 'Case ID is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    fileType: {
      type: String,
      required: [true, 'File MIME type is required'],
      trim: true,
    },
    fileCategory: {
      type: String,
      enum: [
        'DOCUMENT',
        'PHOTOGRAPHIC_PROOF',
        'PRESCRIPTION_SLIP',
        'CERTIFICATE',
        'BILL_RECEIPT',
        'OTHER',
      ],
      default: 'DOCUMENT',
    },
    size: {
      type: Number,
      required: [true, 'File size in bytes is required'],
    },
    storageReference: {
      type: String,
      required: [true, 'Storage reference filename is required'],
      trim: true,
    },
    sha256Hash: {
      type: String,
      required: [true, 'SHA-256 cryptographic hash is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    uploadedByRole: {
      type: String,
      enum: ['CITIZEN', 'AUTHORITY_OFFICER', 'ADMIN'],
      default: 'CITIZEN',
    },
    uploadedByName: {
      type: String,
      default: 'Citizen Reporter',
      trim: true,
    },
    status: {
      type: String,
      enum: ['SUBMITTED', 'VERIFIED_INTEGRITY', 'FLAGGED', 'ARCHIVED'],
      default: 'SUBMITTED',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    isConfidential: {
      type: Boolean,
      default: false,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Evidence = mongoose.model('Evidence', evidenceSchema);

module.exports = Evidence;
