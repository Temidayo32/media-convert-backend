const Jimp = require('jimp');

async function convertRasterImage(inputPathOrUrl, outputPath) {
    try {
        // Load the image from a file path or a URL
        const image = await Jimp.read(inputPathOrUrl);

        // Convert and save the image in the new format
        await image.writeAsync(outputPath);

        return outputPath;
    } catch (error) {
        console.error('Error converting image:', error);
        throw new Error('Failed to convert image');
    }
}

module.exports = { convertRasterImage };
