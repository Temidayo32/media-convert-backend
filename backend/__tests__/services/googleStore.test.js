const { Storage } = require('@google-cloud/storage');
const { uploadToGCS, generateSignedUrl } = require('../../services/google/googleStore');



console.error = jest.fn();
console.log = jest.fn();
// Mock @google-cloud/storage
jest.mock('@google-cloud/storage', () => {
  const mFile = {
    getSignedUrl: jest.fn(),
    setMetadata: jest.fn(),
  };
  const mBucket = {
    upload: jest.fn(),
    file: jest.fn(() => mFile),
  };
  const mStorage = jest.fn(() => ({
    bucket: jest.fn(() => mBucket),
  }));
  return { Storage: mStorage };
});

describe('Google Cloud Storage Service', () => {
  const bucketName = 'media_convert_free';
  const filePath = 'path/to/local/file.txt';
  const destination = 'path/in/gcs/file.txt';
  const filename = 'path/in/gcs/file.txt';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadToGCS', () => {
    test('should upload file to Google Cloud Storage', async () => {
      const storage = new Storage();
      const bucket = storage.bucket(bucketName);
      const uploadMock = bucket.upload;

      await uploadToGCS(filePath, destination);

      expect(uploadMock).toHaveBeenCalledTimes(1);
      expect(uploadMock).toHaveBeenCalledWith(filePath, { destination });
    });
  });

  describe('generateSignedUrl', () => {
    test('should generate a signed URL for a file', async () => {
      const mockUrl = 'https://example.com/signed-url';
      const storage = new Storage();
      const file = storage.bucket(bucketName).file(filename);
      file.getSignedUrl.mockResolvedValue([mockUrl]);

      const url = await generateSignedUrl(filename);

      expect(file.getSignedUrl).toHaveBeenCalledTimes(1);
      expect(file.getSignedUrl).toHaveBeenCalledWith({
        version: 'v4',
        action: 'read',
        expires: expect.any(Number),
      });
      expect(url).toBe(mockUrl);
    });
  });
});
