const { S3Client, PutObjectCommand, GetObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Configure AWS SDK
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.BUCKET_NAME; 
const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 100MB
const PART_SIZE = 5 * 1024 * 1024; // 5MB part size

const uploadToS3 = async (filePath, destination) => {
    const fileStream = fs.createReadStream(filePath);
    const fileSize = fs.statSync(filePath).size;

    if (fileSize > LARGE_FILE_THRESHOLD) {
        // Use multipart upload for larger files
        await uploadLargeFile(filePath, destination);
    } else {
        // Use regular single-part upload for smaller files
        await uploadSmallFile(filePath, fileStream, destination);
    }
};

const uploadLargeFile = async (filePath, destination) => {
    // Initiate multipart upload
    const createMultipartUploadParams = {
        Bucket: bucketName,
        Key: destination,
    };

    const { UploadId } = await s3Client.send(new CreateMultipartUploadCommand(createMultipartUploadParams));

    let partNumber = 1;
    const uploadPromises = []
    let buffer = Buffer.alloc(0);

    // Create a read stream
    const fileStream = fs.createReadStream(filePath, { highWaterMark: PART_SIZE });

    for await (const chunk of fileStream) {
        buffer = Buffer.concat([buffer, chunk]);

        while (buffer.length >= PART_SIZE) {
            const part = buffer.slice(0, PART_SIZE);
            buffer = buffer.slice(PART_SIZE);

            const uploadPartParams = {
                Bucket: bucketName,
                Key: destination,
                PartNumber: partNumber,
                UploadId: UploadId,
                Body: part,
            };

            console.log(`Uploading part ${partNumber} of size ${part.length} bytes`);

            const data = await s3Client.send(new UploadPartCommand(uploadPartParams));
            // console.log('UploadPartCommand response:', data);
            uploadPromises.push({
                PartNumber: partNumber,
                ETag: data.ETag,
            })

            partNumber++;
        }
    }

    // Upload any remaining data as the final part
    if (buffer.length > 0) {
        const uploadPartParams = {
            Bucket: bucketName,
            Key: destination,
            PartNumber: partNumber,
            UploadId: UploadId,
            Body: buffer,
        };

        console.log(`Uploading final part ${partNumber} of size ${buffer.length} bytes`);

        const data = await s3Client.send(new UploadPartCommand(uploadPartParams));
        // console.log('UploadPartCommand response:', data);
        uploadPromises.push({
            PartNumber: partNumber,
            ETag: data.ETag,
        })

        // console.log(uploadPromises)

        partNumber++;
    }

    // Complete multipart upload
    const completeMultipartUploadParams = {
        Bucket: bucketName,
        Key: destination,
        UploadId: UploadId,
        MultipartUpload: {
            Parts: uploadPromises.map(promise => ({
                PartNumber: promise.PartNumber, 
                ETag: promise.ETag
            })),
        },
    };

    await s3Client.send(new CompleteMultipartUploadCommand(completeMultipartUploadParams));

    console.log(`${filePath} uploaded to ${bucketName}/${destination}`);
};


const uploadSmallFile = async (filePath, fileStream, destination) => {
    // Upload small file in a single part
    const uploadParams = {
        Bucket: bucketName,
        Key: destination,
        Body: fileStream,
    };

    try {
        await s3Client.send(new PutObjectCommand(uploadParams));
        console.log(`${filePath} uploaded to ${bucketName}/${destination}`);
    } catch (error) {
        console.error(`Error uploading file: ${error}`);
        throw error;
    }
};

// Function to generate a signed URL
const generateSignedUrl = async (filename) => {
  const getObjectParams = {
    Bucket: bucketName,
    Key: filename,
  };

  try {
    const url = await getSignedUrl(s3Client, new GetObjectCommand(getObjectParams), {
      expiresIn: 8 * 60 * 60, // URL expires in 8 hours
    });
    return url;
  } catch (error) {
    console.error(`Error generating signed URL: ${error}`);
    throw error;
  }
};

// Function to schedule file deletion
// const scheduleFileDeletion = async (filename) => {
//     const params = {
//       Bucket: bucketName,
//       ChecksumAlgorithm: "CRC32" || "CRC32C" || "SHA1" || "SHA256",
//       LifecycleConfiguration: {
//         Rules: [
//           {
//             ID: `Delete ${filename} in 8 hours`,
//             Prefix: filename,
//             Status: 'Enabled',
//             Expiration: {
//               Days: 1 / 3, // Approx 8 hours (1/3 of a day)
//             },
//           },
//         ],
//       },
//     };
  
//     try {
//       await s3Client.send(new PutBucketLifecycleConfigurationCommand(params));
//       console.log(`Scheduled deletion for ${filename} in 8 hours.`);
//     } catch (error) {
//       console.error(`Error scheduling file deletion: ${error.message}`);
//       throw error;
//     }
//   };

module.exports = { uploadToS3, generateSignedUrl };
