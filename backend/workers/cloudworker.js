const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const { processQueue, setProgress, reQueueMessage } = require('../services/queue');
const { getGoogleDriveFileStream, saveStreamToFile } = require('../services/google/googleDriveService');
const { getDropboxFileStream } = require('../services/dropboxService');
const { convertVideo } = require('../services/videoService');
const { uploadToS3, generateSignedUrl } = require('../services/aws/awsStorage');
const{ updateTaskProgress } = require('../services/google/firestore');

async function videoConversionHandler(message, io) {
    const { mimeType, jobId, source, userId, videoId, videoName, dropboxPath, videoExt, videoFormat, videoSettings } = message;
    const tempFilePath = path.join(__dirname, '..', 'uploads', `${videoName}.${videoExt}`);
    const outputPath = path.join(__dirname, '..', 'public', `${videoName}.${videoFormat}`);

    if (source !== 'google' && source !== 'dropbox' && mimeType !=='video') {
        console.log("whoops! wrong worker")
        await reQueueMessage('conversion', message);
        return; // Ignore messages not intended for this worker
    }

    let updatedMessage = { ...message, progress: 'processing' };

    try {
        let videoStream;
        const initialData = {
            name: videoName,
            format: videoFormat,
            progress: 'processing',
            mimeType: mimeType,
            jobId,
        };
        if(userId) {
            await updateTaskProgress(initialData, userId);
        } else{
            io.emit('conversion_progress', { jobId, progress: 'processing', name: videoName, format: videoFormat });
        }
        // await setProgress(jobId, 'processing'); // Initial progress

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

            updatedMessage.progress = 'converting';
            if(userId) {
                await updateTaskProgress({ ...initialData, progress: 'converting' }, userId);
            } else{
                io.emit('conversion_progress', { jobId, progress: 'converting', name: videoName, format: videoFormat });
            }
            await convertVideo(tempFilePath, outputPath, videoSettings);

            const destination = `output/${jobId}.${videoFormat}`; // Structure the path in GCS
            updatedMessage.progress = 'uploading';
            if (userId) {
                await updateTaskProgress({ ...initialData, progress: 'uploading' }, userId);
            } else {
                io.emit('conversion_progress', { jobId, progress: 'uploading', name: videoName, format: videoFormat });
            }
            await uploadToS3(outputPath, destination);

            // Get the public URL
            const publicUrl = await generateSignedUrl(destination);

            updatedMessage.progress = 'completed';
           if(userId) {
            await updateTaskProgress({ ...initialData, progress: 'completed', url: publicUrl }, userId);
           } else{
            io.emit('conversion_progress', { jobId, progress: 'completed', url: publicUrl, name: videoName, format: videoFormat  });
           }
            

            fs.unlinkSync(tempFilePath);
            fs.unlinkSync(outputPath);

            return updatedMessage;
        } else if (source === 'dropbox') {
            videoStream = await getDropboxFileStream(dropboxPath);

            updatedMessage.progress = 'converting';
            if(userId) {
                await updateTaskProgress({ ...initialData, progress: 'converting' }, userId);
            } else{
                io.emit('conversion_progress', { jobId, progress: 'converting', name: videoName, format: videoFormat });
            }
            await convertVideo(videoStream, outputPath, videoSettings)

            updatedMessage.progress = 'uploading';
            const destination = `output/${jobId}.${videoFormat}`; // Structure the path in GCS
            if (userId) {
                await updateTaskProgress({ ...initialData, progress: 'uploading' }, userId);
            } else {
                io.emit('conversion_progress', { jobId, progress: 'uploading', name: videoName, format: videoFormat });
            }
            await uploadToS3(outputPath, destination);

            // Get the public URL
            const publicUrl = await generateSignedUrl(destination);
            updatedMessage.progress = 'completed';
            if(userId) {
                await updateTaskProgress({ ...initialData, progress: 'completed', url: publicUrl }, userId);
            } else {
                io.emit('conversion_progress', { jobId, progress: 'completed', url: publicUrl, name: videoName, format: videoFormat  });
            }
            
            fs.unlinkSync(outputPath);
            return updatedMessage;
        }

    } catch (error) {
        console.error('Error converting video from source:', error);
        updatedMessage.progress = 'failed';
        if(userId) {
            await updateTaskProgress({ jobId, progress: 'failed', name: videoName, format: videoFormat }, userId);
        } else {
            io.emit('conversion_progress', { jobId, progress: 'failed', name: videoName, format: videoFormat });
        }
        return updatedMessage;
    }
}

// Start processing the queue
module.exports = async function(io) {
   await processQueue('conversion', (message) => videoConversionHandler(message, io));
};

module.exports.videoConversionHandler = videoConversionHandler;