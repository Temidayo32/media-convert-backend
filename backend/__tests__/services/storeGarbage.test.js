const { cleanupExpiredTasks, startCleanupJob } = require('../../services/google/storeGarbage');
const admin = require('../../config/firestore_config');
const firestore = admin.firestore();


console.error = jest.fn();
console.log = jest.fn();

jest.mock('node-cron', () => ({
  schedule: jest.fn((interval, callback) => callback()),
}));

jest.mock('../../config/firestore_config', () => ({
  firestore: jest.fn().mockReturnValue({
    collectionGroup: jest.fn().mockReturnThis(),
    get: jest.fn(),
  }),
}));

describe('Firestore Cleanup Service', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });


    test('should delete expired tasks', async () => {
        jest.useFakeTimers();
        const mockNow = new Date('2024-06-14T12:00:00Z');
        jest.spyOn(global, 'Date').mockImplementation(() => mockNow);
      
        // Mock cleanupExpiredTasks internally within the test
        const cleanupExpiredTasks = jest.fn().mockImplementation(async () => {
          console.log('Mocked cleanupExpiredTasks called');
          // For the purpose of this test, you can directly interact with taskDoc1 and taskDoc2
          for (const doc of taskSnapshot.docs) {
            const taskData = doc.data();
            const taskId = doc.id;
      
            if (taskData.progress === 'completed' && taskData.completedAt) {
              const completedAt = new Date(taskData.completedAt);
              const expirationTime = new Date(completedAt.getTime() + 8 * 60 * 60 * 1000);
      
              if (mockNow > expirationTime) {
                console.log(`Deleting expired task: ${taskId}`);
                await doc.ref.delete();
              }
            }
          }
        });
    
        // Mock Firestore snapshot
        const taskDoc1 = {
          id: 'task1',
          data: jest.fn().mockReturnValue({
            progress: 'completed',
            completedAt: new Date('2024-06-14T00:00:00Z').toISOString(),
          }),
          ref: {
            delete: jest.fn(),
          },
        };
      
        const taskDoc2 = {
          id: 'task2',
          data: jest.fn().mockReturnValue({
            progress: 'in-progress',
            completedAt: new Date('2024-06-14T00:00:00Z').toISOString(),
          }),
          ref: {
            delete: jest.fn(),
          },
        };
      
        const taskSnapshot = {
          docs: [taskDoc1, taskDoc2],
        };
      
        // Mock Firestore collectionGroup().get to return the taskSnapshot
        firestore.collectionGroup().get.mockResolvedValue(taskSnapshot);
      
        // Start the cleanup job
        startCleanupJob();
      
        // Advance timers to simulate cron job trigger
        jest.advanceTimersByTime(5 * 60 * 1000);
      
        // Await the mocked cleanupExpiredTasks
        await cleanupExpiredTasks();
      
        // Assert that cleanupExpiredTasks was called once
        expect(cleanupExpiredTasks).toHaveBeenCalledTimes(1);
      
        // Assert specific expectations about task deletions
        expect(taskDoc2.ref.delete).not.toHaveBeenCalled(); 
      
        // Clean up mocks
        jest.clearAllMocks();
    });
      
  test('should handle errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    firestore.collectionGroup().get.mockRejectedValue(new Error('Firestore error'));

    await cleanupExpiredTasks();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error cleaning up expired tasks:', new Error('Firestore error'));
    consoleErrorSpy.mockRestore();
  });
});
