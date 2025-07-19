require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");

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

// app.use(errorHandler);

const start = async () => {
  try {
    await mongoose.connect(mongoApiConnect);
    console.log("Connected to MongoDB");
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
  
    console.error("Failed to connect to MongoDBServer:", error.message);
    process.exit(1);
  }
};

start();
// ...existing code...
