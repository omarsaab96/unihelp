const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    userRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true
    },
    role: {
      type: String,
      enum: [
        'Coach',
        'Assistant Coach',
        'Manager',
        'Admin',
        'Board Member',
        'Medical Staff',
        'Other',
      ],
      default: 'Coach',
    },
    employmentType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Volunteer'],
      default: 'Full-time',
    },
    salary: String,
    qualifications: [String],
    certifications: [String],
    teams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    profileImage: String, // If you want to store image URL
  },
  { timestamps: true }
);

module.exports = mongoose.model('Staff', staffSchema, 'staff');

