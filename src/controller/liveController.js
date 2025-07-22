// controllers/liveController.js
const LiveConfig = require("../model/LiveConfig");

exports.updateLiveLink = async (req, res) => {
  try {
    const { newLiveUrl } = req.body;

    if (!newLiveUrl) {
      return res.status(400).json({ message: "Live URL is required" });
    }

    // ✅ Save a new config entry
    const updatedConfig = await LiveConfig.create({
      currentLiveUrl: newLiveUrl,
      updatedBy: req.user?.email || "admin",
    });

    res.json({
      message: "Live programme link updated successfully",
      liveConfig: updatedConfig,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating live link" });
  }
};

// ✅ Anyone scanning a QR code will get redirected
exports.redirectToLive = async (req, res) => {
  const qrNumber = req.params.qrNumber;

  // Fetch the latest live URL
  const config = await LiveConfig.findOne().sort({ updatedAt: -1 });
  const liveUrl = config?.currentLiveUrl || process.env.DEFAULT_LIVE_URL;

  console.log(`QR ${qrNumber} scanned -> redirecting to ${liveUrl}`);

  res.redirect(liveUrl);
};
