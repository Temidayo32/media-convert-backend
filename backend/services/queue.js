const amqp = require('amqplib');
const redis = require('ioredis');
const redisClient = new redis();

let connection = null;
let channels = {};

async function getConnection() {
    if (!connection) {
        connection = await amqp.connect('amqp://localhost');
        connection.on('error', async (err) => {
            console.error('RabbitMQ connection error:', err);
            connection = null; // Reset the connection
        });
    }
    return connection;
}

async function getChannel(queueName) {
    if (!channels[queueName]) {
        const conn = await getConnection();
        const channel = await conn.createChannel();
        await channel.assertQueue(queueName, { durable: true });
        channels[queueName] = channel;
        channel.on('error', (err) => {
            console.error(`RabbitMQ channel error for queue ${queueName}:`, err);
            delete channels[queueName]; // Reset the channel
        });
    }
    return channels[queueName];
}

async function addToQueue(queueName, message) {
    const channel = await getChannel(queueName);
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), { persistent: true });
}

async function reQueueMessage(queueName, message, retries = 3, delay = 500) {
    console.log(`Re-queuing message: ${JSON.stringify(message.jobId)} with retries: ${retries}`);
    if (retries > 0) {
        setTimeout(async () => {
            await addToQueue(queueName, message);
        }, delay);
    } else {
        console.error(`Failed to process message after maximum retries: ${JSON.stringify(message.jobId)}`);
    }
}

async function processQueue(queueName, handler) {
    const channel = await getChannel(queueName);
    channel.prefetch(1);
    channel.consume(queueName, async (msg) => {
        if (msg !== null) {
            const message = JSON.parse(msg.content.toString());
            try {
                await handler(message);
                channel.ack(msg);
                console.log(`Message processed and acknowledged: ${JSON.stringify(message.jobId)}`);
            } catch (error) {
                console.error(`Error processing message: ${error}`);
                channel.nack(msg, false, false);  // Do not requeue immediately, log and handle separately
                await reQueueMessage(queueName, message);    // Re-queue manually
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
