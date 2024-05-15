const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

// Specify the path to your FFmpeg binary
ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');

function convertVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
    //   .outputOptions('-vf', 'scale=320:-1')
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
    .run()
  });
}

module.exports = { convertVideo };
