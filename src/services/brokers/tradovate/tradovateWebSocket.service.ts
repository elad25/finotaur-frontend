// src/services/brokers/tradovate/tradovateWebSocket.service.ts

import {
  TradovateWebSocketMessage,
  TradovateEventType,
  TradovateFill,
  TradovateOrder,
  TradovatePosition,
  TradovateCashBalance,
  TradovateMarginSnapshot
} from '@/types/brokers/tradovate/tradovate.types';

type EventCallback = (data: any) => void;

class TradovateWebSocketService {
  private ws: WebSocket | null = null;
  private readonly WS_URL: string;
  private accessToken: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  private eventListeners: Map<TradovateEventType, Set<EventCallback>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private isManualClose: boolean = false;

  constructor() {
    this.WS_URL = import.meta.env.VITE_TRADOVATE_WS_URL || 'wss://demo.tradovateapi.com/v1/websocket';
  }

  public connect(accessToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;
      this.isManualClose = false;
      this.accessToken = accessToken;

      try {
        this.ws = new WebSocket(this.WS_URL);

        this.ws.onopen = () => {
          console.log('Tradovate WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('Tradovate WebSocket error:', error);
          this.isConnecting = false;
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(error);
          }
        };

        this.ws.onclose = () => {
          console.log('Tradovate WebSocket closed');
          this.isConnecting = false;
          this.stopHeartbeat();
          
          if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnect();
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private reconnect(): void {
    if (this.isManualClose || !this.accessToken) {
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      if (this.accessToken) {
        this.connect(this.accessToken).catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('[]'); // Send empty array as heartbeat
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleMessage(data: string): void {
    try {
      const message: TradovateWebSocketMessage = JSON.parse(data);
      
      if (message.e && message.d) {
        const eventType = message.e as TradovateEventType;
        const callbacks = this.eventListeners.get(eventType);
        
        if (callbacks) {
          callbacks.forEach(callback => callback(message.d));
        }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private send(data: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      console.warn('WebSocket is not open. Cannot send data.');
    }
  }

  public subscribe(eventType: TradovateEventType, callback: EventCallback): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    
    this.eventListeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.eventListeners.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.eventListeners.delete(eventType);
        }
      }
    };
  }

  public subscribeToFills(callback: (fill: TradovateFill) => void): () => void {
    return this.subscribe('fill', callback);
  }

  public subscribeToOrders(callback: (order: TradovateOrder) => void): () => void {
    return this.subscribe('order', callback);
  }

  public subscribeToPositions(callback: (position: TradovatePosition) => void): () => void {
    return this.subscribe('position', callback);
  }

  public subscribeToCashBalance(callback: (balance: TradovateCashBalance) => void): () => void {
    return this.subscribe('cashBalance', callback);
  }

  public subscribeToMarginSnapshot(callback: (margin: TradovateMarginSnapshot) => void): () => void {
    return this.subscribe('marginSnapshot', callback);
  }

  public disconnect(): void {
    this.isManualClose = true;
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.eventListeners.clear();
    this.accessToken = null;
    this.reconnectAttempts = 0;
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public getConnectionState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
}

export const tradovateWebSocketService = new TradovateWebSocketService();