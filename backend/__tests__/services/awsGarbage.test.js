const {
    S3Client,
    ListObjectsV2Command,
    DeleteObjectsCommand,
  } = require('@aws-sdk/client-s3');
  const { cleanupAWS, deleteExpiredFiles } = require('../../services/aws/awsGarbage');
  const cron = require('node-cron');
  const dotenv = require('dotenv');
  
  dotenv.config();
  
  jest.mock('@aws-sdk/client-s3');
  jest.mock('node-cron');
  
  describe('AWS S3 Cleanup Tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    test('should delete expired files from S3', async () => {
      const mockListObjects = {
        Contents: [
          {
            Key: 'oldFile1.txt',
            LastModified: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
          },
          {
            Key: 'recentFile1.txt',
            LastModified: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
          },
        ],
      };
      
      const mockDeletedObjects = {
        Deleted: [
          { Key: 'oldFile1.txt' },
        ],
      };
  
      S3Client.prototype.send = jest.fn()
        .mockResolvedValueOnce(mockListObjects) // ListObjectsV2Command response
        .mockResolvedValueOnce(mockDeletedObjects); // DeleteObjectsCommand response
  
      await deleteExpiredFiles();
  
      expect(S3Client.prototype.send).toHaveBeenCalledTimes(2);
      expect(S3Client.prototype.send).toHaveBeenCalledWith(expect.any(ListObjectsV2Command));
      expect(S3Client.prototype.send).toHaveBeenCalledWith(expect.any(DeleteObjectsCommand));
    });
  
    test('should handle no files to delete', async () => {
      const mockListObjects = {
        Contents: [],
      };
  
      S3Client.prototype.send = jest.fn().mockResolvedValue(mockListObjects);

      await deleteExpiredFiles();
  
      expect(S3Client.prototype.send).toHaveBeenCalledTimes(1);
      expect(S3Client.prototype.send).toHaveBeenCalledWith(expect.any(ListObjectsV2Command));
    });
  
    test('should handle no expired files', async () => {
      const mockListObjects = {
        Contents: [
          {
            Key: 'recentFile1.txt',
            LastModified: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
          },
        ],
      };
  
      S3Client.prototype.send = jest.fn().mockResolvedValue(mockListObjects);
  
      await deleteExpiredFiles();
  
      expect(S3Client.prototype.send).toHaveBeenCalledTimes(1);
      expect(S3Client.prototype.send).toHaveBeenCalledWith(expect.any(ListObjectsV2Command));
    });
  
    test('should handle errors during file deletion', async () => {
      const mockListObjects = {
        Contents: [
          {
            Key: 'oldFile1.txt',
            LastModified: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
          },
        ],
      };
  
      const error = new Error('S3 error');
  
      S3Client.prototype.send = jest.fn()
        .mockResolvedValueOnce(mockListObjects) 
        .mockRejectedValueOnce(error);
  
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  
      await deleteExpiredFiles();
  
      expect(S3Client.prototype.send).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting files:', error);
  
      consoleErrorSpy.mockRestore();
    });
  
    test('should schedule cron job', () => {
      const cronScheduleSpy = jest.spyOn(cron, 'schedule');
  
      cleanupAWS();
  
      expect(cronScheduleSpy).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
  
      cronScheduleSpy.mockRestore();
    });
  });
  