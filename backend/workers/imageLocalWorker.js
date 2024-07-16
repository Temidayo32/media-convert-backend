const fs = require('fs');
const path = require('path');
const { processQueue, setProgress, reQueueMessage } = require('../services/queue');
const {convertImage } = require('../services/image/imageService');
const { convertRasterImage } = require('../services/image/rasterImage');
const { convertVectorImage } = require('../services/image/vectorImage');
const { uploadToS3, generateSignedUrl } = require('../services/aws/awsStorage');
const { updateTaskProgress } = require('../services/google/firestore');

const rasterFormats = ['PNG', 'JPG', 'JPEG', 'BMP', 'TIFF'];
// const vectorFormats = ['DXF', 'EMF', 'EPS', 'HPGL', 'PDF', 'PS', 'SVG', 'SVGZ', 'WMF', 'XAML'];

async function handleImageConversion(message, io) {
    const { mimeType, source, jobId, userId, inputPath, outputPath, imageName, imageFormat, imageExt, imageSettings } = message;

    if (source !== 'local' && mimeType !== 'image') {
        console.log("whoops! wrong worker");
        await reQueueMessage('image_conversion', message);
        return; // Ignore messages not intended for this worker
    }

    let updatedMessage = { ...message, progress: 'processing' };

    try {
         const initialData = {
            name: imageName,
            format: imageFormat,
            progress: 'processing',
            mimeType: mimeType,
            jobId
        };
        if (userId) {
            await updateTaskProgress(initialData, userId);
        } else {
            io.emit('conversion_progress', { jobId, progress: 'processing', name: imageName, format: imageFormat });
        }

        // Perform the image conversion
        updatedMessage.progress = 'converting';
        if (userId) {
            await updateTaskProgress({ ...initialData, progress: 'converting' }, userId);
        } else {
            io.emit('conversion_progress', { jobId, progress: 'converting', name: imageName, format: imageFormat });
        }

        // Determine if it's a raster or vector image conversion
        // await convertImage(inputPath, outputPath, imageExt, imageFormat);
         // Determine if it's a raster or vector image conversion
         if (rasterFormats.includes(imageExt.toUpperCase()) && rasterFormats.includes(imageFormat.toUpperCase())) {
            await convertRasterImage(inputPath, outputPath);
        } else {
            await convertVectorImage(inputPath, outputPath);
        }

         // Check if the file exists before uploading
         if (!fs.existsSync(outputPath)) {
            throw new Error(`File not found: ${outputPath}`);
        }


        updatedMessage.progress = 'uploading';
        // Upload to S3
        const destination = `output/${jobId}.${imageFormat}`; // Structure the path in S3
        if (userId) {
            await updateTaskProgress({ ...initialData, progress: 'uploading' }, userId);
        } else {
            io.emit('conversion_progress', { jobId, progress: 'uploading', name: imageName, format: imageFormat });
        }
        await uploadToS3(outputPath, destination);

        // Get the public URL
        const publicUrl = await generateSignedUrl(destination);
        updatedMessage.progress = 'completed';

        if (userId) {
            await updateTaskProgress({ ...initialData, progress: 'completed', url: publicUrl }, userId);
        } else {
            io.emit('conversion_progress', { jobId, progress: 'completed', url: publicUrl, name: imageName, format: imageFormat });
        }

        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);

        return updatedMessage;
    } catch (error) {
        console.error(`Error processing image conversion for job ${jobId}:`, error);
        if (userId) {
            updatedMessage.progress = 'failed';
            await updateTaskProgress({ jobId, progress: 'failed', name: imageName, format: imageFormat }, userId);
        } else {
            io.emit('conversion_progress', { jobId, progress: 'failed', name: imageName, format: imageFormat });
        }
        return updatedMessage;
    }
}

// Start consuming messages from the queue
module.exports = function(io) {
    processQueue('image_conversion', (message) => handleImageConversion(message, io));
};

module.exports.handleImageConversion = handleImageConversion;
