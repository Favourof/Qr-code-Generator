const express = require("express");
const verifytoken = require("../middleWare/verifyToken");
const checkAdmin = require("../middleWare/checkAdmin");
const {
  updateLiveLink,
  redirectToLive,
} = require("../controller/liveController");

const {
  generateQRCode,
  scanQRCode,
  getScanHistory,
  unblockQRCode,
  blockQRCode,
  getTodayMealStatus,
  deleteQRCode,
  getAllQrcode,
} = require("../controller/QRCode");
const route = express.Router();
// Route to generate a new QR code
route.post("/generate", verifytoken, checkAdmin, generateQRCode);

// Route to scan a QR code and update scan history
route.post("/scan", scanQRCode);

route.get("/history/:qrNumber", getScanHistory);

route.get("/allhistory", getAllQrcode);

// Route to block a QR code
route.post("/block", verifytoken, checkAdmin, blockQRCode);

// Route to unblock a QR code
route.post("/unblock", verifytoken, checkAdmin, unblockQRCode);

// Route to fetch today's meal status by QR code number
route.get("/meal-status/:qrNumber", getTodayMealStatus);

// ✅ Admin route to update live programme link
route.post("/update-live-link", verifytoken, checkAdmin, updateLiveLink);

// ✅ Public route for scanning QR -> redirects to current live event
route.get("/redirect/:qrNumber", redirectToLive);

route.delete("/delete/:qrNumber", verifytoken, checkAdmin, deleteQRCode);

module.exports = route;
