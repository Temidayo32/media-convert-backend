const { google } = require('googleapis');
const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');
const stream = require('stream');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

const auth = new GoogleAuth({
  keyFile: keyFile,
  scopes: SCOPES,
});
const drive = google.drive({ version: 'v3', auth });

async function getGoogleDriveFileStream(fileId) {
  const response = await drive.files.get({ fileId, alt: 'media'}, { responseType: 'stream' });
  return response.data;
//   const videoUrl = `https://drive.google.com/uc?id=${fileId}&export=download`
//   return videoUrl;
}

async function saveStreamToFile(stream, filePath) {
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(filePath);
      stream.pipe(writeStream);
      stream.on('end', resolve);
      stream.on('error', reject);
    });
  }

module.exports = { saveStreamToFile, getGoogleDriveFileStream };
