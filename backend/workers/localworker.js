const fs = require('fs');
const { processQueue, setProgress, reQueueMessage } = require('../services/queue');
const { convertVideo } = require('../services/videoService');

async function handleVideoConversion(message, io) {
    const { source, jobId, inputPath, outputPath } = message;

    if (source !== 'local') {
        console.log("whoops! wrong worker")
        await reQueueMessage(message);
        return; // Ignore messages not intended for this worker
    }

    try {
        await setProgress(jobId, 'processing');
        io.emit('conversion_progress', { jobId, progress: 'processing' });
        // Perform the video conversion
        await convertVideo(inputPath, outputPath);
        fs.unlinkSync(inputPath);
        await setProgress(jobId, 'completed');
        io.emit('conversion_progress', { jobId, progress: 'completed' });
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