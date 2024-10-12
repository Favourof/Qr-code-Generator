const QRCodeLib = require('qrcode');
const QRCodeModel = require('../model/QRCode'); // Importing the model
const HistoryModel = require('../model/history');

// Generate QR Code with sequential numbering and unique identifier
async function generateQRCode(req, res) {
  try {
    // Find the last generated QR code to determine the next number
    const lastQRCode = await QRCodeModel.findOne().sort({ createdAt: -1 });
    
    // Initialize scan history for breakfast, lunch, and dinner
    const scanHistory = {
      breakfast: false,
      lunch: false,
      dinner: false
    };

    // Get the last QR number and increment it
    let nextNumber = '001'; // Start from 001 if there is no previous QR code
    if (lastQRCode) {
      let lastNumber = parseInt(lastQRCode.qrNumber);
      nextNumber = String(lastNumber + 1).padStart(3, '0'); // Increment and pad with leading zeros
    }

    // Generate the QR code data (you can pass custom data or a unique identifier)
    const qrData = `QR Code #${nextNumber}`; // Use the sequential number as the identifier
    const qrCodeImage = await QRCodeLib.toDataURL(qrData); // Generate the QR code image
  
    // Create the new QR code document
    const newQRCode = new QRCodeModel({
      qrNumber: nextNumber,
      qrCodeData: qrCodeImage, // Store the generated QR code image
      scanHistory, // Initialize the scan history for breakfast, lunch, and dinner
      scanDate: null
    });

    // Save the generated QR code to the database
    await newQRCode.save();
  
    // Return the generated QR code details in the response
    res.status(200).json({
      message: 'QR Code generated successfully',
      qrCode: newQRCode
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generating QR Code' });
    console.log(error);
  }
}


// Function to handle QR Code scanning and save daily history
async function scanQRCode(req, res) {
  try {
    const qrCodeNumber = req.body.qrNumber; // Get the QR code number from the request body

    // Find the QR code by its number
    const qrCode = await QRCodeModel.findOne({ qrNumber: qrCodeNumber });

    if (!qrCode) {
      return res.status(404).json({ error: 'QR Code not found' });
    }

    if (qrCode.isBlocked) {
      return res.status(403).json({ error: 'This QR Code is blocked' });
    }

    // Get the current date and time
    const currentDate = new Date();
    const currentHour = currentDate.getHours();
    const formattedDate = currentDate.toISOString().split('T')[0]; // Get the current date (YYYY-MM-DD)

    // Check if it's a new day
    const lastScanDate = qrCode.scanDate ? qrCode.scanDate.toISOString().split('T')[0] : null;

    // Reset if it's a new day
    if (lastScanDate !== formattedDate) {
      // Save the history of the previous day if it's not already saved
      if (lastScanDate) {
        const previousHistory = new HistoryModel({
          qrNumber: qrCode.qrNumber,
          date: lastScanDate,
          scanHistory: qrCode.scanHistory
        });
        await previousHistory.save(); // Save the history for the previous day
      }

      // Reset the scan history for the new day
      qrCode.scanHistory = {
        breakfast: false,
        lunch: false,
        dinner: false
      };
      qrCode.scanDate = formattedDate; // Update the scan date to today
    }

    // Determine the meal type based on the current time
    let mealTime;
    if (currentHour >= 6 && currentHour < 10) {
      mealTime = 'breakfast';
    } else if (currentHour >= 12 && currentHour < 14) {
      mealTime = 'lunch';
    } else if (currentHour >= 18 && currentHour < 21) {
      mealTime = 'dinner';
    } else {
      return res.status(400).json({ error: 'Not within meal times (breakfast, lunch, or dinner)' });
    }

    // Check if the meal was already scanned today
    if (!qrCode.scanHistory[mealTime]) {
      qrCode.scanHistory[mealTime] = true; // Mark the meal as taken
    } else {
      return res.status(400).json({ error: `${mealTime} already taken today` });
    }

    // If dinner is scanned, save the history for today
    if (mealTime === 'dinner') {
      const todayHistory = new HistoryModel({
        qrNumber: qrCode.qrNumber,
        date: formattedDate,
        scanHistory: qrCode.scanHistory
      });
      await todayHistory.save(); // Save the history for today
    }

    // Save the updated QR code
    await qrCode.save();

    res.status(200).json({
      message: `${mealTime} recorded successfully`,
      qrCode
    });
  } catch (error) {
    res.status(500).json({ error: 'Error scanning QR Code' });
    console.log(error);
  }
}

// function to get the scan history
async function getScanHistory(req, res) {
  try {
    const qrNumber = req.params.qrNumber; // Get the QR code number from the request params

    // Find the history for the specific QR code
    const history = await HistoryModel.find({ qrNumber });

    if (history.length === 0) {
      return res.status(404).json({ message: 'No history found for this QR Code' });
    }

    res.status(200).json({
      message: 'History fetched successfully',
      history
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching history' });
    console.log(error);
  }
}

// Block a QR code
async function blockQRCode(req, res) {
  try {
    const { qrNumber } = req.body;

    // Find the QR code by its number
    const qrCode = await QRCodeModel.findOne({ qrNumber });

    if (!qrCode) {
      return res.status(404).json({ error: 'QR Code not found' });
    }

    // Block the QR code
    qrCode.isBlocked = true;
    await qrCode.save();

    res.status(200).json({
      message: `QR Code ${qrNumber} blocked successfully`,
      qrCode
    });
  } catch (error) {
    res.status(500).json({ error: 'Error blocking QR Code' });
  }
}

// Unblock a QR code
async function unblockQRCode(req, res) {
  try {
    const { qrNumber } = req.body;

    // Find the QR code by its number
    const qrCode = await QRCodeModel.findOne({ qrNumber });

    if (!qrCode) {
      return res.status(404).json({ error: 'QR Code not found' });
    }

    // Unblock the QR code
    qrCode.isBlocked = false;
    await qrCode.save();

    res.status(200).json({
      message: `QR Code ${qrNumber} unblocked successfully`,
      qrCode
    });
  } catch (error) {
    res.status(500).json({ error: 'Error unblocking QR Code' });
  }
}

// Function to fetch today's meal status for a specific QR code
async function getTodayMealStatus(req, res) {
  try {
    const qrNumber = req.params.qrNumber; // Get the QR code number from the request params

    // Find the QR code by its number
    const qrCode = await QRCodeModel.findOne({ qrNumber });

    if (!qrCode) {
      return res.status(404).json({ message: 'QR Code not found' });
    }

    // Get the current date in YYYY-MM-DD format
    const currentDate = new Date().toISOString().split('T')[0];

    // Check if the scan date matches today's date
    const lastScanDate = qrCode.scanDate ? qrCode.scanDate.toISOString().split('T')[0] : null;

    // If the scan date is different from today, no meals have been taken today
    if (lastScanDate !== currentDate) {
      return res.status(200).json({
        message: 'No meals scanned for today',
        mealStatus: {
          breakfast: false,
          lunch: false,
          dinner: false
        }
      });
    }

    // Return the real-time meal status for today
    res.status(200).json({
      message: 'Meal status for today',
      mealStatus: qrCode.scanHistory // Send the scan history (breakfast, lunch, dinner)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching meal status' });
    console.log(error);
  }
}

//  delete qr code
async function deleteQRCode(req, res) {
  try {
    const { qrNumber } = req.params; // Get the QR code number from the request params

    // Find and delete the QR code
    const qrCode = await QRCodeModel.findOneAndDelete({ qrNumber });

    if (!qrCode) {
      return res.status(404).json({ error: 'QR Code not found' });
    }

    // (Optional) Delete associated scan history for the QR code
    await HistoryModel.deleteMany({ qrNumber });

    res.status(200).json({
      message: `QR Code ${qrNumber} and its history deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting QR Code' });
    console.log(error);
  }
}


module.exports = {
  generateQRCode,
  scanQRCode,
  getScanHistory,
  blockQRCode,
  unblockQRCode,
  getTodayMealStatus,
  deleteQRCode
};
