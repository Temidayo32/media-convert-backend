const ffmpeg = require('fluent-ffmpeg');
const ffprobe = ffmpeg.ffprobe;
const path = require('path');

// Specify the path to your FFmpeg binary
ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');

function convertVideo(inputStreamOrPath, outputPath) {
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
      ffmpeg(inputStreamOrPath)
        .on('start', function(commandLine) {
          console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
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
