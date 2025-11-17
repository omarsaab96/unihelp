// models/User.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    default: null
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    default: null
  },
  university: {
    type: String,
    default: null
  },
  major: {
    type: String,
    default: null
  },
  minor: {
    type: String,
    default: null
  },
  gpa: {
    type: Number,
    default: null
  },
  bio: {
    type: String,
    default: null
  },
  photo: {
    type: String,
    default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png",
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["student", "university", "admin"],
    default: "student",
  },
  notificationToken: {
    type: String,
    default: null
  },
  verified: {
    email: {
      type: Date,
      default: null
    },
    phone: {
      type: Date,
      default: null
    },
    university: {
      type: Date,
      default: null
    }
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  totalHours: {
    type: Number,
    default: 0
  },
  seeked: { type: Number, default: 0 },
  offered: { type: Number, default: 0 },
  totalSessions: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0
  },
  reviews: {
    type: Number,
    default: 0
  },
  linked: {
    type: Boolean,
    default: true
  },
  refreshTokens: [String],
  helpjobs: [
    {
      offer: {
        type: Schema.Types.ObjectId,
        ref: "HelpOffer",
        required: true,
      },
      status: {
        type: String,
        enum: ["open", "completed"],
        default: "open",
      },
      survey: {
        type: Date,
        default: null,
      },
      startedAt: {
        type: Date,
        default: Date.now,
      },
      feedback: {
        gotNeededHelp: {
          type: Boolean,
          default: true,
        },
        workDelivered: {
          type: Boolean,
          default: true,
        },
        bidderRating: {
          type: Number,
          default: null,
        },
        ownerRating: {
          type: Number,
          default: null,
        },
        feedback: {
          type: String,
          default: null,
        },
      },
      completedAt: {
        type: Date,
        default: null,
      },
      agreedPrice: {
        type: Number,
        default: 0
      },
      agreedDuration: {
        type: Number,
        default: 0
      },
      systemApproved: { type: Date, default: null },
      systemRejected: { type: Date, default: null },
      rejectReason: { type: String, default: null }
    }
  ],
  default: [],

}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
