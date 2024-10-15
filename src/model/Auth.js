const mongoose = require("mongoose");

const { Schema } = mongoose;

const validateEmail = function (email) {
  let re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(email);
};

const UserSchema = Schema({
  email: {
    type: String,
    required: "Email address is required",
    trim: true,
    unique: true,
    validate: [validateEmail, "Please fill a valid email address"],
    lowercase: true,
  },
  isEmailVeried: {
    type: Boolean,
    default: false,
  },
  isAmin: {
    type: Boolean,
    default: false,
  },
  password: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("User", UserSchema);
