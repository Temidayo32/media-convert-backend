const { S3Client, PutObjectCommand, GetObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');
const { uploadToS3, generateSignedUrl } = require('../../services/aws/awsStorage');

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

console.error = jest.fn();
console.log = jest.fn();
  

describe('AWS S3 Upload Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should upload small file to S3', async () => {
    const filePath = path.resolve(__dirname, 'uploads', 'testFile.txt');
    const destination = 'testFile.txt';
    // const fileStream = fs.createReadStream(filePath);

    const mockPutObjectCommand = jest.fn().mockResolvedValue({});
    S3Client.prototype.send.mockResolvedValue(mockPutObjectCommand);

    await uploadToS3(filePath, destination);

    expect(S3Client.prototype.send).toHaveBeenCalledTimes(1);
    expect(S3Client.prototype.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
  });

  test('should upload large file to S3 using multipart upload', async () => {
    const filePath = path.resolve(__dirname, 'uploads', 'largeFile.mp4');
    const destination = 'largeFile.mp4';

    const mockCreateMultipartUploadCommand = jest.fn().mockResolvedValue({ UploadId: 'mock-upload-id' });
    const mockUploadPartCommand = jest.fn().mockResolvedValue({ ETag: 'mock-etag' });
    const mockCompleteMultipartUploadCommand = jest.fn().mockResolvedValue({});
    S3Client.prototype.send.mockImplementation((command) => {
      if (command instanceof CreateMultipartUploadCommand) {
        return mockCreateMultipartUploadCommand(command);
      } else if (command instanceof UploadPartCommand) {
        return mockUploadPartCommand(command);
      } else if (command instanceof CompleteMultipartUploadCommand) {
        return mockCompleteMultipartUploadCommand(command);
      }
    //   throw new Error(`Unexpected command: ${command.constructor.name}`);
    });

    await uploadToS3(filePath, destination);

    // expect(mockCreateMultipartUploadCommand).toHaveBeenCalledTimes(1);
    expect(mockUploadPartCommand).toHaveBeenCalledTimes(Math.ceil(fs.statSync(filePath).size / 5 * 1024 * 1024)); // Adjust part count as needed
    // expect(mockCompleteMultipartUploadCommand).toHaveBeenCalledTimes(1);
  });

  test('should generate signed URL for file in S3', async () => {
    const filename = 'testFile.txt';
    const mockGetSignedUrl = jest.fn().mockResolvedValue('https://mock-signed-url');
    getSignedUrl.mockImplementation(mockGetSignedUrl);

    const signedUrl = await generateSignedUrl(filename);

    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.any(S3Client), expect.any(GetObjectCommand), expect.objectContaining({
      expiresIn: 8 * 60 * 60,
    }));
    expect(signedUrl).toBe('https://mock-signed-url');
  });
});
