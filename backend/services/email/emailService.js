const admin = require('../../config/firestore_config');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Function to send a verification email
async function sendVerificationEmail(userEmail) {
  try {
    // Get the user by email
    // const userRecord = await admin.auth().getUserByEmail(userEmail);
    // console.log(userRecord)

    // Generate the email verification link
    const link = await admin.auth().generateEmailVerificationLink(userEmail);

    // Create a transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_ADDRESS, 
        clientId: process.env.FIREBASE_CLIENT_ID,
        clientSecret: process.env.FIREBASE_CLIENT_SECRET, 
        refreshToken: process.env.FIREBASE_REFRESH_TOKEN 
      }
    });

    // Set up email data
    const mailOptions = {
        from: 'noreply@angelic-turbine-407011.firebaseapp.com',
        to: userEmail,
        subject: 'Verify your email address',
        text: `Hello,
    
                Follow this link to verify your email address.
                
                ${link}
                
                If you didn’t ask to verify this address, you can ignore this email.
                
                Thanks.
            `
      };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log('Verification email sent to:', userEmail);
  } catch (error) {
    console.error('Error sending verification email:', error);
  }
}

module.exports = {sendVerificationEmail}
