const path = require('path');
const { addToQueue, setProgress } = require('../services/queue');

async function convert(req, res) {
    console.log("Video conversion request received")
    const files = req.files;

    try {
        for (let i = 0; i < files.length; i++) {
            const inputPath = files[i].path; 
            const { source, jobId, userId, videoName, videoFormat } = req.body;
            const videoSettings = JSON.parse(req.body.videoSettings);
            const outputPath = path.join(__dirname, '..', 'public', `${req.body.videoName}.${req.body.videoFormat}`);
            console.log(req.body.videoName)

            await setProgress(jobId, 'queued');
            await addToQueue({
                jobId,
                userId,
                source,
                inputPath,
                outputPath,
                videoName,
                videoFormat,
                videoSettings
            });
        res.status(200).send({ message: 'Video conversion job added to queue', jobId });
        }
    } catch (error) {
        // console.error('Error converting video:', error);
        console.error('Error adding video conversion job to queue:', error);
        res.status(500).send('Conversion failed');
    }
}

async function convertCloud(req, res) {
    console.log("Video conversion request received");
    const { source, jobId, userId, videoId, videoName, dropboxPath, videoExt, videoFormat } = req.body;
    const videoSettings = JSON.parse(req.body.videoSettings);


    try {
        await setProgress(jobId, 'queued');
        const message = {
            jobId,
            userId,
            source,
            videoId,
            videoName,
            dropboxPath,
            videoExt,
            videoFormat,
            videoSettings
        };
        await addToQueue(message);
        res.status(200).send({ message: 'Video conversion job added to queue', jobId });
    } catch (error) {
        console.error('Error adding video conversion job to queue:', error);
        res.status(500).send('Failed to add job to queue');
    }
}

module.exports = { convert, convertCloud };
