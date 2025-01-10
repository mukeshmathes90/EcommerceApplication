require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const path = require('path');

const User = mongoose.model('User', new mongoose.Schema({
  email: String,
  password: String,
  resetCode: Number,
  resetCodeExpires: Date,
}));

// Initialize Express
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));


app.use(express.static(path.join(__dirname, 'views')));

// Path to serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/reset', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'reset.html'));
});

app.get('/reset-code', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'reset-code.html'));
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Database Connected'))
  .catch(err => console.log(err));

// Register User
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).send('Email is already registered!');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    email,
    password: hashedPassword
  });

  await user.save();
  res.send('User Registration Successful!');
});

// Login User

app.post('/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user && await bcrypt.compare(req.body.password, user.password)) {
    res.send('Login Successful');
   
  } else {
    res.send('Invalid Email or Password');
  }
});

app.post('/reset', async (req, res) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).send('Email not found');
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000); // 6-digit code
    user.resetCode = resetCode;
    user.resetCodeExpires = Date.now() + 3600000; 
    await user.save();

    // Nodemailer Transporter
  const EMAIL = process.env.EMAIL;
  const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL, 
        pass: process.env.EMAIL_PASSWORD, 
      },
    });

    const mailOptions = {
      from: EMAIL,
      to: email,
      subject: 'Password Reset Code',
      text: `
      Dear Sir/Madam;
           Your password reset code is: ${resetCode}. This code is valid for 1 hour.`,
           
    };

    await transporter.sendMail(mailOptions);
    res.status(200).send('<h1>Reset code sent to your email</h1> <br> <br> <p>To Enter Verification Code </p> <a href="/reset-password.html">Enter Reset Code</a>"');
  } catch (err) {
    console.error('Error processing password reset:', err);
    res.status(500).send('Internal server error.');
  }
});

module.exports = app;

// Verify Reset Code and Update Password
app.post('/reset-password', async (req, res) => {
  const { email, code, password } = req.body;

  const user = await User.findOne({
    email,
    resetCode: code,
    resetCodeExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).send('Invalid or expired reset code.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  user.password = hashedPassword;
  user.resetCode = undefined;
  user.resetCodeExpires = undefined;
  await user.save();

  res.send('<h1>Password updated successfully!</h1> <br> <br> <a href="/login.html">Login here</a>');
});

// Start Server
app.listen(3000, () => console.log('Server running on http://localhost:3000'));
