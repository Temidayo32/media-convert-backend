const axios = require('axios');
require('dotenv').config();

const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET
const REDIRECT_URI = 'http://localhost:3000';

const authenticateWithDropbox = async (code) => {
  try {
    const response = await axios.post('https://api.dropboxapi.com/oauth2/token', null, {
      params: {
        code,
        grant_type: 'authorization_code',
        client_id: DROPBOX_APP_KEY,
        client_secret: DROPBOX_APP_SECRET,
        redirect_uri: REDIRECT_URI,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error exchanging Dropbox auth code for tokens:', error);
    throw new Error('Internal Server Error');
  }
};

module.exports = authenticateWithDropbox;
