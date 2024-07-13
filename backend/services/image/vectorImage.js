const { exec } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function downloadImage(url, downloadPath) {
    const response = await axios({
        url,
        responseType: 'stream',
    });

    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(downloadPath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function convertVectorImage(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const command = `dbus-run-session inkscape "${inputPath}" --export-filename="${outputPath}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Error converting image with Inkscape:', stderr);
                reject(new Error('Failed to convert image'));
            } else {
                console.log('Image conversion successful:', stdout);
                resolve(outputPath);
            }
        });
    });
}

async function convertVectorImageFromUrl(inputPath, imageUrl, outputPath) {
    const downloadPath = path.join(__dirname, '..', 'uploads', `${inputPath}`);
    await downloadImage(imageUrl, downloadPath);
    
    // const outputFileName = `${Date.now()}.${outputFormat}`;
    // const outputPath = path.join(__dirname, '..', 'uploads', outputFileName);
    
    await convertImage(downloadPath, outputPath);

    // Clean up the downloaded file after conversion
    fs.unlinkSync(downloadPath);

    return outputPath;
}

module.exports = { convertVectorImage, convertVectorImageFromUrl };
