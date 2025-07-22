// middlewares/checkAdmin.js
function checkAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (!req.user.isAmin) {
    return res.status(403).json({ message: "Access denied, admins only!" });
  }

  next();
}

module.exports = checkAdmin;
