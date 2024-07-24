const { sendVerificationEmail } = require('../services/email/emailService');


// Middleware function to send verification email
async function email(req, res) {
    const { email } = req.body;
  
    if (!email) {
      return res.status(400).send('Email is required');
    }
  
    try {
      await sendVerificationEmail(email);
      res.status(200).send('Verification email sent');
    } catch (error) {
      res.status(500).send('Failed to send verification email');
    }
  }

module.exports = {email}