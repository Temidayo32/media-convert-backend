const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const { processQueue, setProgress, reQueueMessage } = require('../services/queue');
const { getGoogleDriveFileStream, saveStreamToFile } = require('../services/googleDriveService');
const { getDropboxFileStream } = require('../services/dropboxService');
const { convertVideo } = require('../services/videoService');
const { uploadToGCS, scheduleFileDeletion, generateSignedUrl } = require('../services/googleStore')


async function videoConversionHandler(message, io) {
    const { jobId, source, videoId, videoName, dropboxPath, videoExt, videoFormat, videoSettings } = message;
    const tempFilePath = path.join(__dirname, '..', 'uploads', `${videoName}.${videoExt}`);
    const outputPath = path.join(__dirname, '..', 'public', `${videoName}.${videoFormat}`);

    if (source !== 'google' && source !== 'dropbox') {
        console.log("whoops! wrong worker")
        await reQueueMessage(message);
        return; // Ignore messages not intended for this worker
    }

    try {
        let videoStream;
        io.emit('conversion_progress', { jobId, progress: 'processing', name: videoName, format: videoFormat });
        await setProgress(jobId, 'processing'); // Initial progress

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

            io.emit('conversion_progress', { jobId, progress: 'converting', name: videoName, format: videoFormat });
            await convertVideo(tempFilePath, outputPath, videoSettings);

            const destination = `output/${jobId}.${videoFormat}`; // Structure the path in GCS
            io.emit('conversion_progress', { jobId, progress: 'uploading', name: videoName, format: videoFormat });
            await uploadToGCS(outputPath, destination);

            // Get the public URL
            const publicUrl = await generateSignedUrl(destination);
            

            await setProgress(jobId, 'completed'); // Final progress
            io.emit('conversion_progress', { jobId, progress: 'completed', url: publicUrl, name: videoName, format: videoFormat  });

            fs.unlinkSync(tempFilePath);
            fs.unlinkSync(outputPath);
        } else if (source === 'dropbox') {
            videoStream = await getDropboxFileStream(dropboxPath);

            io.emit('conversion_progress', { jobId, progress: 'converting' });
            await convertVideo(videoStream, outputPath, videoSettings)

            
            const destination = `output/${jobId}.${videoFormat}`; // Structure the path in GCS
            io.emit('conversion_progress', { jobId, progress: 'uploading' });
            await uploadToGCS(outputPath, destination);

            // Get the public URL
            const publicUrl = await generateSignedUrl(destination);
           
            await setProgress(jobId, 'completed'); // Final progress
            io.emit('conversion_progress', { jobId, progress: 'completed', url: publicUrl, name: videoName, format: videoFormat  });
            
            fs.unlinkSync(outputPath);
        }

    } catch (error) {
        console.error('Error converting video from source:', error);
        await setProgress(jobId, 'Conversion failed');
        io.emit('conversion_progress', { jobId, progress: 'failed', name: videoName, format: videoFormat });
    }
}

// Start processing the queue
module.exports = function(io) {
    processQueue((message) => videoConversionHandler(message, io));
};
