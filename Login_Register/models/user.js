const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetCode: { type: Number, required: false },  // Numeric reset code
  resetCodeExpires: { type: Date, required: false }  // Expiry date of the reset code
});

module.exports = mongoose.model('User', UserSchema);
