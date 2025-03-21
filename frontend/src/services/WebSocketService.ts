import { WebSocketMessage } from '../types';

// WebSocket configuration for development and production
// In development, connect directly to the backend WebSocket server
const isDevelopment = import.meta.env.DEV;
const WS_BASE_URL = isDevelopment
  ? 'ws://localhost:8000/ws'
  : window.location.protocol === 'https:'
    ? `wss://${window.location.host}/ws`
    : `ws://${window.location.host}/ws`;

class WebSocketService {
  private socket: WebSocket | null = null;
  private clientId: string;
  private messageListeners: ((message: WebSocketMessage) => void)[] = [];
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;

  constructor() {
    // Get or generate a client ID
    this.clientId = this.getOrCreateClientId();
  }

  private getOrCreateClientId(): string {
    // Try to get client ID from localStorage for persistence
    const storedClientId = localStorage.getItem('websocket_client_id');
    if (storedClientId) {
      console.log(`WebSocketService: Using stored client ID: ${storedClientId}`);
      return storedClientId;
    }
    
    // Generate a new client ID
    const newClientId = 'client_' + Math.random().toString(36).substring(2, 9);
    console.log(`WebSocketService: Generated new client ID: ${newClientId}`);
    
    // Save to localStorage for persistence
    localStorage.setItem('websocket_client_id', newClientId);
    return newClientId;
  }

  private generateClientId(): string {
    return 'client_' + Math.random().toString(36).substring(2, 9);
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.isConnected) {
        console.log(`WebSocketService: Already connected with client ID: ${this.clientId}`);
        resolve();
        return;
      }

      // Log the WebSocket URL for debugging
      const wsUrl = `${WS_BASE_URL}/${this.clientId}`;
      console.log(`WebSocketService: Connecting to WebSocket at: ${wsUrl} with client ID: ${this.clientId}`);
      
      try {
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log(`WebSocketService: Connection established with client ID: ${this.clientId}`);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            console.log(`WebSocketService: Message received:`, message);
            this.notifyListeners(message);
          } catch (error) {
            console.error('WebSocketService: Error parsing WebSocket message:', error);
          }
        };

        this.socket.onerror = (error) => {
          console.error(`WebSocketService: WebSocket error for client ID ${this.clientId}:`, error);
          if (!this.isConnected) {
            reject(error);
          }
        };

        this.socket.onclose = (event) => {
          console.log(`WebSocketService: Connection closed for client ID ${this.clientId}: code=${event.code} reason=${event.reason}`);
          this.isConnected = false;
          this.attemptReconnect();
        };
      } catch (error) {
        console.error(`WebSocketService: Error creating WebSocket connection:`, error);
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.connect().catch(() => {
        // Reconnect failure is handled in connect()
      });
    }, delay);
  }

  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }

  public getClientId(): string {
    return this.clientId;
  }

  public addMessageListener(listener: (message: WebSocketMessage) => void): void {
    this.messageListeners.push(listener);
  }

  public removeMessageListener(listener: (message: WebSocketMessage) => void): void {
    this.messageListeners = this.messageListeners.filter(l => l !== listener);
  }

  private notifyListeners(message: WebSocketMessage): void {
    console.log(`WebSocketService: Notifying ${this.messageListeners.length} listeners about message:`, message);
    this.messageListeners.forEach((listener, index) => {
      try {
        console.log(`WebSocketService: Calling listener ${index}`);
        listener(message);
        console.log(`WebSocketService: Successfully called listener ${index}`);
      } catch (error) {
        console.error(`WebSocketService: Error in listener ${index}:`, error);
      }
    });
  }

  public sendMessage(message: any): void {
    if (this.socket && this.isConnected) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('Cannot send message: WebSocket not connected');
    }
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService();
export default webSocketService; 