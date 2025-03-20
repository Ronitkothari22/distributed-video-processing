import aio_pika
import json
import time
import asyncio
import logging
from typing import Dict, Any, Callable

from ..config import RABBITMQ_URL, RABBITMQ_RECONNECT_ATTEMPTS, RABBITMQ_RECONNECT_DELAY

logger = logging.getLogger(__name__)

class RabbitMQClient:
    def __init__(self, url: str = RABBITMQ_URL):
        self.url = url
        self.connection = None
        self.channel = None
        self.task_exchange = None
        self.status_exchange = None
        self.status_queue = None
        self._connecting = False
        self._connected = asyncio.Event()
        self._status_consumer_callback = None
        self._connection_closed_event = None

    async def connect(self):
        """
        Connect to RabbitMQ with retry logic
        """
        if self._connecting:
            # Wait for ongoing connection attempt
            await self._connected.wait()
            return
            
        self._connecting = True
        self._connected.clear()
        
        for attempt in range(1, RABBITMQ_RECONNECT_ATTEMPTS + 1):
            try:
                logger.info(f"Connecting to RabbitMQ (attempt {attempt}/{RABBITMQ_RECONNECT_ATTEMPTS})...")
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
                
                # Set up connection closed callback using the newer approach
                # Different versions of aio_pika have different ways to handle connection closed events
                try:
                    # For newer versions
                    self._connection_closed_event = self.connection.close_callbacks.add(self._on_connection_closed)
                except AttributeError:
                    try:
                        # For some versions
                        self.connection.add_connection_lost_callback(self._on_connection_closed)
                    except AttributeError:
                        try:
                            # For other versions
                            self.connection.add_close_callback(self._on_connection_closed)
                        except AttributeError:
                            # If all else fails, we'll have to manually check connection status
                            logger.warning("Could not set connection closed callback, will rely on manual connection checks")
                
                logger.info("Successfully connected to RabbitMQ")
                self._connecting = False
                self._connected.set()
                
                # Restore consumer if needed
                if self._status_consumer_callback:
                    await self.start_consuming_status(self._status_consumer_callback)
                
                return
            except Exception as e:
                logger.error(f"RabbitMQ connection failed: {str(e)}")
                if attempt < RABBITMQ_RECONNECT_ATTEMPTS:
                    wait_time = RABBITMQ_RECONNECT_DELAY * attempt
                    logger.info(f"Retrying in {wait_time} seconds...")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error("Max reconnection attempts reached. Giving up.")
                    self._connecting = False
                    raise

    def _on_connection_closed(self, sender=None, exc=None):
        """Handle connection closed event"""
        if isinstance(exc, Exception):
            logger.warning(f"RabbitMQ connection closed: {exc}")
        else:
            logger.warning("RabbitMQ connection closed")
        asyncio.create_task(self._reconnect())

    async def _reconnect(self):
        """Attempt to reconnect"""
        if not self._connecting:
            self._connected.clear()
            await self.connect()

    async def close(self):
        """Close RabbitMQ connection"""
        if self.connection and not self.connection.is_closed:
            # Clean up callback if it exists
            if self._connection_closed_event:
                try:
                    self._connection_closed_event.close()
                except:
                    pass
                self._connection_closed_event = None
                
            await self.connection.close()
            logger.info("RabbitMQ connection closed")

    async def publish_task(self, message: Dict[str, Any]):
        """Publish a task message to the task exchange"""
        if not self.connection or self.connection.is_closed:
            await self.connect()
        
        logger.info(f"Publishing task: {message}")
        await self.task_exchange.publish(
            aio_pika.Message(
                body=json.dumps(message).encode(),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT
            ),
            routing_key=""
        )
        
    async def start_consuming_status(self, callback: Callable):
        """Start consuming status messages"""
        if not self.connection or self.connection.is_closed:
            await self.connect()
        
        self._status_consumer_callback = callback
        await self.status_queue.consume(callback)
        logger.info("Started consuming status messages")

    async def create_queue(self, queue_name: str):
        """Create and bind a queue to the task exchange"""
        if not self.connection or self.connection.is_closed:
            await self.connect()
        
        queue = await self.channel.declare_queue(queue_name, durable=True)
        await queue.bind(self.task_exchange)
        logger.info(f"Created and bound queue: {queue_name}")
        return queue 