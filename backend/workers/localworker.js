const fs = require('fs');
const path = require('path');
const { processQueue, setProgress, reQueueMessage } = require('../services/queue');
const { convertVideo } = require('../services/videoService');
const { uploadToGCS, scheduleFileDeletion, generateSignedUrl } = require('../services/googleStore')

async function handleVideoConversion(message, io) {
    const { source, jobId, inputPath, outputPath, videoFormat, videoSettings } = message;

    if (source !== 'local') {
        console.log("whoops! wrong worker")
        await reQueueMessage(message);
        return; // Ignore messages not intended for this worker
    }

    try {
        io.emit('conversion_progress', { jobId, progress: 'processing' });
        await setProgress(jobId, 'processing');

        // Perform the video conversion
        io.emit('conversion_progress', { jobId, progress: 'converting' });
        await convertVideo(inputPath, outputPath, videoSettings);

        // Upload to GCS
        const destination = `output/${jobId}.${videoFormat}`; // Structure the path in GCS
        io.emit('conversion_progress', { jobId, progress: 'uploading' });
        await uploadToGCS(outputPath, destination);

        // Get the public URL
        const publicUrl = await generateSignedUrl(destination);

        await setProgress(jobId, 'completed');
        io.emit('conversion_progress', { jobId, progress: 'completed', url: publicUrl  });

        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
    } catch (error) {
        console.error(`Error processing video conversion for job ${jobId}:`, error);
        await setProgress(jobId, 'failed');
        io.emit('conversion_progress', { jobId, progress: 'failed' });
    }
}

// Start consuming messages from the queue
module.exports = function(io) {
    processQueue((message) => handleVideoConversion(message, io));
};