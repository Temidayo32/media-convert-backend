const fs = require('fs');
const { google } = require('googleapis');
const { saveStreamToFile, getGoogleDriveFileStream  } = require('../../services/google/googleDriveService');
const { PassThrough } = require('stream');


console.error = jest.fn();
console.log = jest.fn();


jest.mock('fs');

jest.mock('google-auth-library', () => {
  return {
    GoogleAuth: jest.fn().mockImplementation(() => ({
      getClient: jest.fn().mockResolvedValue({
        request: jest.fn().mockResolvedValue({}),
      }),
    })),
  };
});

// Mock googleapis
jest.mock('googleapis', () => {
  const mFiles = {
    get: jest.fn(),
  };
  const mDrive = {
    files: mFiles,
  };
  return {
    google: {
      drive: jest.fn(() => mDrive),
    },
  };
});

describe('Google Drive Service', () => {
    test('should fetch file stream from Google Drive', async () => {
      const mockFileStream = new PassThrough();
      const fileId = 'mocked-file-id';
      const { google } = require('googleapis');

      // Mock the implementation of files.get to return the mock file stream
      google.drive().files.get.mockResolvedValue({ data: mockFileStream });

      // Call the function under test
      const stream = await getGoogleDriveFileStream(fileId);

      // Assertions
      expect(google.drive).toHaveBeenCalledTimes(2);
      expect(google.drive().files.get).toHaveBeenCalledTimes(1);
      expect(google.drive().files.get).toHaveBeenCalledWith(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );
      expect(stream).toBe(mockFileStream);
    });

    test('should save stream to file', async () => {
        const mockStream = new PassThrough();
        const mockWriteStream = new PassThrough();
  
        fs.createWriteStream.mockReturnValue(mockWriteStream);
        jest.spyOn(mockStream, 'pipe');  // Spy on the pipe method
  
        const filePath = '/uploads/file.txt';
  
        // Simulate the end of the stream
        setImmediate(() => {
          mockStream.emit('end');
        });
  
        // Call the function to save stream to file
        await saveStreamToFile(mockStream, filePath);
  
        // Assert that fs.createWriteStream() was called with the correct file path
        expect(fs.createWriteStream).toHaveBeenCalledWith(filePath);
        expect(mockStream.pipe).toHaveBeenCalledWith(mockWriteStream);
      });
});


  
  
 