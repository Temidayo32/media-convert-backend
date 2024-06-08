const { Storage } = require('@google-cloud/storage');


const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS; 
const storage = new Storage({ keyFilename });

const bucketName = 'media_convert_free' 

const uploadToGCS = async (filePath, destination) => {
  await storage.bucket(bucketName).upload(filePath, {
    destination,
  });
  console.log(`${filePath} uploaded to ${bucketName}/${destination}`);
};

const generateSignedUrl = async (filename) => {
    const options = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + 8 * 60 * 60 * 1000, // URL expires in 8 hours
    };
  
    // Generate a signed URL for the file
    const [url] = await storage.bucket(bucketName).file(filename).getSignedUrl(options);
    return url;
  };
  

const scheduleFileDeletion = async (filename) => {
  const file = storage.bucket(bucketName).file(filename);
  await file.setMetadata({ expiration: new Date(Date.now() + 8 * 60 * 60 * 1000) }); // Set expiration time to 8 hours from now
  console.log(`Scheduled deletion for ${filename} in 8 hours.`);
};

module.exports = { uploadToGCS, generateSignedUrl, scheduleFileDeletion };
