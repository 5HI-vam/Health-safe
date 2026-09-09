const mongoose = require('mongoose');

const caseEventSchema = new mongoose.Schema(
  {
    caseId: {
      type: String,
      required: [true, 'Case ID is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      enum: [
        'CASE_CREATED',
        'EVIDENCE_UPLOADED',
        'CASE_ROUTED',
        'CASE_ASSIGNED',
        'EVIDENCE_REQUESTED',
        'EVIDENCE_SUBMITTED',
        'STATUS_CHANGED',
        'OFFICER_NOTE_ADDED',
        'ACTION_RECORDED',
        'CASE_RESOLVED',
        'CASE_REJECTED',
        'CASE_REOPENED',
      ],
      index: true,
    },
    actorId: {
      type: String,
      default: 'citizen_anonymous',
      trim: true,
    },
    actorRole: {
      type: String,
      required: true,
      enum: ['CITIZEN', 'AUTHORITY_OFFICER', 'ADMIN', 'SYSTEM'],
      default: 'CITIZEN',
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isInternal: {
      type: Boolean,
      default: false,
      index: true, // true if internal confidential note or enforcement log
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const CaseEvent = mongoose.model('CaseEvent', caseEventSchema);

module.exports = CaseEvent;
