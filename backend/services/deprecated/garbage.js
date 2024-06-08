const admin = require('../../config/firestore_config');
const cron = require('node-cron');

const bucket = admin.storage().bucket();


const cleanupExpiredTasks = async () => {
  try {
    const [files] = await bucket.getFiles({ prefix: 'tasks/' });
    const now = new Date();

    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const customMetadata = metadata.metadata || {};

      if (customMetadata.progress === 'completed' && customMetadata.completedAt) {
        const completedAt = new Date(customMetadata.completedAt);
        const expirationTime = new Date(completedAt.getTime() + 8 * 60 * 60 * 1000); 

        if (now > expirationTime) {
          console.log(`Deleting expired file: ${file.name}`);
          await file.delete();
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up expired tasks:', error);
  }
};

// Schedule the cleanup to run every 5 minutes
const startCleanupJob = () => {
  cron.schedule('*/5 * * * *', () => {
    console.log('Running cleanup job...');
    cleanupExpiredTasks();
  });
};

module.exports = {
  startCleanupJob
};
