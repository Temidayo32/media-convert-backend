const fs = require('fs');
const path = require('path');



console.error = jest.fn();
console.log = jest.fn();

jest.mock('path');
jest.mock('fs', () => ({
    unlinkSync: jest.fn(),
  promises: {
    unlink: jest.fn(),
    readFile: jest.fn().mockResolvedValue(''),
    writeFile: jest.fn().mockResolvedValue(''),
  },
}));

jest.mock('../../services/queue', () => ({
  processQueue: jest.fn(),
  reQueueMessage: jest.fn(),
  setProgress: jest.fn(),
}));

jest.mock('../../services/videoService');
jest.mock('../../services/aws/awsStorage');
jest.mock('../../services/google/firestore');

const { reQueueMessage } = require('../../services/queue');
const { convertVideo } = require('../../services/videoService');
const { uploadToS3, generateSignedUrl } = require('../../services/aws/awsStorage');
const { updateTaskProgress } = require('../../services/google/firestore');
const {handleVideoConversion} = require('../../workers/localworker');

describe('localworker', () => {
  let message;
  let io;

  beforeEach(() => {
    jest.clearAllMocks();
    message = {
      source: 'local',
      jobId: 'job123',
      userId: '',
      inputPath: 'inputPath.mp4',
      outputPath: 'outputPath.avi',
      videoName: 'sample',
      videoFormat: 'avi',
      videoSettings: { codec: 'libx264' },
    };
    io = { emit: jest.fn() };
  });

  test('should requeue message if source is not local', async () => {
    message.source = 'invalidSource';

    await handleVideoConversion(message, io);

    expect(reQueueMessage).toHaveBeenCalledWith(message);
    expect(io.emit).not.toHaveBeenCalled();
  });

  test('should handle video conversion successfully', async () => {
    message.userId = 'user123';
    const publicUrl = 'http://example.com';
    convertVideo.mockResolvedValue();
    uploadToS3.mockResolvedValue();
    generateSignedUrl.mockResolvedValue(publicUrl);

    await handleVideoConversion(message, io);

    expect(convertVideo).toHaveBeenCalledWith(message.inputPath, message.outputPath, message.videoSettings);
    expect(uploadToS3).toHaveBeenCalledWith(message.outputPath, `output/${message.jobId}.${message.videoFormat}`);
    expect(generateSignedUrl).toHaveBeenCalledWith(`output/${message.jobId}.${message.videoFormat}`);
    expect(updateTaskProgress).toHaveBeenCalledWith(
      expect.objectContaining({ progress: 'completed', url: publicUrl }),
      message.userId
    );
    expect(fs.unlinkSync).toHaveBeenCalledWith(message.inputPath);
    expect(fs.unlinkSync).toHaveBeenCalledWith(message.outputPath);
  });

  test('should handle errors during video conversion', async () => {
    const error = new Error('Conversion failed');
    convertVideo.mockRejectedValue(error);

    await handleVideoConversion(message, io);

    expect(io.emit).toHaveBeenCalledWith('conversion_progress', {
      jobId: message.jobId,
      progress: 'failed',
      name: message.videoName,
      format: message.videoFormat,
    });
  });

  test('should emit progress when userId is not present', async () => {
    message.userId = null;
    const publicUrl = 'http://example.com';
    convertVideo.mockResolvedValue();
    uploadToS3.mockResolvedValue();
    generateSignedUrl.mockResolvedValue(publicUrl);

    await handleVideoConversion(message, io);

    expect(io.emit).toHaveBeenCalledWith('conversion_progress', {
      jobId: message.jobId,
      progress: 'processing',
      name: message.videoName,
      format: message.videoFormat,
    });
    expect(io.emit).toHaveBeenCalledWith('conversion_progress', {
      jobId: message.jobId,
      progress: 'converting',
      name: message.videoName,
      format: message.videoFormat,
    });
    expect(io.emit).toHaveBeenCalledWith('conversion_progress', {
      jobId: message.jobId,
      progress: 'uploading',
      name: message.videoName,
      format: message.videoFormat,
    });
    expect(io.emit).toHaveBeenCalledWith('conversion_progress', {
      jobId: message.jobId,
      progress: 'completed',
      url: publicUrl,
      name: message.videoName,
      format: message.videoFormat,
    });
  });
});