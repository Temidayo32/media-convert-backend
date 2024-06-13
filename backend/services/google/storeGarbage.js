const admin = require('../../config/firestore_config');
const cron = require('node-cron');
const firestore = admin.firestore();

const cleanupExpiredTasks = async () => {
  try {
    const now = new Date();
    const tasksSnapshot = await firestore.collectionGroup('tasks').get();
    
    for (const doc of tasksSnapshot.docs) {
      const taskData = doc.data();
      const taskId = doc.id;
      // const userId = doc.ref.parent.parent.id;
      
      if (taskData.progress === 'completed' && taskData.completedAt) {
        const completedAt = new Date(taskData.completedAt);
        const expirationTime = new Date(completedAt.getTime() + 8 * 60 * 60 * 1000);

        if (now > expirationTime) {
          console.log(`Deleting expired task: ${taskId}`);
          await doc.ref.delete();
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
  startCleanupJob,
  cleanupExpiredTasks
};
