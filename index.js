require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const LiveConfig = require("./src/model/LiveConfig");

const app = express();

const authRoute = require("./src/router/Auth");
const qrcodeRoute = require("./src/router/QRCode");
// const incomeRoute = require("./src/router/income");
// const expenseRoute = require("./src/router/expense");
// const errorHandler = require('./src/middleWare/errorHandler');

const mongoApiConnect = process.env.mongoURL;
const port = process.env.port || 5000;

app.use(morgan("dev"));
app.use(express.json());
app.use(cors());
app.disable("x-powered-by");

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per minute
  message: "Too many requests, please try again later.",
});
app.use(limiter);

app.use("/api/v1", authRoute);
app.use("/api/v1", qrcodeRoute);
// app.use("/api/v1/income", incomeRoute);
// app.use("/api/v1/expense", expenseRoute);

app.get("/", (req, res) => res.send("Welcome to QR-code API"));

app.get("/proxy-image", async (req, res) => {
  try {
    const imageUrl = req.query.url; // frontend sends full URL like ?url=https://storage.googleapis.com/...
    if (!imageUrl) {
      return res.status(400).send("Image URL is required");
    }

    const response = await fetch(imageUrl);

    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch image");
    }

    // ✅ Detect content type dynamically
    const contentType = response.headers.get("content-type") || "image/png";

    // ✅ Convert to Buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", contentType);
    res.send(buffer);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).send("Error fetching image");
  }
});

app.get("/redirect/:qrNumber", async (req, res) => {
  const qrNumber = req.params.qrNumber;

  // ✅ Fetch latest live URL from DB
  const config = await LiveConfig.findOne().sort({ updatedAt: -1 });

  const liveUrl = config?.currentLiveUrl || "https://example.com/default";

  console.log(`QR ${qrNumber} scanned -> redirecting to ${liveUrl}`);

  res.redirect(liveUrl);
});
// app.use(errorHandler);

const start = async () => {
  try {
    await mongoose.connect(mongoApiConnect);
    console.log("Connected to MongoDB");
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
};

start();
// ...existing code...
