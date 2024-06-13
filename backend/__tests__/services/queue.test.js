const {
    addToQueue,
    reQueueMessage,
    processQueue,
  } = require('../../services/queue');
  
  const amqp = require('amqplib');
  

  console.error = jest.fn();
  console.log = jest.fn();
  // Mock amqplib and redis to avoid actual connections during testing
  jest.mock('amqplib', () => {
    const mockAssertQueue = jest.fn();
    const mockSendToQueue = jest.fn();
    const mockConsume = jest.fn();
    const mockAck = jest.fn();
    const mockNack = jest.fn();
  
    const mockChannel = {
      assertQueue: mockAssertQueue,
      sendToQueue: mockSendToQueue,
      consume: mockConsume,
      ack: mockAck,
      nack: mockNack,
    };
  
    const mockCreateChannel = jest.fn().mockResolvedValue(mockChannel);
  
    const mockConnect = jest.fn().mockResolvedValue({
      createChannel: mockCreateChannel,
    });
  
    return {
      connect: mockConnect,
      mockAssertQueue,
      mockSendToQueue,
      mockConsume,
      mockAck,
      mockNack,
    };
  });
  
  console.error = jest.fn();
  console.log = jest.fn();
  
  describe('Queue Functions', () => {
    afterEach(() => {
      jest.clearAllMocks();
      jest.useRealTimers(); // Reset timer mocks after each test
    });
  
    test('addToQueue should send message to the queue', async () => {
      const message = { jobId: '123', data: 'test' };
      await addToQueue(message);
  
      expect(amqp.mockSendToQueue).toHaveBeenCalledWith(
        'conversion',
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );
    });
  
    // test('reQueueMessage should re-queue message', async () => {
    //     jest.useFakeTimers();
    
    //     // Define the message
    //     const message = { jobId: '123', data: 'test' };
    
    //     await reQueueMessage(message);
    
    //     // Assert that the message was sent to the queue
    //     expect(amqp.mockSendToQueue).toHaveBeenCalledWith(
    //         'conversion',
    //         Buffer.from(JSON.stringify(message)),
    //         { persistent: true }
    //     );
    // });      
  
    test('processQueue should call handler and ack message', async () => {
        const mockHandler = jest.fn().mockResolvedValue();
        
        // Simulate the message to be consumed
        const message = { jobId: '123', data: 'test' };
        const mockMsg = { content: Buffer.from(JSON.stringify(message)) };
      
        // Mock the consume function to execute the handler with the mock message
        amqp.mockConsume.mockImplementation((queueName, handler) => {
          handler(mockMsg);
        });
      
        // Call the processQueue function
        await processQueue(mockHandler);
      
        // Verify that the handler was called with the expected message
        expect(mockHandler).toHaveBeenCalledWith(message);
      
        // Verify that ack was called
        expect(amqp.mockAck).toHaveBeenCalledWith(mockMsg);
      });
      
  });
  