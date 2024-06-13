const { updateTaskProgress } = require('../../services/google/firestore');
const { Firestore } = require('@google-cloud/firestore');


console.error = jest.fn();
console.log = jest.fn();
// Mock Firestore
jest.mock('@google-cloud/firestore', () => {
    const firestoreInstance = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          set: jest.fn()
        }))
      }))
    };
    return {
      Firestore: jest.fn(() => firestoreInstance)
    };
  });
  
  describe('updateTaskProgress', () => {
    test('should update task progress in Firestore', async () => {
      // Mock data and userId
      const data = {
        jobId: '123',
        name: 'Task Name',
        format: 'mp4',
        progress: 'completed',
        url: 'https://example.com/task123'
      };
      const userId = 'user123';
  
      // Call the function to update task progress
      await updateTaskProgress(data, userId);
  
      // Assert Firestore methods were called with the correct parameters
      const firestoreInstance = new Firestore({ keyFilename: process.env.GOOGLE_FIRESTORE });
      expect(Firestore).toHaveBeenCalledTimes(2);
      expect(Firestore).toHaveBeenCalledWith({ keyFilename: process.env.GOOGLE_FIRESTORE });
      expect(firestoreInstance.collection).toHaveBeenCalledWith('tasks');
    });
});
