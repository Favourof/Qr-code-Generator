const User = require("../model/Auth");
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken");


const createToken = (id, email) => {
  return jwt.sign({ email, id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_LIFETIME,
  });
};


async function handleSignUp(req, res) {
    let {  email,  password, username } = req.body;
    try {
      if (!email || !password || !username) {
        return res.status(404).json({message: "Enter Your Details"})
      }
  
         const checkIfUserAlreadyExit = await User.find({email})
         if(checkIfUserAlreadyExit == email){
             return res.status(400).json({message:"User already exist"})
         }
        
        
      const salt = await bcrypt.genSalt();
  
    password = await bcrypt.hash(password, salt);
  
        const response = await User.create({email, password, username});
      res.status(200).json(response);
      console.log('success');
  
    } catch (error) {
      res.status(500).json({ error: "error creating data", error });
      console.log(error);
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
    const {email, password} = req.body;
     try {
      if (!email || !password) {
        return res.status(404).json({message: "fill in Your Details"})
      }
  
      const userDetails = await User.findOne({email})
    if (!userDetails) {
      return res.status(404).json({message: "invalid credetial"})
     }
  
     const isMatch = await bcrypt.compare(password, userDetails.password);
      if (!isMatch) {
        return res.status(404).json({ message: "invalid login Credentail" });
      }
  
    //   if(userDetails.isEmailVeried == false){
    //     return res.status(404).json({message: "your Account is not Verify"})
    // }

       //  creating a token for login user with jwt
       const token = createToken(userDetails._id, userDetails.email);

       res.json({ message: "u are logged in", token });
  
    // res.json({ message: "u are logged in" });
      console.log(userDetails);
      
     } catch (error) {
      res.status(500).json({ error: "error creating data", error });
     }
  }

  module.exports = {
    handleSignUp,
    handleLogin,
    handleCheckAuth
  }