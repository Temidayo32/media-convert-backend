const ffmpeg = require('fluent-ffmpeg');
const { convertVideo } = require('../../services/videoService');

console.error = jest.fn();
console.log = jest.fn();

jest.mock('fluent-ffmpeg', () => {
  const mockFfmpeg = jest.fn(() => mockFfmpeg);
  mockFfmpeg.input = jest.fn(() => mockFfmpeg);
  mockFfmpeg.output = jest.fn(() => mockFfmpeg);
  mockFfmpeg.videoCodec = jest.fn(() => mockFfmpeg);
  mockFfmpeg.fps = jest.fn(() => mockFfmpeg);
  mockFfmpeg.size = jest.fn(() => mockFfmpeg);
  mockFfmpeg.videoFilters = jest.fn(() => mockFfmpeg);
  mockFfmpeg.audioCodec = jest.fn(() => mockFfmpeg);
  mockFfmpeg.audioFilter = jest.fn(() => mockFfmpeg);
  mockFfmpeg.noAudio = jest.fn(() => mockFfmpeg);
  mockFfmpeg.aspectRatio = jest.fn(() => mockFfmpeg); // Mock aspectRatio
  mockFfmpeg.on = jest.fn((event, callback) => {
    if (event === 'start') {
      callback('Mock command line');
    }
    if (event === 'end') {
      setImmediate(callback);
    }
    if (event === 'error') {
      setImmediate(() => callback(new Error('Mock error')));
    }
    return mockFfmpeg;
  });
  mockFfmpeg.run = jest.fn();
  mockFfmpeg.ffprobe = jest.fn((input, callback) => {
    callback(null, { format: 'mock format' });
  });
  mockFfmpeg.setFfmpegPath = jest.fn();

  return mockFfmpeg;
});

describe('convertVideo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should convert video with specified settings', async () => {
    const inputPath = 'input.mp4';
    const outputPath = 'output.mp4';
    const videoSettings = {
      selectedCodec: 'libx264',
      selectedFrameRate: '30',
      selectedScale: { width: 1280, height: 720 },
      selectedResolution: '720p',
      selectedCropFilter: 'crop=16:9',
      selectedRotateFilter: 'rotate=90',
      deshakeChecked: 'on',
      selectedDenoise: 'hqdn3d',
      selectedAspectRatio: '16:9',
      selectedAudioCodec: 'aac',
      volume: '2.0',
      noAudio: 'on'
    };

    await expect(convertVideo(inputPath, outputPath, videoSettings)).resolves.toBeUndefined();

    expect(ffmpeg).toHaveBeenCalledWith(inputPath);
    expect(ffmpeg().videoCodec).toHaveBeenCalledWith('libx264');
    expect(ffmpeg().fps).toHaveBeenCalledWith(30);
    expect(ffmpeg().size).toHaveBeenCalledWith('1280x720');
    expect(ffmpeg().videoFilters).toHaveBeenCalledWith('crop=crop=16:9');
    expect(ffmpeg().videoFilters).toHaveBeenCalledWith('rotate=rotate=90');
    expect(ffmpeg().videoFilters).toHaveBeenCalledWith('deshake');
    expect(ffmpeg().videoFilters).toHaveBeenCalledWith('hqdn3d');
    expect(ffmpeg().aspectRatio).toHaveBeenCalledWith('16:9');
    expect(ffmpeg().audioCodec).toHaveBeenCalledWith('aac');
    expect(ffmpeg().audioFilter).toHaveBeenCalledWith('volume=2.0');
    expect(ffmpeg().noAudio).toHaveBeenCalled();
    expect(ffmpeg().output).toHaveBeenCalledWith(outputPath);
    expect(ffmpeg().on).toHaveBeenCalledWith('end', expect.any(Function));
    expect(ffmpeg().on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(ffmpeg().run).toHaveBeenCalled();
  });

  it('should reject if ffprobe fails', async () => {
    ffmpeg.ffprobe.mockImplementationOnce((input, callback) => {
      callback(new Error('ffprobe error'), null);
    });

    const inputPath = 'input.mp4';
    const outputPath = 'output.mp4';
    const videoSettings = {};

    await expect(convertVideo(inputPath, outputPath, videoSettings)).rejects.toThrow('ffprobe error');

    expect(ffmpeg.ffprobe).toHaveBeenCalledWith(inputPath, expect.any(Function));
  });

  it('should reject if ffmpeg conversion fails due to missing input', async () => {
    // Define input and output paths
    const inputPath = ''; // Empty input path to simulate missing input
    const outputPath = 'output.mp4';
  
    // Define video settings
    const videoSettings = {};
  
    // Expect the promise to reject with the specified error message
    await expect(convertVideo(inputPath, outputPath, videoSettings)).rejects
  
    // Expect ffmpeg event listener to be called with 'error' event
    expect(ffmpeg().on).toHaveBeenCalledWith('error', expect.any(Function));
  });
  
});
