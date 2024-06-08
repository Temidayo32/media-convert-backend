const { Firestore } = require('@google-cloud/firestore');
const keyFilename = process.env.GOOGLE_FIRESTORE; 

const firestore = new Firestore({keyFilename});

async function updateTaskProgress(data, userId) {
    const taskId = data.jobId;
    const taskRef = firestore.collection('tasks').doc(taskId);

    const metadata = {
        name: data.name,
        format: data.format,
        progress: data.progress,
        completedAt: data.progress === 'completed' ? new Date().toISOString() : null,
        userId: userId,
    };

    if (data.url) {
        metadata.fileUrl = data.url;
    }

    try {
        await taskRef.set(metadata, { merge: true });
        console.log(`Updating task for user: ${userId} with jobId: ${taskId}`);
    } catch (error) {
        console.error(`Error updating task for job ${taskId}:`, error);
        throw error;
    }
}

module.exports = { updateTaskProgress };