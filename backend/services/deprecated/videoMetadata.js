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

module.exports = videoMetaData;
