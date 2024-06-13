const { getStorage, ref, uploadBytesResumable, updateMetadata } = require('firebase-admin/storage');

// Initialize Firebase Admin SDK
const storage = getStorage();

const videoMetaData = async (jobId, name, format, url, progress) => {
  try {
    const taskRef = ref(storage, `tasks/${jobId}`);
    const metadata = {
      customMetadata: {
        name: name,
        fileUrl: url,
        format: format,
        progress: progress,
        completedAt: progress === 'completed' ? new Date().toISOString() : null,
      },
    };

    if (progress === 'completed') {
      await updateMetadata(taskRef, metadata);
    } else {
      // Upload a placeholder file (empty blob) with metadata
      await uploadBytesResumable(taskRef, new Blob(), { customMetadata: metadata.customMetadata });
    }

    // Update state or perform any additional logic
  } catch (err) {
    console.error('Error updating task:', err);
  }
};

// Function to schedule file deletion
const scheduleFileDeletion = async (filename) => {
  const params = {
    Bucket: bucketName,
    ChecksumAlgorithm: "CRC32" || "CRC32C" || "SHA1" || "SHA256",
    LifecycleConfiguration: {
      Rules: [
        {
          ID: `Delete ${filename} in 8 hours`,
          Prefix: filename,
          Status: 'Enabled',
          Expiration: {
            Days: 1 / 3, // Approx 8 hours (1/3 of a day)
          },
        },
      ],
    },
  };

  try {
    await s3Client.send(new PutBucketLifecycleConfigurationCommand(params));
    console.log(`Scheduled deletion for ${filename} in 8 hours.`);
  } catch (error) {
    console.error(`Error scheduling file deletion: ${error.message}`);
    throw error;
  }
};


module.exports = videoMetaData;
