// models/LiveConfig.js
const mongoose = require("mongoose");

const LiveConfigSchema = new mongoose.Schema(
  {
    currentLiveUrl: {
      type: String,
      required: true,
    },
    updatedBy: {
      type: String, // optional: admin user id/email
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LiveConfig", LiveConfigSchema);
