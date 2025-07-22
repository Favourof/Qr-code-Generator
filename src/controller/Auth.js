const User = require("../model/Auth");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const createToken = (id, email) => {
  return jwt.sign({ email, id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_LIFETIME,
  });
};

async function handleSignUp(req, res) {
  try {
    let { email, password, username } = req.body;

    // ✅ 1. Validate input
    if (!email || !password || !username) {
      return res
        .status(400)
        .json({ message: "Please enter email, username, and password" });
    }

    // ✅ 2. Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // ✅ 3. Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // ✅ 4. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✅ 5. Create user
    const newUser = await User.create({
      email,
      password: hashedPassword,
      username,
      isAdmin: false, // default
    });

    // ✅ 6. Send back created user (without password)
    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        isAdmin: newUser.isAmin,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({ error: "Error creating account" });
  }
}

const handleCheckAuth = async (req, res) => {
  console.log("hello");
  const user = await User.findById(req.user);
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }
  res.status(200).json(user);
};

async function handleLogin(req, res) {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res
        .status(404)
        .json({ message: "Please enter email and password" });
    }

    const userDetails = await User.findOne({ email });
    if (!userDetails) {
      return res.status(404).json({ message: "invalid credetial" });
    }

    const isMatch = await bcrypt.compare(password, userDetails.password);
    if (!isMatch) {
      return res.status(404).json({ message: "invalid  Credentail" });
    }

    //   if(userDetails.isEmailVeried == false){
    //     return res.status(404).json({message: "your Account is not Verify"})
    // }

    //  creating a token for login user with jwt
    const token = createToken(userDetails._id, userDetails.email);

    res.json({ message: "Login successful", token });

    // res.json({ message: "u are logged in" });
    console.log(userDetails);
  } catch (error) {
    res.status(500).json({ error: "error creating data", error });
  }
}

module.exports = {
  handleSignUp,
  handleLogin,
  handleCheckAuth,
};
