const { Storage } = require('@google-cloud/storage');
const cron = require('node-cron');

const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS; 
const storage = new Storage({ keyFilename });

const bucketName = 'media_convert_free' 

// Function to perform garbage cleaning
const garbageCleaner = async () => {
  try {
    const now = Date.now();
    const expirationTime = now - 8 * 60 * 60 * 1000; // 8 hours ago

    // List files in the bucket
    const [files] = await storage.bucket(bucketName).getFiles();

    // Iterate through files and delete expired ones
    await Promise.all(
      files.map(async (file) => {
        const [metadata] = await file.getMetadata();
        const createdTime = Date.parse(metadata.timeCreated);
        if (createdTime < expirationTime) {
          console.log(`Deleting expired file: ${file.name}`);
          await file.delete();
        }
      })
    );

    console.log('Garbage cleaning completed.');
  } catch (error) {
    console.error('Error performing garbage cleaning:', error);
  }
};

const startStoreCleanup = () => {
    cron.schedule('*/5 * * * *', () => {
      console.log('Running cloud storage cleanup job...');
      garbageCleaner();
    });
  };
  
  module.exports = {
    startStoreCleanup
  };