const path = require('path');
const { addToQueue, setProgress } = require('../services/queue');

async function imageConvert(req, res) {
    console.log("Image conversion request received");
    const files = req.files;

    try {
        for (let i = 0; i < files.length; i++) {
            const inputPath = files[i].path;
            const { mimeType, source, jobId, userId, imageName, imageExt, imageFormat } = req.body; 
            const imageSettings = JSON.parse(req.body.imageSettings); // If there are specific settings for image processing
            console.log(req.body.jobId)

            // Construct the output path with the desired format extension
            const outputPath = path.join(__dirname, '..', 'public', `${imageName}.${imageFormat}`);

            await setProgress(jobId, 'queued');
            await addToQueue('image_conversion', {
                mimeType,
                source,
                jobId,
                userId,
                inputPath,
                outputPath,
                imageExt,
                imageName,
                imageFormat,
                imageSettings
            });
            res.status(200).send({ message: 'Image conversion job added to queue', jobId });
        }
    } catch (error) {
        console.error('Error adding image conversion job to queue:', error);
        res.status(500).send('Image Conversion failed');
    }
}

async function imageConvertCloud(req, res) {
    console.log("Image conversion request received");
    const { mimeType, source, jobId, userId, imageName, dropboxPath, imageExt, imageId, imageFormat } = req.body; 
    const imageSettings = JSON.parse(req.body.imageSettings); // If there are specific settings for image processing

    try {
        await setProgress(jobId, 'queued');
        const message = {
            mimeType,
            source,
            jobId,
            userId,
            imageId,
            imageName,
            dropboxPath,
            imageExt,
            imageFormat,
            imageSettings
        };
        await addToQueue('image_conversion', message);

        res.status(200).send({ message: 'Image conversion job added to queue', jobId });
    } catch (error) {
        console.error('Error adding image conversion job to queue:', error);
        res.status(500).send('Failed to add job to queue');
    }
}

module.exports = { imageConvert, imageConvertCloud };
