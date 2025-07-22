const QRCodeLib = require("qrcode");
const QRCodeModel = require("../model/QRCode"); // Importing the model
const HistoryModel = require("../model/history");
const redis = require("../utils/redis");
const bucket = require("../utils/firebase"); // Firebase storage bucket
const { v4: uuidv4 } = require("uuid");
const path = require("path");

// Generate QR Code and store image in Firebase
async function generateQRCode(req, res) {
  let uploadedFile = null; // track file for rollback

  try {
    // ✅ 1. Find last QR to get next sequential number
    const lastQRCode = await QRCodeModel.findOne().sort({ createdAt: -1 });

    const scanHistory = { breakfast: false, lunch: false, dinner: false };

    let nextNumber = "001";
    if (lastQRCode) {
      let lastNumber = parseInt(lastQRCode.qrNumber);
      nextNumber = String(lastNumber + 1).padStart(3, "0");
    }

    // ✅ 2. Build the backend redirect URL
    const redirectUrl = `${process.env.BACKEND_BASE_URL}/api/v1/redirect/${nextNumber}`;

    // ✅ 3. Generate QR code buffer pointing to redirect URL
    const qrBuffer = await QRCodeLib.toBuffer(redirectUrl);

    // ✅ 4. Create unique filename for storage
    const fileName = `qr-code-${nextNumber}-${uuidv4()}.png`;
    uploadedFile = `qr-codes/${fileName}`; // remember for rollback
    const file = bucket.file(uploadedFile);

    // ✅ 5. Upload QR PNG to Firebase Storage
    await file.save(qrBuffer, {
      metadata: {
        contentType: "image/png",
        metadata: { firebaseStorageDownloadTokens: uuidv4() },
      },
    });

    // ✅ 6. Make public (optional)
    await file.makePublic();

    // ✅ 7. Get public URL of the stored QR image
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/qr-codes/${fileName}`;

    // ✅ 8. Create QR Code DB entry
    const newQRCode = new QRCodeModel({
      qrNumber: nextNumber,
      qrCodeData: publicUrl, // Firebase image link
      scanHistory,
      scanDate: null,
    });

    // ✅ 9. Save QR metadata to MongoDB
    await newQRCode.save();

    // ✅ 10. Update Redis cache if it exists
    const cacheKey = "all-qr-codes";
    const cached = await redis.get(cacheKey);
    if (cached) {
      const qrList = JSON.parse(cached);
      qrList.push(newQRCode);
      await redis.set(cacheKey, JSON.stringify(qrList), "EX", 300);
    }

    res.status(200).json({
      message: "✅ QR Code generated successfully",
      qrCode: newQRCode,
      redirectUrl, // useful for debugging
    });
  } catch (error) {
    console.error("Error generating QR Code:", error);

    // ❗ Rollback: Delete uploaded file if DB failed
    if (uploadedFile) {
      try {
        await bucket.file(uploadedFile).delete();
        console.log(`Rolled back Firebase file: ${uploadedFile}`);
      } catch (delErr) {
        console.error("Rollback delete failed:", delErr);
      }
    }

    res.status(500).json({ error: "Error generating QR Code" });
  }
}

// Function to handle QR Code scanning and save daily history
async function scanQRCode(req, res) {
  try {
    const qrCodeNumber = req.body.qrNumber;
    const qrCode = await QRCodeModel.findOne({ qrNumber: qrCodeNumber });

    if (!qrCode) return res.status(404).json({ error: "QR Code not found" });
    if (qrCode.isBlocked)
      return res.status(403).json({ error: "QR Code is blocked" });

    const currentDate = new Date();
    const currentHour = currentDate.getHours();
    const formattedDate = currentDate.toISOString().split("T")[0];

    const lastScanDate = qrCode.scanDate
      ? qrCode.scanDate.toISOString().split("T")[0]
      : null;

    // ✅ New day → Save yesterday’s record before resetting
    if (lastScanDate !== formattedDate) {
      if (lastScanDate) {
        await new HistoryModel({
          qrNumber: qrCode.qrNumber,
          date: lastScanDate,
          scanHistory: qrCode.scanHistory,
        }).save();
      }

      qrCode.scanHistory = { breakfast: false, lunch: false, dinner: false };
      qrCode.scanDate = formattedDate;
    }

    // ✅ Determine meal time
    let mealTime;
    if (currentHour >= 7 && currentHour < 12) mealTime = "breakfast";
    else if (currentHour >= 12 && currentHour < 16) mealTime = "lunch";
    else if (currentHour >= 16 && currentHour < 24) mealTime = "dinner";
    else return res.status(404).json({ error: "Not within meal times" });

    // ✅ Prevent double scan for the same meal
    if (qrCode.scanHistory[mealTime]) {
      return res.status(404).json({ error: `${mealTime} already taken today` });
    }

    qrCode.scanHistory[mealTime] = true;

    // ✅ If dinner is last meal → Save full-day history
    if (mealTime === "dinner") {
      await new HistoryModel({
        qrNumber: qrCode.qrNumber,
        date: formattedDate,
        scanHistory: qrCode.scanHistory,
      }).save();
    }

    // ✅ Save updated scan record to DB (true source of truth)
    await qrCode.save();

    // ✅ Update specific QR meal-status cache (fast reads)
    const mealCacheKey = `meal-status:${qrCode.qrNumber}`;
    await redis.set(
      mealCacheKey,
      JSON.stringify(qrCode.scanHistory),
      "EX",
      300
    );

    // ✅ Incrementally update `all-qr-codes` cache if it exists
    const allCacheKey = "all-qr-codes";
    try {
      const cachedAll = await redis.get(allCacheKey);
      if (cachedAll) {
        let qrList = JSON.parse(cachedAll);

        // Find this QR in cached list
        const index = qrList.findIndex(
          (item) => item.qrNumber === qrCode.qrNumber
        );
        if (index !== -1) {
          // Update the cached item with new scanHistory & scanDate
          qrList[index].scanHistory = qrCode.scanHistory;
          qrList[index].scanDate = qrCode.scanDate;
        }

        // Save updated list back to Redis
        await redis.set(allCacheKey, JSON.stringify(qrList), "EX", 300);
      }
    } catch (cacheErr) {
      console.error(
        "Failed to incrementally update all-qr-codes cache:",
        cacheErr
      );
      // Don't fail request if cache update fails
    }

    res.status(200).json({
      message: `${mealTime} recorded successfully`,
      qrCode,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error scanning QR Code" });
  }
}

// function to get the scan history
async function getScanHistory(req, res) {
  try {
    const qrNumber = req.params.qrNumber; // Get the QR code number from the request params

    // Find the history for the specific QR code
    const history = await HistoryModel.find({ qrNumber });

    if (history.length === 0) {
      return res
        .status(404)
        .json({ message: "No history found for this QR Code" });
    }

    res.status(200).json({
      message: "History fetched successfully",
      history,
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching history" });
    console.log(error);
  }
}

// block qr code
async function blockQRCode(req, res) {
  try {
    const { qrNumber } = req.body;

    // ✅ Find the QR code by its number
    const qrCode = await QRCodeModel.findOne({ qrNumber });

    if (!qrCode) {
      return res.status(404).json({ error: "QR Code not found" });
    }

    // ✅ Block the QR code
    qrCode.isBlocked = true;
    await qrCode.save();

    const allCacheKey = "all-qr-codes";
    const mealCacheKey = `meal-status:${qrNumber}`;

    try {
      // ✅ Remove meal-status cache for this QR (blocked → no more scans)
      await redis.del(mealCacheKey);

      // ✅ Incrementally update the all-qr-codes cache
      const cachedAll = await redis.get(allCacheKey);
      if (cachedAll) {
        let qrList = JSON.parse(cachedAll);

        // Find and update this QR in cached list
        const index = qrList.findIndex((item) => item.qrNumber === qrNumber);
        if (index !== -1) {
          qrList[index].isBlocked = true;
        }

        // Save updated list back to Redis
        await redis.set(allCacheKey, JSON.stringify(qrList), "EX", 300);
      }
    } catch (cacheErr) {
      console.error("Failed to incrementally update Redis cache:", cacheErr);
      // Don’t fail the request if cache update fails
    }

    res.status(200).json({
      message: `QR Code ${qrNumber} blocked successfully`,
      qrCode,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error blocking QR Code" });
  }
}

// Unblock a QR code
async function unblockQRCode(req, res) {
  try {
    const { qrNumber } = req.body;

    // ✅ Find the QR code by its number
    const qrCode = await QRCodeModel.findOne({ qrNumber });

    if (!qrCode) {
      return res.status(404).json({ error: "QR Code not found" });
    }

    // ✅ Unblock the QR code in DB
    qrCode.isBlocked = false;
    await qrCode.save();

    const allCacheKey = "all-qr-codes";
    const mealCacheKey = `meal-status:${qrNumber}`;

    try {
      // ✅ Remove meal-status cache (to avoid stale states after unblock)
      await redis.del(mealCacheKey);

      // ✅ Incrementally update all-qr-codes cache
      const cachedAll = await redis.get(allCacheKey);
      if (cachedAll) {
        let qrList = JSON.parse(cachedAll);

        // Find and update this QR entry in cached list
        const index = qrList.findIndex((item) => item.qrNumber === qrNumber);
        if (index !== -1) {
          qrList[index].isBlocked = false;
        }

        // Save updated list back to Redis
        await redis.set(allCacheKey, JSON.stringify(qrList), "EX", 300);
      }
    } catch (cacheErr) {
      console.error("Failed to incrementally update Redis cache:", cacheErr);
      // Don’t fail the request if cache update fails
    }

    res.status(200).json({
      message: `QR Code ${qrNumber} unblocked successfully`,
      qrCode,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error unblocking QR Code" });
  }
}

// Function to fetch today's meal status for a specific QR code
async function getTodayMealStatus(req, res) {
  try {
    const qrNumber = req.params.qrNumber;
    const cacheKey = `meal-status:${qrNumber}`;

    // ✅ 1️⃣ Check Redis cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json({
        message: "Meal status (from cache)",
        mealStatus: JSON.parse(cached),
      });
    }

    // ✅ 2️⃣ Cache miss → Fetch from DB (always source of truth)
    const qrCode = await QRCodeModel.findOne({ qrNumber });
    if (!qrCode) return res.status(404).json({ message: "QR Code not found" });

    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];
    const lastScanDate = qrCode.scanDate
      ? qrCode.scanDate.toISOString().split("T")[0]
      : null;

    let mealStatus = { breakfast: false, lunch: false, dinner: false };
    if (lastScanDate === currentDate) {
      mealStatus = qrCode.scanHistory;
    }

    // ✅ 3️⃣ Compute TTL = seconds until midnight (to auto-expire daily)
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const secondsUntilMidnight = Math.floor((midnight - now) / 1000);

    // ✅ 4️⃣ Cache today’s meal status until midnight
    await redis.set(
      cacheKey,
      JSON.stringify(mealStatus),
      "EX",
      secondsUntilMidnight
    );

    return res.status(200).json({
      message: "Meal status for today",
      mealStatus,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching meal status" });
  }
}

//  delete qr code
async function deleteQRCode(req, res) {
  try {
    const { qrNumber } = req.params;

    // ✅ 1️⃣ Find the QR code
    const qrCode = await QRCodeModel.findOneAndDelete({ qrNumber });
    if (!qrCode) {
      return res.status(404).json({ error: "QR Code not found" });
    }

    // ✅ 2️⃣ Delete associated scan history
    await HistoryModel.deleteMany({ qrNumber });

    // ✅ 3️⃣ Remove Redis meal-status cache
    const qrMealKey = `meal-status:${qrNumber}`;
    await redis.del(qrMealKey);

    // ✅ 4️⃣ Extract Firebase filename from public URL
    if (
      qrCode.qrCodeData &&
      qrCode.qrCodeData.includes("storage.googleapis.com")
    ) {
      // Example: https://storage.googleapis.com/<bucket-name>/qr-codes/qr-code-001-uuid.png
      const parts = qrCode.qrCodeData.split("/qr-codes/");
      if (parts.length === 2) {
        const filePath = `qr-codes/${parts[1]}`;
        try {
          await bucket.file(filePath).delete();
          console.log(`✅ Deleted Firebase file: ${filePath}`);
        } catch (err) {
          console.error(`⚠️ Failed to delete Firebase file: ${filePath}`, err);
        }
      }
    }

    // ✅ 5️⃣ Incrementally update `all-qr-codes` cache
    const allCacheKey = "all-qr-codes";
    const cachedAll = await redis.get(allCacheKey);
    if (cachedAll) {
      let allCodes = JSON.parse(cachedAll);
      // Filter out the deleted QR
      allCodes = allCodes.filter((code) => code.qrNumber !== qrNumber);
      await redis.set(allCacheKey, JSON.stringify(allCodes), "EX", 300);
    }

    res.status(200).json({
      message: `QR Code ${qrNumber} & its history deleted successfully`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error deleting QR Code" });
  }
}

// get all qr-codes with Redis cache
async function getAllQrcode(req, res) {
  try {
    const cacheKey = "all-qr-codes";

    // 1️⃣ Try Redis cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json({
        message: "All QR codes (from cache)",
        qrCodes: JSON.parse(cached),
      });
    }

    // 2️⃣ Cache miss → Fetch from DB
    const allCodes = await QRCodeModel.find().lean();

    if (!allCodes || allCodes.length === 0) {
      return res.status(404).json({ message: "No QR codes found" });
    }

    // 3️⃣ Cache the result for future calls
    await redis.set(cacheKey, JSON.stringify(allCodes), "EX", 300);

    return res.status(200).json({
      message: "All QR codes fetched successfully (from DB)",
      qrCodes: allCodes,
    });
  } catch (error) {
    console.error("Error fetching all QR codes:", error);
    res.status(500).json({ error: "Error fetching all QR codes" });
  }
}

module.exports = {
  generateQRCode,
  scanQRCode,
  getScanHistory,
  blockQRCode,
  unblockQRCode,
  getTodayMealStatus,
  deleteQRCode,
  getAllQrcode,
};
