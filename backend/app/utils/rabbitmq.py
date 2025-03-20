import aio_pika
import json
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class RabbitMQClient:
    def __init__(self, url: str = "amqp://guest:guest@localhost/"):
        self.url = url
        self.connection = None
        self.channel = None
        self.task_exchange = None
        self.status_exchange = None

    async def connect(self):
        self.connection = await aio_pika.connect_robust(self.url)
        self.channel = await self.connection.channel()
        
        # Create separate exchanges for tasks and status updates
        self.task_exchange = await self.channel.declare_exchange(
            "video_tasks",
            aio_pika.ExchangeType.FANOUT
        )
        
        self.status_exchange = await self.channel.declare_exchange(
            "processing_status",
            aio_pika.ExchangeType.FANOUT
        )
        
        # Create status queue for the server to consume
        self.status_queue = await self.channel.declare_queue(
            "status_updates_queue", 
            durable=True
        )
        await self.status_queue.bind(self.status_exchange)

    async def close(self):
        if self.connection:
            await self.connection.close()

    async def publish_task(self, message: Dict[str, Any]):
        """Publish a task message to the task exchange"""
        if not self.connection or self.connection.is_closed:
            await self.connect()
        
        logger.info(f"Publishing task: {message}")
        await self.task_exchange.publish(
            aio_pika.Message(body=json.dumps(message).encode()),
            routing_key=""
        )
        
    async def start_consuming_status(self, callback):
        """Start consuming status messages"""
        if not self.connection or self.connection.is_closed:
            await self.connect()
            
        await self.status_queue.consume(callback)

    async def create_queue(self, queue_name: str):
        if not self.connection or self.connection.is_closed:
            await self.connect()
        
        queue = await self.channel.declare_queue(queue_name, durable=True)
        await queue.bind(self.task_exchange)
        return queue 