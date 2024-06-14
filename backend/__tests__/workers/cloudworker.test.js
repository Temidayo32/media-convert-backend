const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');


console.error = jest.fn();
console.log = jest.fn();

jest.mock('path');
jest.mock('fs', () => ({
  promises: {
    unlink: jest.fn(),
    readFile: jest.fn().mockResolvedValue(''),
    writeFile: jest.fn().mockResolvedValue(''),
  },
}));

jest.mock('googleapis', () => {
  const mockGoogleApis = {
    google: {
      auth: {
        GoogleAuth: jest.fn().mockImplementation(() => ({
          getClient: jest.fn().mockResolvedValue({
            authorize: jest.fn(),
          }),
        })),
      },
      drive: jest.fn().mockImplementation(() => ({
        files: {
          get: jest.fn().mockImplementation(() => ({
            data: {
              on: jest.fn().mockImplementation((event, handler) => {
                if (event === 'end') handler();
              }),
              pipe: jest.fn(),
            },
          })),
          create: jest.fn(),
        },
      })),
    },
  };
  return mockGoogleApis;
});


jest.mock('fluent-ffmpeg');
jest.mock('../../services/queue');
jest.mock('../../services/google/googleDriveService');
jest.mock('../../services/dropboxService');
jest.mock('../../services/videoService');
jest.mock('../../services/aws/awsStorage');
jest.mock('../../services/google/firestore');

const { reQueueMessage } = require('../../services/queue');
const { getGoogleDriveFileStream, saveStreamToFile } = require('../../services/google/googleDriveService');
const { getDropboxFileStream } = require('../../services/dropboxService');
const { convertVideo } = require('../../services/videoService');
const { uploadToS3, generateSignedUrl } = require('../../services/aws/awsStorage');
const { updateTaskProgress } = require('../../services/google/firestore');

const { videoConversionHandler } = require('../../workers/cloudworker');

describe('videoConversionHandler', () => {
  let message;
  let io;

  beforeEach(() => {
    jest.clearAllMocks();
    message = {
      jobId: 'job123',
      source: 'google',
      userId: '',
      videoId: 'video123',
      videoName: 'sample',
      dropboxPath: '/path/to/dropbox/file',
      videoExt: 'mp4',
      videoFormat: 'avi',
      videoSettings: { codec: 'libx264' },
    };
    io = { emit: jest.fn()};
    const tempFilePath = 'tempFilePath';
    const outputPath = 'outputPath';
    path.join
      .mockReturnValueOnce(tempFilePath)
      .mockReturnValueOnce(outputPath);
  });

  test('should requeue message if source is not google or dropbox', async () => {
    message.source = 'invalidSource';

    await videoConversionHandler(message, io);

    expect(reQueueMessage).toHaveBeenCalledWith(message);
    expect(io.emit).not.toHaveBeenCalled();
  });

  test('should handle video conversion from google', async () => {
    const mockStream = {};
    const tempFilePath = 'tempFilePath';
    const outputPath = 'outputPath';
    const publicUrl = 'http://example.com';

    getGoogleDriveFileStream.mockResolvedValue(mockStream);
    saveStreamToFile.mockResolvedValue();
    ffmpeg.ffprobe.mockImplementation((_, callback) => callback(null, { format: {} }));
    convertVideo.mockResolvedValue();
    uploadToS3.mockResolvedValue();
    generateSignedUrl.mockResolvedValue(publicUrl);

    await videoConversionHandler(message, io);

    expect(getGoogleDriveFileStream).toHaveBeenCalledWith(message.videoId);
    expect(saveStreamToFile).toHaveBeenCalledWith(mockStream, tempFilePath);
    expect(ffmpeg.ffprobe).toHaveBeenCalledWith(tempFilePath, expect.any(Function));
    expect(convertVideo).toHaveBeenCalledWith(tempFilePath, outputPath, message.videoSettings);
    expect(uploadToS3).toHaveBeenCalledWith(outputPath, `output/${message.jobId}.${message.videoFormat}`);
    expect(generateSignedUrl).toHaveBeenCalledWith(`output/${message.jobId}.${message.videoFormat}`);
    expect(io.emit).toHaveBeenCalledWith('conversion_progress', expect.objectContaining({ progress: 'completed', url: publicUrl }));
  });

  test('should handle video conversion from dropbox', async () => {
    message.source = 'dropbox';
    const mockStream = {};
    const outputPath = 'outputPath';
    const publicUrl = 'http://example.com';

    getDropboxFileStream.mockResolvedValue(mockStream);
    convertVideo.mockResolvedValue();
    uploadToS3.mockResolvedValue();
    generateSignedUrl.mockResolvedValue(publicUrl);

    await videoConversionHandler(message, io);

    expect(getDropboxFileStream).toHaveBeenCalledWith(message.dropboxPath);
    expect(convertVideo).toHaveBeenCalledWith(mockStream, outputPath, message.videoSettings);
    expect(uploadToS3).toHaveBeenCalledWith(outputPath, `output/${message.jobId}.${message.videoFormat}`);
    expect(generateSignedUrl).toHaveBeenCalledWith(`output/${message.jobId}.${message.videoFormat}`);
    expect(io.emit).toHaveBeenCalledWith('conversion_progress', expect.objectContaining({ progress: 'completed', url: publicUrl }));
  });

  test('should call updateTaskProgress with userId', async () => {
    message.userId = 'user123'
    const mockStream = {};
    const tempFilePath = 'tempFilePath';
    const outputPath = 'outputPath';
    const publicUrl = 'http://example.com';

    getGoogleDriveFileStream.mockResolvedValue(mockStream);
    saveStreamToFile.mockResolvedValue();
    convertVideo.mockResolvedValue();
    uploadToS3.mockResolvedValue();
    generateSignedUrl.mockResolvedValue(publicUrl);

    await videoConversionHandler(message, io);

    expect(getGoogleDriveFileStream).toHaveBeenCalledWith(message.videoId);
    expect(saveStreamToFile).toHaveBeenCalledWith(mockStream, tempFilePath);
    expect(convertVideo).toHaveBeenCalledWith(tempFilePath, outputPath, message.videoSettings);
    expect(uploadToS3).toHaveBeenCalledWith(outputPath, `output/${message.jobId}.${message.videoFormat}`);
    expect(generateSignedUrl).toHaveBeenCalledWith(`output/${message.jobId}.${message.videoFormat}`);
    expect(updateTaskProgress).toHaveBeenCalledWith(
      expect.objectContaining({ progress: 'completed', url: publicUrl }),
      message.userId
    );
  });

  test('should handle errors during video conversion', async () => {
    const error = new Error('Conversion failed');
    getGoogleDriveFileStream.mockRejectedValue(error);

    await videoConversionHandler(message, io);

    expect(io.emit).toHaveBeenCalledWith('conversion_progress', expect.objectContaining({ progress: 'failed' }));
  });
});
