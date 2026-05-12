// src/services/brokers/tradovate/tradovateWebSocket.service.ts
// 🎯 V2.0 - FIXED: Dynamic WebSocket URL based on environment (demo/live)

import {
  TradovateEventType,
  TradovateFill,
  TradovateOrder,
  TradovatePosition,
  TradovateCashBalance,
  TradovateMarginSnapshot
} from '@/types/brokers/tradovate/tradovate.types';
import {
  buildAuthFrame,
  buildHeartbeatFrame,
  decodeFrame,
  TradovateMessage,
} from './tradovateProtocol';

type EventCallback = (data: any) => void;

// ============================================================================
// WEBSOCKET URLS
// ============================================================================
const WS_URLS = {
  demo: 'wss://demo.tradovateapi.com/v1/websocket',
  live: 'wss://live.tradovateapi.com/v1/websocket'
};

class TradovateWebSocketService {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private accessToken: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  private eventListeners: Map<TradovateEventType, Set<EventCallback>> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private isConnecting: boolean = false;
  private isManualClose: boolean = false;
  private environment: 'demo' | 'live' = 'demo';

  constructor() {
    // Default to demo
    this.wsUrl = import.meta.env.VITE_TRADOVATE_WS_URL || WS_URLS.demo;
    console.log('🔌 TradovateWebSocket initialized with URL:', this.wsUrl);
  }

  // ============================================================================
  // 🆕 ENVIRONMENT MANAGEMENT
  // ============================================================================

  /**
   * Set the WebSocket URL based on environment
   * Call this BEFORE connect() when switching environments
   */
  public setEnvironment(environment: 'demo' | 'live'): void {
    if (this.environment === environment && this.wsUrl === WS_URLS[environment]) {
      console.log(`🔌 WebSocket already set to ${environment}`);
      return;
    }

    console.log(`🔌 Switching WebSocket to ${environment.toUpperCase()}`);
    
    // Disconnect existing connection if any
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      console.log('🔌 Disconnecting existing WebSocket before switching environment');
      this.disconnect();
    }

    this.environment = environment;
    this.wsUrl = WS_URLS[environment];
    console.log(`✅ WebSocket URL set to: ${this.wsUrl}`);
  }

  /**
   * Set a custom WebSocket URL
   */
  public setWsUrl(url: string): void {
    if (this.wsUrl === url) {
      return;
    }

    console.log(`🔌 Setting custom WebSocket URL: ${url}`);
    
    // Disconnect existing connection if any
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.disconnect();
    }

    this.wsUrl = url;
    
    // Detect environment from URL
    if (url.includes('demo.')) {
      this.environment = 'demo';
    } else if (url.includes('live.')) {
      this.environment = 'live';
    }
  }

  public getEnvironment(): 'demo' | 'live' {
    return this.environment;
  }

  public getWsUrl(): string {
    return this.wsUrl;
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  public connect(accessToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Already connected
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('🔌 WebSocket already connected');
        resolve();
        return;
      }

      // Connection in progress
      if (this.isConnecting) {
        console.warn('🔌 WebSocket connection already in progress');
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;
      this.isManualClose = false;
      this.accessToken = accessToken;

      console.log(`🔌 Connecting to Tradovate WebSocket (${this.environment.toUpperCase()})...`);
      console.log(`🔌 URL: ${this.wsUrl}`);

      try {
        this.ws = new WebSocket(this.wsUrl);

        // Connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            console.error('🔌 WebSocket connection timeout');
            this.isConnecting = false;
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000); // 10 second timeout

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log(`✅ Tradovate WebSocket connected (${this.environment.toUpperCase()})`);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          
          // Authenticate the WebSocket connection
          this.authenticate(accessToken);
          
          // Start heartbeat
          this.startHeartbeat();
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('🔌 Tradovate WebSocket error:', error);
          this.isConnecting = false;
          
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(error);
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log(`🔌 Tradovate WebSocket closed (code: ${event.code}, reason: ${event.reason || 'none'})`);
          this.isConnecting = false;
          this.stopHeartbeat();
          
          // Auto-reconnect if not manual close
          if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnect();
          }
        };

      } catch (error) {
        console.error('🔌 WebSocket creation error:', error);
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Authenticate the WebSocket connection after opening.
   * Wire format: `authorize\n0\n\n<token>` (see tradovateProtocol.ts).
   */
  private authenticate(accessToken: string): void {
    console.log('🔐 Sending WebSocket authentication...');
    this.send(buildAuthFrame(accessToken));
  }

  private reconnect(): void {
    if (this.isManualClose || !this.accessToken) {
      console.log('🔌 Skipping reconnect (manual close or no token)');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`🔌 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);

    setTimeout(() => {
      if (this.accessToken && !this.isManualClose) {
        this.connect(this.accessToken).catch((error) => {
          console.error('🔌 Reconnection failed:', error);
        });
      }
    }, delay);
  }

  // ============================================================================
  // HEARTBEAT
  // ============================================================================

  private startHeartbeat(): void {
    // Clear existing interval if any
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send(buildHeartbeatFrame());
      } else {
        console.warn('🔌 Heartbeat skipped - WebSocket not open');
      }
    }, 2500); // Tradovate recommends 2.5 seconds

    console.log('💓 Heartbeat started (every 2.5s)');
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('💓 Heartbeat stopped');
    }
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  private handleMessage(data: string): void {
    const frame = decodeFrame(data);

    switch (frame.type) {
      case 'open':
      case 'heartbeat':
        return;
      case 'data':
        for (const message of frame.messages) {
          this.processMessage(message);
        }
        return;
      case 'close':
        console.log(
          `🔌 Server close frame received (code: ${frame.code}, reason: ${frame.reason || 'none'})`,
        );
        return;
      case 'unknown':
        console.error('🔌 Unrecognized WebSocket frame. Raw:', frame.raw);
        return;
    }
  }

  private processMessage(message: TradovateMessage): void {
    if (!message.e || !message.d) {
      return;
    }

    const eventType = message.e as TradovateEventType;
    const callbacks = this.eventListeners.get(eventType);

    if (callbacks && callbacks.size > 0) {
      callbacks.forEach(callback => {
        try {
          callback(message.d);
        } catch (error) {
          console.error(`🔌 Error in ${eventType} callback:`, error);
        }
      });
    }
  }

  private send(data: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      console.warn('🔌 Cannot send - WebSocket not open. State:', this.ws?.readyState);
    }
  }

  // ============================================================================
  // SUBSCRIPTIONS
  // ============================================================================

  public subscribe(eventType: TradovateEventType, callback: EventCallback): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    
    this.eventListeners.get(eventType)!.add(callback);
    console.log(`📡 Subscribed to ${eventType} events`);

    // Return unsubscribe function
    return () => {
      const callbacks = this.eventListeners.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.eventListeners.delete(eventType);
        }
        console.log(`📡 Unsubscribed from ${eventType} events`);
      }
    };
  }

  // Convenience subscription methods
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

  // ============================================================================
  // DISCONNECT
  // ============================================================================

  public disconnect(): void {
    console.log('🔌 Disconnecting Tradovate WebSocket...');
    
    this.isManualClose = true;
    this.stopHeartbeat();
    
    if (this.ws) {
      // Remove listeners before closing to prevent reconnect
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      
      if (this.ws.readyState === WebSocket.OPEN || 
          this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Client disconnect');
      }
      this.ws = null;
    }
    
    this.eventListeners.clear();
    this.accessToken = null;
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    
    console.log('✅ Tradovate WebSocket disconnected');
  }

  // ============================================================================
  // STATUS
  // ============================================================================

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public getConnectionState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  public getConnectionStateString(): string {
    const state = this.ws?.readyState ?? WebSocket.CLOSED;
    switch (state) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }
}

export const tradovateWebSocketService = new TradovateWebSocketService();