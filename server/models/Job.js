const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 'notify' | 'expand-series'
  payload: { type: Object, required: true },
  status: { type: String, enum: ['queued','running','done','failed'], default: 'queued' },
  runAt: { type: Date, default: () => new Date() }, // schedule in future if needed
  attempts: { type: Number, default: 0 },
  lastError: { type: String },
}, { timestamps: true });

jobSchema.index({ status: 1, runAt: 1 }); // polling efficiency
module.exports = mongoose.model('Job', jobSchema);
