const fs = require('fs');
const path = require('path');
const { processQueue, setProgress, reQueueMessage } = require('../services/queue');
const { convertVideo } = require('../services/videoService');
const { uploadToS3, generateSignedUrl } = require('../services/aws/awsStorage');
const{ updateTaskProgress } = require('../services/google/firestore');

async function handleVideoConversion(message, io) {
    const { source, jobId, userId, inputPath, outputPath, videoName, videoFormat, videoSettings } = message;

    if (source !== 'local') {
        console.log("whoops! wrong worker")
        await reQueueMessage(message);
        return; // Ignore messages not intended for this worker
    }

    try {
        const initialData = {
            jobId,
            name: videoName,
            format: videoFormat,
            progress: 'processing',
        };
        if (userId) {
            await updateTaskProgress(initialData, userId);
        } else {
            io.emit('conversion_progress', { jobId, progress: 'processing', name: videoName, format: videoFormat });
        }
        // await setProgress(jobId, 'processing');

        // Perform the video conversion
        if (userId) {
            await updateTaskProgress({ ...initialData, progress: 'converting' }, userId);
        } else {
            io.emit('conversion_progress', { jobId, progress: 'converting', name: videoName, format: videoFormat });
        }
        await convertVideo(inputPath, outputPath, videoSettings);

        // Upload to GCS
        const destination = `output/${jobId}.${videoFormat}`; // Structure the path in GCS
        if (userId) {
            await updateTaskProgress({ ...initialData, progress: 'uploading' }, userId);
        } else {
            io.emit('conversion_progress', { jobId, progress: 'uploading', name: videoName, format: videoFormat });
        }
        await uploadToS3(outputPath, destination);

        // Get the public URL
        const publicUrl = await generateSignedUrl(destination);

        if (userId) {
            await updateTaskProgress({ ...initialData, progress: 'completed', url: publicUrl }, userId);
        } else{
             io.emit('conversion_progress', { jobId, progress: 'completed', url: publicUrl, name: videoName, format: videoFormat  });
        }

        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
    } catch (error) {
        console.error(`Error processing video conversion for job ${jobId}:`, error);
        if(userId) {
            await updateTaskProgress({ jobId, progress: 'failed', name: videoName, format: videoFormat }, userId);
        } else {
            io.emit('conversion_progress', { jobId, progress: 'failed', name: videoName, format: videoFormat });
        }
    }
}

// Start consuming messages from the queue
module.exports = function(io) {
    processQueue((message) => handleVideoConversion(message, io));
};

module.exports.handleVideoConversion = handleVideoConversion;