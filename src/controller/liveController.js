// controllers/liveController.js
const LiveConfig = require("../model/LiveConfig");
const redis = require("../utils/redis");

exports.updateLiveLink = async (req, res) => {
  try {
    const { newLiveUrl } = req.body;

    if (!newLiveUrl) {
      return res.status(400).json({ message: "Live URL is required" });
    }

    // ✅ Replace existing config (or create if none)
    const updatedConfig = await LiveConfig.findOneAndUpdate(
      {},
      {
        currentLiveUrl: newLiveUrl,
        updatedBy: req.user?.email || "admin",
      },
      { new: true, upsert: true }
    );

    // ✅ Refresh Redis cache (remove old & set new)
    const cacheKey = "current_live_url";
    await redis.del(cacheKey);
    await redis.set(cacheKey, newLiveUrl, "EX", 300);

    res.json({
      message: "Live programme link updated successfully",
      liveConfig: updatedConfig,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating live link" });
  }
};

exports.redirectToLive = async (req, res) => {
  try {
    const cacheKey = "current_live_url";

    // ✅ 1. Try Redis cache first
    let liveUrl = await redis.get(cacheKey);

    if (!liveUrl) {
      // ✅ 2. Cache miss → fetch from DB
      const config = await LiveConfig.findOne();
      liveUrl = config?.currentLiveUrl || null;

      if (liveUrl) {
        await redis.set(cacheKey, liveUrl, "EX", 300); // refresh cache
      }
    }

    if (liveUrl) {
      return res.redirect(liveUrl);
    } else {
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
