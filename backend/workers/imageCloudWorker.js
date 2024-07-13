const path = require('path');
const fs = require('fs').promises;

const { processQueue, setProgress, reQueueMessage } = require('../services/queue');
const { getGoogleDriveFileStream, saveStreamToFile } = require('../services/google/googleDriveService');
const { getDropboxFileStream } = require('../services/dropboxService');
const { convertImage, convertImageFromUrl } = require('../services/image/imageService');
const { convertRasterImage } = require('../services/image/rasterImage');
const { convertVectorImage, convertVectorImageFromUrl } = require('../services/image/vectorImage');
const { uploadToS3, generateSignedUrl } = require('../services/aws/awsStorage');
const { updateTaskProgress } = require('../services/google/firestore');

const rasterFormats = ['PNG', 'JPG', 'JPEG', 'BMP', 'TIFF'];
const vectorFormats = ['DXF', 'EMF', 'EPS', 'HPGL', 'PDF', 'PS', 'SVG', 'SVGZ', 'WMF', 'XAML'];

async function imageConversionHandler(message, io) {
    const { mimeType, jobId, source, userId, imageId, imageName, dropboxPath, imageExt, imageFormat, imageSettings } = message;
    const tempFilePath = path.join(__dirname, '..', 'uploads', `${imageName}.${imageExt}`);
    const outputPath = path.join(__dirname, '..', 'public', `${imageName}.${imageFormat}`);

    if (source !== 'google' && source !== 'dropbox' && mimeType !== 'image') {
        console.log("whoops! wrong worker");
        await reQueueMessage('image_conversion', message);
        return; // Ignore messages not intended for this worker
    }

    try {
        let imageStream;
        const initialData = {
            name: imageName,
            format: imageFormat,
            progress: 'processing',
            mimeType: mimeType,
            jobId,
        };
        if (userId) {
            await updateTaskProgress(initialData, userId);
        } else {
            io.emit('conversion_progress', { jobId, progress: 'processing', name: imageName, format: imageFormat });
        }

        if (source === 'google') {
            imageStream = await getGoogleDriveFileStream(imageId);
            await saveStreamToFile(imageStream, tempFilePath);

            if (userId) {
                await updateTaskProgress({ ...initialData, progress: 'converting' }, userId);
            } else {
                io.emit('conversion_progress', { jobId, progress: 'converting', name: imageName, format: imageFormat });
            }

            // await convertImage(tempFilePath, outputPath, imageExt, imageFormat)
            if (rasterFormats.includes(imageExt.toUpperCase()) && rasterFormats.includes(imageFormat.toUpperCase())) {
                await convertRasterImage(tempFilePath, outputPath);
            } else {
                await convertVectorImage(tempFilePath, outputPath);
            }

            const destination = `output/${jobId}.${imageFormat}`; // Structure the path in S3
            if (userId) {
                await updateTaskProgress({ ...initialData, progress: 'uploading' }, userId);
            } else {
                io.emit('conversion_progress', { jobId, progress: 'uploading', name: imageName, format: imageFormat });
            }
            await uploadToS3(outputPath, destination);

            // Get the public URL
            const publicUrl = await generateSignedUrl(destination);

            if (userId) {
                await updateTaskProgress({ ...initialData, progress: 'completed', url: publicUrl }, userId);
            } else {
                io.emit('conversion_progress', { jobId, progress: 'completed', url: publicUrl, name: imageName, format: imageFormat });
            }

            fs.unlink(tempFilePath);
            fs.unlink(outputPath);
        } else if (source === 'dropbox') {
            imageStream = await getDropboxFileStream(dropboxPath);

            if (userId) {
                await updateTaskProgress({ ...initialData, progress: 'converting' }, userId);
            } else {
                io.emit('conversion_progress', { jobId, progress: 'converting', name: imageName, format: imageFormat });
            }

            // await convertImageFromUrl(imageStream, outputPath, imageExt, imageFormat);
            if (rasterFormats.includes(imageExt.toUpperCase()) && rasterFormats.includes(imageFormat.toUpperCase())) {
                await convertRasterImage(imageStream, outputPath);
            } else {
                await convertVectorImageFromUrl(tempFilePath, dropboxPath, outputPath);
            }

            const destination = `output/${jobId}.${imageFormat}`; // Structure the path in S3
            if (userId) {
                await updateTaskProgress({ ...initialData, progress: 'uploading' }, userId);
            } else {
                io.emit('conversion_progress', { jobId, progress: 'uploading', name: imageName, format: imageFormat });
            }
            await uploadToS3(outputPath, destination);

            // Get the public URL
            const publicUrl = await generateSignedUrl(destination);

            if (userId) {
                await updateTaskProgress({ ...initialData, progress: 'completed', url: publicUrl }, userId);
            } else {
                io.emit('conversion_progress', { jobId, progress: 'completed', url: publicUrl, name: imageName, format: imageFormat });
            }

            fs.unlink(outputPath);
        }

    } catch (error) {
        console.error('Error converting image from source:', error);
        if (userId) {
            await updateTaskProgress({ jobId, progress: 'failed', name: imageName, format: imageFormat }, userId);
        } else {
            io.emit('conversion_progress', { jobId, progress: 'failed', name: imageName, format: imageFormat });
        }
    }
}

// Start processing the queue
module.exports = function(io) {
    processQueue('image_conversion', (message) => imageConversionHandler(message, io));
};

module.exports.imageConversionHandler = imageConversionHandler;
