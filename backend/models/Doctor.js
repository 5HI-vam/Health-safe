const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
      index: true,
    },
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      trim: true,
      unique: true,
      uppercase: true,
    },
    normalizedRegNo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    qualification: {
      type: String,
      required: [true, 'Qualification is required'],
      trim: true,
    },
    council: {
      type: String,
      required: [true, 'Medical Council is required'],
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      index: true,
    },
    registrationYear: {
      type: Number,
      min: 1950,
      max: new Date().getFullYear() + 1,
    },
    status: {
      type: String,
      enum: ['Active', 'Suspended', 'Lapsed', 'Under Review'],
      default: 'Active',
      index: true,
    },
    source: {
      type: String,
      default: 'State Medical Council Registry (Seeded Demonstration Archive)',
    },
    lastVerifiedAt: {
      type: Date,
      default: Date.now,
    },
    specialty: {
      type: String,
      trim: true,
      default: 'General Practitioner',
    },
  },
  {
    timestamps: true,
  }
);

// Helper function to normalize registration numbers:
// removes leading/trailing spaces, collapses multiple hyphens/spaces, and converts to uppercase
doctorSchema.statics.normalizeRegNo = function (regNo) {
  if (!regNo || typeof regNo !== 'string') return '';
  return regNo
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ''); // Pure alphanumeric for canonical matching
};

// Hook to ensure normalizedRegNo is always populated prior to validation
doctorSchema.pre('validate', function () {
  if (this.registrationNumber) {
    this.normalizedRegNo = mongoose.model('Doctor').normalizeRegNo(this.registrationNumber);
  }
});

// Compound indexes for multi-field searches
doctorSchema.index({ state: 1, name: 1 });
doctorSchema.index({ council: 1, name: 1 });

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;
