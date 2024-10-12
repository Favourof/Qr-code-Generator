const mongoose = require('mongoose');

// History schema to store daily scan history
const historySchema = new mongoose.Schema({
  qrNumber: {
    type: String,
    required: true
  },
  date: {
    type: String, // Store the date in YYYY-MM-DD format
    required: true
  },
  scanHistory: {
    breakfast: { type: Boolean, default: false },
    lunch: { type: Boolean, default: false },
    dinner: { type: Boolean, default: false }
  }
});

const History = mongoose.model('History', historySchema);

module.exports = History;
