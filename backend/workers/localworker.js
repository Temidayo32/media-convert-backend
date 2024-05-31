const fs = require('fs');
const path = require('path');
const { processQueue, setProgress, reQueueMessage } = require('../services/queue');
const { convertVideo } = require('../services/videoService');
const { uploadToGCS, scheduleFileDeletion, generateSignedUrl } = require('../services/googleStore')
const{ videoMetaData } = require('../services/videoMetadata');

async function handleVideoConversion(message, io) {
    const { source, jobId, inputPath, outputPath, videoName, videoFormat, videoSettings } = message;

    if (source !== 'local') {
        console.log("whoops! wrong worker")
        await reQueueMessage(message);
        return; // Ignore messages not intended for this worker
    }

    try {
        io.emit('conversion_progress', { jobId, progress: 'processing', name: videoName, format: videoFormat });
        await setProgress(jobId, 'processing');

        // Perform the video conversion
        io.emit('conversion_progress', { jobId, progress: 'converting', name: videoName, format: videoFormat });
        await convertVideo(inputPath, outputPath, videoSettings);

        // Upload to GCS
        const destination = `output/${jobId}.${videoFormat}`; // Structure the path in GCS
        io.emit('conversion_progress', { jobId, progress: 'uploading', name: videoName, format: videoFormat });
        await uploadToGCS(outputPath, destination);

        // Get the public URL
        const publicUrl = await generateSignedUrl(destination);

        await setProgress(jobId, 'completed');
        io.emit('conversion_progress', { jobId, progress: 'completed', url: publicUrl, name: videoName, format: videoFormat  });

        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
    } catch (error) {
        console.error(`Error processing video conversion for job ${jobId}:`, error);
        await setProgress(jobId, 'failed');
        io.emit('conversion_progress', { jobId, progress: 'failed', name: videoName, format: videoFormat });
    }
}

// Start consuming messages from the queue
module.exports = function(io) {
    processQueue((message) => handleVideoConversion(message, io));
};