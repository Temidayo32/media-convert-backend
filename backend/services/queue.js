const amqp = require('amqplib');
const redis = require('ioredis');
const redisClient = new redis();

async function connectQueue() {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();
    await channel.assertQueue('conversion', { durable: true });
    return { connection, channel };
}

async function addToQueue(message) {
    const { channel } = await connectQueue();
    channel.sendToQueue('conversion', Buffer.from(JSON.stringify(message)), { persistent: true });
}

async function reQueueMessage(message, retries = 3, delay = 500) {
    console.log(`Re-queuing message: ${JSON.stringify(message)} with retries: ${retries}`);
    if (retries > 0) {
        setTimeout(async () => {
            await addToQueue(message);
        }, delay);
    } else {
        console.error(`Failed to process message after maximum retries: ${JSON.stringify(message)}`);
    }
}

async function processQueue(handler) {
    const { connection, channel } = await connectQueue();
    channel.consume('conversion', async (msg) => {
        if (msg !== null) {
            const message = JSON.parse(msg.content.toString());
            try {
                await handler(message);
                channel.ack(msg);
            } catch (error) {
                console.error(`Error processing message: ${error}`);
                channel.nack(msg, false, false);  // Do not requeue immediately, log and handle separately
                await reQueueMessage(message);    // Re-queue manually
            }
        }
    });
}

async function setProgress(jobId, progress) {
    console.log(`Setting progress for ${jobId}: ${progress}`);
    await redisClient.set(jobId, progress);
}

async function getProgress(jobId) {
    return await redisClient.get(jobId);
}

module.exports = {
    addToQueue,
    reQueueMessage,
    processQueue,
    setProgress,
    getProgress,
};
