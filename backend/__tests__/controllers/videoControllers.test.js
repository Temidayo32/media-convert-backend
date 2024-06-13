const path = require('path');
const { addToQueue, setProgress } = require('../../services/queue');
const { convert, convertCloud } = require('../../controllers/videoController'); 

jest.mock('../../services/queue'); // Mock the queue service

console.error = jest.fn();
console.log = jest.fn()

describe('Video Conversion Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
  });

  describe('convert function', () => {
    test('should add video conversion job to queue for multiple files', async () => {
      const req = {
        files: [
          { path: '/path/to/file1' },
          { path: '/path/to/file2' },
        ],
        body: {
          source: 'source',
          jobId: 'jobId',
          userId: 'userId',
          videoName: 'videoName',
          videoFormat: 'mp4',
          videoSettings: '{"key": "value"}',
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Mock addToQueue methods
      addToQueue.mockResolvedValue();

      await convert(req, res);

      // Assertions
      expect(addToQueue).toHaveBeenCalledTimes(2); // Called twice for two files
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ message: 'Video conversion job added to queue', jobId: 'jobId' });
    });

    // Add more tests for edge cases, error handling, etc.
  });

  describe('convertCloud function', () => {
    test('should add video conversion job to queue for cloud conversion', async () => {
      const req = {
        body: {
          source: 'source',
          jobId: 'jobId',
          userId: 'userId',
          videoId: 'videoId',
          videoName: 'videoName',
          dropboxPath: '/path/to/dropbox',
          videoExt: 'avi',
          videoFormat: 'mp4',
          videoSettings: '{"key": "value"}',
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Mock addToQueue methods
      addToQueue.mockResolvedValue();

      await convertCloud(req, res);

      // Assertions
      expect(addToQueue).toHaveBeenCalledTimes(1); // Called once for cloud conversion
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ message: 'Video conversion job added to queue', jobId: 'jobId' });
    });
  });
});

