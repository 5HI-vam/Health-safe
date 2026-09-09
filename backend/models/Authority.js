const mongoose = require('mongoose');

const authoritySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Authority name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Authority unique code identifier is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      required: [true, 'Authority type is required'],
      enum: [
        'STATE_MEDICAL_COUNCIL',
        'DISTRICT_HEALTH_AUTHORITY',
        'CLINICAL_ESTABLISHMENT_AUTHORITY',
        'OTHER_AUTHORITY',
      ],
      index: true,
    },
    state: {
      type: String,
      required: [true, 'State jurisdiction is required'],
      trim: true,
      index: true,
    },
    district: {
      type: String,
      trim: true,
      default: '', // empty means statewide jurisdiction within that state
      index: true,
    },
    jurisdiction: {
      type: String,
      required: [true, 'Statutory jurisdiction description is required'],
      trim: true,
    },
    categories: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    facilityTypes: [
      {
        type: String,
        trim: true,
        default: 'ALL',
      },
    ],
    contactInformation: {
      email: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      portalUrl: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' },
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    priorityRules: {
      weight: {
        type: Number,
        default: 10, // Higher weight takes precedence when multiple authorities match
      },
    },
  },
  {
    timestamps: true,
  }
);

const Authority = mongoose.model('Authority', authoritySchema);

module.exports = Authority;
