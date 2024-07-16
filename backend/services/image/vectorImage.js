const { exec } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');


async function downloadImage(url, inputPath) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            baseURL: 'http://localhost:8000'
        });

        const writer = fs.createWriteStream(inputPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log('File downloaded successfully:', inputPath);
        return inputPath;

    } catch (error) {
        console.error('Error downloading file:', error);
        throw error;
    }
}

async function convertVectorImage(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            // Command to convert using ImageMagick
            const command = `magick "${inputPath}" "${outputPath}"`;

            // Execute the conversion command
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('Error converting image with ImageMagick:', stderr);
                    reject(new Error('Failed to convert image'));
                } else {
                    console.log('Image conversion successful:', stdout);
                    resolve(outputPath);
                }
            });

        } catch (error) {
            reject(error);
        }
    });
}

  
  async function convertVectorImageFromUrl(inputPath, imageUrl, outputPath) {
    // Download the image from the URL to the input path
    const downloadPath = await downloadImage(imageUrl, inputPath);
    

    // Convert the vector image
    await convertVectorImage(downloadPath, outputPath);
  
    // Clean up the downloaded file after conversion
    fs.unlinkSync(inputPath);
  
    return outputPath;
  }

module.exports = { convertVectorImage, convertVectorImageFromUrl };