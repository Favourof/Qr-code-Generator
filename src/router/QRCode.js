const express = require('express');

const { generateQRCode, scanQRCode, getScanHistory, unblockQRCode, blockQRCode, getTodayMealStatus, deleteQRCode, getAllQrcode } = require('../controller/QRCode');
const route = express.Router();
// Route to generate a new QR code
route.post('/generate', generateQRCode);

// Route to scan a QR code and update scan history
route.post('/scan', scanQRCode);

route.get('/history/:qrNumber', getScanHistory);

route.get('/allhistory', getAllQrcode)

// Route to block a QR code
route.post('/block', blockQRCode);

// Route to unblock a QR code
route.post('/unblock', unblockQRCode);

// Route to fetch today's meal status by QR code number
route.get('/meal-status/:qrNumber', getTodayMealStatus);

route.delete('/delete/:qrNumber', deleteQRCode);

module.exports = route;
