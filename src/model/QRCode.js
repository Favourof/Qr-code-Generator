const mongoose = require('mongoose');

// Define the schema for QR Codes
const qrCodeSchema = new mongoose.Schema({
  qrNumber: {
    type: String,
    required: true,
    unique: true
  },
  qrCodeData: {
    type: String, // The data URL for the generated QR code image
    required: true
  },
  scanHistory: {
    breakfast: {
      type: Boolean,
      default: false
    },
    lunch: {
      type: Boolean,
      default: false
    },
    dinner: {
      type: Boolean,
      default: false
    }
  },
  scanDate: {
    type: Date,
    default: null // This will be updated when the QR code is scanned
  },
  isBlocked: {
    type: Boolean,
    default: false // Block/unblock QR code
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create the model from the schema and export it
const QRCode = mongoose.model('QRCode', qrCodeSchema);

module.exports = QRCode;
