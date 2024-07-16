const fs = require('fs');
const path = require('path');
const { processQueue, reQueueMessage } = require('../services/queue');
const { convertVideo } = require('../services/videoService');
const { uploadToS3, generateSignedUrl } = require('../services/aws/awsStorage');
const{ updateTaskProgress } = require('../services/google/firestore');

async function handleVideoConversion(message, io) {
    const { mimeType, source, jobId, userId, inputPath, outputPath, videoName, videoFormat, videoSettings } = message;

    if (source !== 'local' && mimeType !== 'video') {
        console.log("whoops! wrong worker");
        await reQueueMessage('conversion', message);
        return; // Ignore messages not intended for this worker
    }

    let updatedMessage = { ...message, progress: 'processing' };

    try {
        const initialData = {
            name: videoName,
            format: videoFormat,
            progress: 'processing',
            mimeType: mimeType,
            jobId,
        };

        if (userId) {
            await updateTaskProgress(initialData, userId);
        } else {
            io.emit('conversion_progress', { jobId, progress: 'processing', name: videoName, format: videoFormat });
        }

        // Perform the video conversion
        updatedMessage.progress = 'converting';
        if (userId) {
            await updateTaskProgress({ ...initialData, progress: 'converting' }, userId);
        } else {
            io.emit('conversion_progress', { jobId, progress: 'converting', name: videoName, format: videoFormat });
        }
        await convertVideo(inputPath, outputPath, videoSettings);

        // Upload to GCS
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

        if (userId) {
            await updateTaskProgress({ ...initialData, progress: 'completed', url: publicUrl }, userId);
        } else{
             io.emit('conversion_progress', { jobId, progress: 'completed', url: publicUrl, name: videoName, format: videoFormat  });
        }

        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);

        return updatedMessage;
    } catch (error) {
        console.error(`Error processing video conversion for job ${jobId}:`, error);
        updatedMessage.progress = 'failed';
        if(userId) {
            await updateTaskProgress({ jobId, progress: 'failed', name: videoName, format: videoFormat }, userId);
        } else {
            io.emit('conversion_progress', { jobId, progress: 'failed', name: videoName, format: videoFormat });
        }
        return updatedMessage;
    }
}

// Start consuming messages from the queue
module.exports = function(io) {
    processQueue('conversion', (message) => handleVideoConversion(message, io));
};

module.exports.handleVideoConversion = handleVideoConversion;