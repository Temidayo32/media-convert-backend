const admin = require('../../config/firestore_config');
const cron = require('node-cron');

async function getAnonymousUsers() {
    return new Promise(async (resolve, reject) => {
      const anonymousUsers = [];
      let pageToken = null;
  
      try {
        do {
          // Fetch users with a page token for pagination
          const listUsersResult = await admin.auth().listUsers(1000, pageToken);
          
          // Filter out anonymous users
          const users = listUsersResult.users.filter(user => user.providerData.length === 0);
          anonymousUsers.push(...users);
          
          // Get the next page token
          pageToken = listUsersResult.pageToken;
        } while (pageToken); // Continue fetching while there are more pages
        
        resolve(anonymousUsers);
      } catch (error) {
        reject(error);
      }
    });
  }


  // Function to delete old anonymous users
async function deleteOldAnonymousUsers () {
    const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
    const anonymousUsers = await getAnonymousUsers();
    
    const promises = anonymousUsers.map(async user => {
      const userCreatedAt = new Date(user.metadata.creationTime).getTime();
      if (userCreatedAt < fiveDaysAgo) {
        return admin.auth().deleteUser(user.uid)
          .then(async () => {
            console.log(`Deleted user ${user.uid}`);
            const querySnapshot = await admin.firestore().collection('tasks').where('userId', '==', user.uid).get();
            const batch = admin.firestore().batch();
            querySnapshot.forEach(doc => {
              batch.delete(doc.ref);
            });
            return batch.commit();
          })
          .catch(error => {
            console.error(`Error deleting user ${user.uid}:`, error);
          });
      }
      return Promise.resolve();
    });
  
    await Promise.all(promises);
    console.log('Finished deleting old anonymous users');
  };
  
// Schedule the job to run every day at midnight
export function cleanAnonymousSession () {
    cron.schedule('0 15 * * *', async () => {
        console.log('Running cleanup job to delete old anonymous users');
        await deleteOldAnonymousUsers();
        });
}