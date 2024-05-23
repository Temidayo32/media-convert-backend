const ffmpeg = require('fluent-ffmpeg');
const ffprobe = ffmpeg.ffprobe;
const path = require('path');

// Specify the path to your FFmpeg binary
ffmpeg.setFfmpegPath('/usr/local/bin/ffmpeg');

function convertVideo(inputStreamOrPath, outputPath, videoSettings) {
  return new Promise((resolve, reject) => {
    // Run ffprobe to gather information about the input format
    ffprobe(inputStreamOrPath, (err, metadata) => {
      if (err) {
        console.error('Error getting input format information:', err);
        reject(err);
        return;
      }

      // Log input format information
      console.log('Input format:', metadata.format);

      // Begin FFmpeg conversion process
      const command = ffmpeg(inputStreamOrPath)
        .on('start', function(commandLine) {
          console.log('Spawned Ffmpeg with command: ' + commandLine);
        });

      // Apply video settings
      if (videoSettings.selectedCodec) {
        command.videoCodec(videoSettings.selectedCodec);
      }

      if (videoSettings.selectedFrameRate) {
        const frameRate = parseFloat(videoSettings.selectedFrameRate);
        command.fps(frameRate);
      }

      if (videoSettings.selectedScale) {
        const { width, height } = videoSettings.selectedScale;
        const parsedWidth = parseFloat(width);
        const parsedHeight = parseFloat(height);
        
        if (!isNaN(parsedWidth) && !isNaN(parsedHeight) && parsedWidth !== 0 && parsedHeight !== 0) {
          command.size(`${parsedWidth}x${parsedHeight}`);
        }
      } else if (videoSettings.selectedResolution) {
        command.size(videoSettings.selectedResolution);
      }
      
      if (videoSettings.selectedCropFilter) {
        command.videoFilters(`crop=${videoSettings.selectedCropFilter}`);
      }
      if (videoSettings.selectedRotateFilter) {
        command.videoFilters(`rotate=${videoSettings.selectedRotateFilter}`);
      }
      if (videoSettings.deshakeChecked === 'on') {
        command.videoFilters('deshake');
      }
      if (videoSettings.selectedDenoise) {
        command.videoFilters(videoSettings.selectedDenoise);
      }
      if (videoSettings.selectedAspectRatio) {
        command.aspectRatio(videoSettings.selectedAspectRatio);
      }
      if (videoSettings.selectedAudioCodec) {
        command.audioCodec(videoSettings.selectedAudioCodec);
      }
      if (videoSettings.volume) {
        command.audioFilter(`volume=${videoSettings.volume}`);
      }

      if (videoSettings.noAudio === 'on') {
        command.noAudio();
      }

      command
        .output(outputPath)
        .on('end', () => {
          console.log('Conversion finished');
          resolve();
        })
        .on('error', (err) => {
          console.error('Error during conversion:', err);
          reject(err);
        })
        .run();
    });
  });
}
module.exports = { convertVideo };
