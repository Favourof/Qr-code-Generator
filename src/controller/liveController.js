// controllers/liveController.js
const LiveConfig = require("../model/LiveConfig");
const redis = require("../utils/redis");

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

  try {
    // ✅ 1. First check Redis cache
    const cacheKey = "current_live_url";
    let liveUrl = await redis.get(cacheKey);

    if (!liveUrl) {
      // ✅ 2. Cache miss → fetch from DB
      const config = await LiveConfig.findOne();
      liveUrl = config?.currentLiveUrl || null;

      // ✅ Cache it for 5 mins if found
      if (liveUrl) {
        await redis.set(cacheKey, liveUrl, "EX", 300);
      }
    }

    if (liveUrl) {
      // ✅ Redirect to live URL
      return res.redirect(liveUrl);
    } else {
      // ✅ Fallback message if no live URL
      return res.send(`
        <html>
          <head><title>No Live Event</title></head>
          <body style="font-family: Arial; text-align: center; margin-top: 50px;">
            <h1>🔴 No live programme at the moment</h1>
            <p>Please check back later.</p>
          </body>
        </html>
      `);
    }
  } catch (error) {
    console.error("Redirect error:", error);
    res.status(500).send("Error fetching live programme");
  }
};
