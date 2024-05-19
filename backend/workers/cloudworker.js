const { processQueue, setProgress, reQueueMessage } = require('../services/queue');
const { getGoogleDriveFileStream, saveStreamToFile } = require('../services/googleDriveService');
const { getDropboxFileStream } = require('../services/dropboxService');
const { convertVideo } = require('../services/videoService');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

async function videoConversionHandler(message, io) {
    const { jobId, source, videoId, videoName, dropboxPath, videoExt, videoFormat } = message;
    const tempFilePath = path.join(__dirname, '..', 'uploads', `${videoName}.${videoExt}`);
    const outputPath = path.join(__dirname, '..', 'public', `${videoName}.${videoFormat}`);

    if (source !== 'google' && source !== 'dropbox') {
        console.log("whoops! wrong worker")
        await reQueueMessage(message);
        return; // Ignore messages not intended for this worker
    }

    try {
        let videoStream;
        await setProgress(jobId, 'processing'); // Initial progress
        io.emit('conversion_progress', { jobId, progress: 'processing' });

        if (source === 'google') {
            videoStream = await getGoogleDriveFileStream(videoId);
            await saveStreamToFile(videoStream, tempFilePath);

            ffmpeg.ffprobe(tempFilePath, async function (err, metadata) {
                if (err) {
                    console.error('Error probing video:', err);
                    await setProgress(jobId, 'Error probing video');
                    return;
                }
                console.log('Input format:', metadata.format);
            });

            await convertVideo(tempFilePath, outputPath);
            await setProgress(jobId, 'completed');
            fs.unlinkSync(tempFilePath);
        } else if (source === 'dropbox') {
            videoStream = await getDropboxFileStream(dropboxPath);
            await convertVideo(videoStream, outputPath)
            await setProgress(jobId, 'completed');
        }

        await setProgress(jobId, 'completed'); // Final progress
        io.emit('conversion_progress', { jobId, progress: 'completed' });
    } catch (error) {
        console.error('Error converting video from source:', error);
        await setProgress(jobId, 'Conversion failed');
        io.emit('conversion_progress', { jobId, progress: 'failed' });
    }
}

// Start processing the queue
module.exports = function(io) {
    processQueue((message) => videoConversionHandler(message, io));
};
