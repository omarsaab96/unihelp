const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const scheduleSchema = new Schema({
    title: String,
    description: String,
    eventType: {
        type: String,
        required: [true, 'Event type is required'],
        enum: ['Training', 'Match', 'Meeting', 'Tournament'],
        default: 'training'
    },
    startDateTime: Date,
    endDateTime: {
        type: Date,
        required: [true, 'End date/time is required'],
        validate: {
            validator: function (value) {
                return value > this.startDateTime;
            },
            message: 'End date must be after start date'
        }
    },
    isAllDay: Boolean,
    repeats: {
        type: String,
        enum: ['No', 'Daily', 'Weekly', 'Monthly', 'Yearly'],
        default: 'No'
    },
    repeatEndDate: Date,
    locationType: String,
    venue: String,
    onlineLink: String,
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
    },
    coaches: [String],

    // For matches
    opponent: String,
    isHomeGame: Boolean,
    competition: String,

    // For Training Sessions
    trainingFocus: String,
    requiredEquipment: [
        {
            itemId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Equipment', // or whatever your equipment model is
                required: true
            },
            name: {
                type: String,
                required: true
            },
            quantity: {
                type: Number,
                required: true
            }
        }
    ],

    // Additional Info
    // attachments: [{
    //     name: String,
    //     url: String,
    //     type: String
    // }],
    notes: String,
    isPrivate: Boolean,

    // System
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    club: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date,
    participants: [
        {
            user: { type: Schema.Types.ObjectId, ref: 'User' },
            status: {
                type: String,
                enum: ['pending', 'confirmed', 'declined', 'tentative'],
                default: 'pending',
            },
            responseDate: Date,
        }
    ],
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for faster querying
scheduleSchema.index({ team: 1, startDateTime: 1 });
scheduleSchema.index({ club: 1, startDateTime: 1 });
scheduleSchema.index({ 'participants.user': 1, startDateTime: 1 });

// Virtual for duration (not stored in DB)
scheduleSchema.virtual('duration').get(function () {
    return (this.endDateTime - this.startDateTime) / (1000 * 60 * 60); // in hours
});

// Pre-save hook to validate dates
// scheduleSchema.pre('save', function (next) {
//     if (this.repeats !== 'No' && !this.repeatEndDate) {
//         throw new Error('Repeat end date is required for recurring events');
//     }
//     this.updatedAt = Date.now();
//     next();
// });

// Static method to get events in date range
scheduleSchema.statics.getEventsInRange = async function (clubId, startDate, endDate) {
    return this.find({
        club: clubId,
        startDateTime: { $gte: startDate },
        endDateTime: { $lte: endDate },
        status: { $ne: 'cancelled' }
    }).populate('team participants.user coaches');
};

// Instance method to check if user is participant
scheduleSchema.methods.isParticipant = function (userId) {
    return this.participants.some(p => p.user.equals(userId));
};

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;