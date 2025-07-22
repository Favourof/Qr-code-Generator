const express = require("express");
const {
  handleSignUp,
  handleLogin,
  handleCheckAuth,
} = require("../controller/Auth");
const verifyToken = require("../middleWare/verifyToken");

const route = express.Router();

route.post("/signupuser", handleSignUp);
route.post("/loginuser", handleLogin);
route.post("/checkauth", verifyToken, handleCheckAuth);

module.exports = route;
