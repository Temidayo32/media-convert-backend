const path = require('path');
const fs = require('fs');
const { convertVideo } = require('../services/videoService');

async function convert(req, res) {
    console.log('Video conversion request received');
    const inputPath = req.file.path;
    const outputPath = path.join(__dirname, '..', 'public', `${req.body.videoName}.${req.body.videoFormat}`);

    try {
        await convertVideo(inputPath, outputPath);
        // res.download(outputPath, `${req.body.videoName}.${req.body.videoFormat}`, () => {
        //     // Delete the output file after download
        //     fs.unlink(outputPath, (err) => {
        //         if (err) {
        //             console.error('Error deleting file:', err);
        //         } else {
        //             console.log('Output file deleted');
        //         }
        //     });
        // })
        // .save(outputPath);
    } catch (error) {
        console.error('Error converting video:', error);
        res.status(500).send('Conversion failed');
    }
}

module.exports = { convert };
