const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const cron = require('node-cron');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Configure AWS SDK v3 S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const bucketName = process.env.BUCKET_NAME;
const eightHoursInMilliseconds = 8 * 60 * 60 * 1000;

// Function to delete expired files
const deleteExpiredFiles = async () => {
    try {
        const listParams = {
            Bucket: bucketName,
        };

        // List objects in the bucket
        const listedObjects = await s3Client.send(new ListObjectsV2Command(listParams));

        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
            console.log('No files to delete');
            return;
        }

        // Get the current time
        const now = new Date().getTime();

        const deleteParams = {
            Bucket: bucketName,
            Delete: { Objects: [] },
        };

        // Check each file's last modified time
        listedObjects.Contents.forEach(({ Key, LastModified }) => {
            const lastModifiedTime = new Date(LastModified).getTime();

            // If the file is older than 8 hours, add it to the delete params
            if (now - lastModifiedTime > eightHoursInMilliseconds) {
                deleteParams.Delete.Objects.push({ Key });
            }
        });

        if (deleteParams.Delete.Objects.length === 0) {
            console.log('No expired files to delete');
            return;
        }

        // Delete the files
        const deleteResult = await s3Client.send(new DeleteObjectsCommand(deleteParams));
        console.log('Deleted files:', deleteResult.Deleted);

    } catch (error) {
        console.error('Error deleting files:', error);
    }
};

// Schedule the function to run every 5 minutes
const cleanupAWS = () => {
    cron.schedule('*/5 * * * *', () => {
        console.log('Running deleteExpiredFiles task...');
        deleteExpiredFiles();
    });
}


// Immediately invoke the function to handle any expired files on startup
module.exports = {
    cleanupAWS
}

