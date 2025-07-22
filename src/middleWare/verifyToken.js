const jwt = require("jsonwebtoken");
const User = require("../model/Auth"); // To fetch full user info

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "No token provided. Please login." });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res
          .status(401)
          .json({ message: "Token expired or invalid. Please login again." });
      }

      // ✅ Fetch user info from DB and attach to req.user
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res
          .status(401)
          .json({ message: "User not found. Please login again." });
      }

      req.user = user; // ✅ Attach user to request
      next(); // ✅ Continue to checkAdmin or route handler
    });
  } catch (error) {
    console.error("verifyToken error:", error);
    res.status(401).json({ message: "Authentication failed" });
  }
};

module.exports = verifyToken;
