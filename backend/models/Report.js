const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    suspectName: {
      type: String,
      trim: true,
      required: [true, 'Practitioner or Clinic name is required'],
    },
    claimedRegNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    clinicName: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
      required: [true, 'State is required'],
    },
    reason: {
      type: String,
      required: [true, 'Reason for report is required'],
      enum: [
        'Registration Not Found in Registry',
        'Suspicious or Counterfeit Certificate',
        'Practicing Without Valid Medical License',
        'Impersonating a Licensed Doctor',
        'Other Unauthorized Practice',
      ],
      default: 'Registration Not Found in Registry',
    },
    details: {
      type: String,
      trim: true,
      required: [true, 'Details regarding the suspected practice are required'],
      maxlength: 2000,
    },
    reporterName: {
      type: String,
      trim: true,
    },
    reporterContact: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Submitted', 'Under Review', 'Escalated to State Council', 'Closed'],
      default: 'Submitted',
    },
  },
  {
    timestamps: true,
  }
);

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
