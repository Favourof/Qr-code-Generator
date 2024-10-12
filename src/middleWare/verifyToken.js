const jwt = require("jsonwebtoken");

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      res.status(404).json({ message: "invalicd token go and login" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(404).json("your token expire pls login");
      req.user = decoded.id;
      console.log(decoded);
      next();
    });
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // req.user = decoded;
    // // next();
    // res.status(200).json({ message: "valid token", token });
    // console.log(token);
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = { verifyToken };