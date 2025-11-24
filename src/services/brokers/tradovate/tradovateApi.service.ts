// src/services/brokers/tradovate/tradovateApi.service.ts
// 🚨 FINAL VERSION - Complete fix with error handling for invalid responses

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  TradovateCredentials,
  TradovateAuthResponse,
  TradovateAccount,
  TradovatePosition,
  TradovateContract,
  TradovateProduct,
  TradovateFill,
  TradovateOrder,
  TradovateCashBalance,
  TradovateMarginSnapshot,
  TradovateError
} from '@/types/brokers/tradovate/tradovate.types';

class TradovateApiService {
  private apiClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiration: Date | null = null;
  private API_URL: string;

  constructor() {
    this.API_URL = import.meta.env.VITE_TRADOVATE_API_URL || 'https://demo.tradovateapi.com/v1';
    
    // Load existing token immediately
    this.loadAuth();
    
    this.apiClient = axios.create({
      baseURL: this.API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // 🚨 CRITICAL FIX: Improved token injection
    this.apiClient.interceptors.request.use(
      (config) => {
        // ALWAYS check for the latest token from BOTH sources
        const memoryToken = this.accessToken;
        const storageToken = localStorage.getItem('tradovate_token');
        const finalToken = memoryToken || storageToken;
        
        // Debug: Log token status
        const isAuthEndpoint = config.url?.includes('/auth/');
        
        if (!isAuthEndpoint) {
          console.log('🔐 Token Check:', {
            memoryToken: memoryToken ? '✅ EXISTS' : '❌ NULL',
            storageToken: storageToken ? '✅ EXISTS' : '❌ NULL',
            finalToken: finalToken ? '✅ USING' : '❌ NONE',
            url: config.url
          });
        }
        
        // Inject token if available and not an auth endpoint
        if (finalToken && !isAuthEndpoint) {
          config.headers.Authorization = `Bearer ${finalToken}`;
          console.log('✅ Token injected into request');
        } else if (!isAuthEndpoint) {
          console.error('❌ NO TOKEN AVAILABLE FOR REQUEST:', config.url);
        }
        
        return config;
      },
      (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    this.apiClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError<TradovateError>) => {
        console.error('❌ API Error:', {
          status: error.response?.status,
          url: error.config?.url,
          errorText: error.response?.data?.errorText
        });
        
        if (error.response?.status === 401) {
          console.warn('⚠️ Unauthorized - clearing auth');
          this.clearAuth();
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }

  // ============================================================================
  // API URL MANAGEMENT
  // ============================================================================

  public setApiUrl(url: string): void {
    console.log(`🌐 Changing API URL: ${this.API_URL} → ${url}`);
    
    this.API_URL = url;
    this.apiClient.defaults.baseURL = url;
    this.clearAuth();
    
    console.log(`✅ API URL changed to ${url}`);
  }

  public getApiUrl(): string {
    return this.API_URL;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private handleError(error: AxiosError<TradovateError>): Error {
    if (error.response?.data?.errorText) {
      return new Error(error.response.data.errorText);
    }
    if (error.response?.status === 404) {
      return new Error(`Endpoint not found: ${error.config?.url} (Status: 404)`);
    }
    if (error.response?.status === 401) {
      return new Error('Authentication failed. Please check your credentials.');
    }
    return new Error(error.message || 'An error occurred with Tradovate API');
  }

  private clearAuth(): void {
    console.log('🧹 Clearing authentication');
    this.accessToken = null;
    this.tokenExpiration = null;
    localStorage.removeItem('tradovate_token');
    localStorage.removeItem('tradovate_token_expiration');
    localStorage.removeItem('tradovate_user');
  }

  private saveAuth(authResponse: TradovateAuthResponse): void {
    console.log('💾 Saving authentication:', {
      userId: authResponse.userId,
      userName: authResponse.userName,
      hasToken: !!authResponse.accessToken,
      fullResponse: authResponse
    });

    // ✅ Validate response before saving
    if (!authResponse.accessToken) {
      console.error('❌ Invalid auth response: No access token');
      throw new Error('Login failed: No access token received from server. Please check your credentials.');
    }

    if (!authResponse.expirationTime) {
      console.error('❌ Invalid auth response: No expiration time');
      throw new Error('Login failed: Invalid response from server.');
    }

    // Try to parse expiration time
    let expirationDate: Date;
    try {
      expirationDate = new Date(authResponse.expirationTime);
      
      // Check if date is valid
      if (isNaN(expirationDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      console.error('❌ Invalid expiration time:', authResponse.expirationTime);
      throw new Error('Login failed: Invalid expiration time format.');
    }

    // Save to memory FIRST
    this.accessToken = authResponse.accessToken;
    this.tokenExpiration = expirationDate;
    
    // Then save to localStorage
    localStorage.setItem('tradovate_token', authResponse.accessToken);
    localStorage.setItem('tradovate_token_expiration', authResponse.expirationTime);
    
    if (authResponse.userId && authResponse.userName) {
      localStorage.setItem('tradovate_user', JSON.stringify({
        userId: authResponse.userId,
        userName: authResponse.userName,
        name: authResponse.name || authResponse.userName
      }));
    }

    console.log('✅ Token saved successfully:', {
      inMemory: !!this.accessToken,
      inStorage: !!localStorage.getItem('tradovate_token'),
      expiresAt: this.tokenExpiration.toISOString()
    });
  }

  private loadAuth(): boolean {
    const token = localStorage.getItem('tradovate_token');
    const expiration = localStorage.getItem('tradovate_token_expiration');

    console.log('🔄 Loading auth from localStorage:', {
      hasToken: !!token,
      hasExpiration: !!expiration
    });

    if (token && expiration) {
      const expirationDate = new Date(expiration);
      const now = new Date();
      
      if (expirationDate > now) {
        this.accessToken = token;
        this.tokenExpiration = expirationDate;
        
        console.log('✅ Auth loaded successfully:', {
          tokenPreview: token.substring(0, 20) + '...',
          expiresIn: Math.round((expirationDate.getTime() - now.getTime()) / 1000 / 60) + ' minutes'
        });
        
        return true;
      } else {
        console.warn('⚠️ Token expired, clearing auth');
        this.clearAuth();
      }
    } else {
      console.log('ℹ️ No auth found in localStorage');
    }
    
    return false;
  }

  public isAuthenticated(): boolean {
    this.loadAuth(); // Refresh from localStorage
    const isValid = this.tokenExpiration ? this.tokenExpiration > new Date() : false;
    
    console.log('🔐 Authentication check:', {
      hasToken: !!this.accessToken,
      isValid,
      expiresAt: this.tokenExpiration?.toISOString()
    });
    
    return isValid;
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  public async login(credentials: TradovateCredentials): Promise<TradovateAuthResponse> {
    try {
      console.log('🔐 Login attempt:', {
        username: credentials.username,
        apiUrl: this.API_URL,
        fullUrl: `${this.API_URL}/auth/accesstokenrequest`
      });

      const requestBody = {
        name: credentials.username,
        password: credentials.password,
        appId: 'Finotaur',
        appVersion: '1.0',
        deviceId: credentials.deviceId || 'WebApp',
        cid: credentials.cid,
        sec: credentials.sec
      };

      console.log('📤 Request body:', { ...requestBody, password: '***' });

      const response = await this.apiClient.post<TradovateAuthResponse>(
        '/auth/accesstokenrequest',
        requestBody
      );

      // ✅ Log FULL response for debugging
      console.log('✅ Full login response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      // ✅ Validate response
      if (!response.data) {
        throw new Error('Empty response from server');
      }

      if (!response.data.accessToken) {
        console.error('❌ No access token in response:', response.data);
        throw new Error('Login failed: Server did not return an access token. Please check your credentials.');
      }

      console.log('✅ Login successful:', {
        userId: response.data.userId,
        userName: response.data.userName,
        tokenReceived: !!response.data.accessToken,
        tokenPreview: response.data.accessToken?.substring(0, 20) + '...'
      });

      this.saveAuth(response.data);
      
      // Verify token was saved
      const verifyToken = localStorage.getItem('tradovate_token');
      console.log('🔍 Verification - Token saved:', !!verifyToken);
      
      return response.data;
      
    } catch (error: any) {
      console.error('❌ Login failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        fullError: error
      });
      
      // Better error messages
      if (error.response?.status === 401) {
        throw new Error('Invalid credentials. Please check your username and password.');
      }
      
      throw this.handleError(error as AxiosError<TradovateError>);
    }
  }

  public async logout(): Promise<void> {
    try {
      console.log('👋 Logging out');
      await this.apiClient.get('/auth/me');
      this.clearAuth();
    } catch (error) {
      console.warn('⚠️ Logout error (still clearing auth)');
      this.clearAuth();
      throw this.handleError(error as AxiosError<TradovateError>);
    }
  }

  public async renewToken(): Promise<TradovateAuthResponse> {
    try {
      console.log('🔄 Renewing token');
      const response = await this.apiClient.get<TradovateAuthResponse>('/auth/renewaccesstoken');
      this.saveAuth(response.data);
      console.log('✅ Token renewed successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Token renewal failed:', error);
      throw this.handleError(error as AxiosError<TradovateError>);
    }
  }

  // ============================================================================
  // ACCOUNT METHODS
  // ============================================================================

  public async getAccounts(): Promise<TradovateAccount[]> {
    try {
      // 🚨 CRITICAL: Force reload auth before making request
      this.loadAuth();
      
      const token = this.accessToken;
      
      console.log('📊 Getting accounts:', {
        apiUrl: this.API_URL,
        hasToken: !!token,
        isAuthenticated: this.isAuthenticated()
      });

      if (!token) {
        throw new Error('❌ No authentication token available. Please login first.');
      }

      const response = await this.apiClient.get<TradovateAccount[]>('/account/list');
      
      console.log('✅ Accounts received:', {
        count: response.data.length,
        accounts: response.data.map(a => ({ id: a.id, name: a.name }))
      });

      return response.data;
    } catch (error) {
      console.error('❌ Failed to get accounts:', error);
      throw this.handleError(error as AxiosError<TradovateError>);
    }
  }

  public async getAccount(accountId: number): Promise<TradovateAccount> {
    try {
      console.log('📊 Getting account:', accountId);
      const response = await this.apiClient.get<TradovateAccount>(`/account/item?id=${accountId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<TradovateError>);
    }
  }

  // ============================================================================
  // POSITION METHODS
  // ============================================================================

  public async getPositions(accountId: number): Promise<TradovatePosition[]> {
    try {
      console.log('📍 Getting positions for account:', accountId);
      const response = await this.apiClient.get<TradovatePosition[]>(
        `/position/list?accountId=${accountId}`
      );
      console.log('✅ Positions received:', response.data.length);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<TradovateError>);
    }
  }

  // ============================================================================
  // CONTRACT & PRODUCT METHODS
  // ============================================================================

  public async getContract(contractId: number): Promise<TradovateContract> {
    try {
      const response = await this.apiClient.get<TradovateContract>(
        `/contract/item?id=${contractId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<TradovateError>);
    }
  }

  public async getProduct(productId: number): Promise<TradovateProduct> {
    try {
      const response = await this.apiClient.get<TradovateProduct>(
        `/product/item?id=${productId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<TradovateError>);
    }
  }

  public async findContract(name: string): Promise<TradovateContract | null> {
    try {
      const response = await this.apiClient.get<TradovateContract[]>(
        `/contract/find?name=${name}`
      );
      return response.data[0] || null;
    } catch (error) {
      throw this.handleError(error as AxiosError<TradovateError>);
    }
  }

  // ============================================================================
  // FILL (TRADE) METHODS
  // ============================================================================

  public async getFills(accountId: number, startDate?: string, endDate?: string): Promise<TradovateFill[]> {
    try {
      let url = `/fill/list?accountId=${accountId}`;
      if (startDate) url += `&startTimestamp=${startDate}`;
      if (endDate) url += `&endTimestamp=${endDate}`;

      console.log('📈 Getting fills:', { accountId, startDate, endDate });
      const response = await this.apiClient.get<TradovateFill[]>(url);
      console.log('✅ Fills received:', response.data.length);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<TradovateError>);
    }
  }

  // ============================================================================
  // ORDER METHODS
  // ============================================================================

  public async getOrders(accountId: number): Promise<TradovateOrder[]> {
    try {
      console.log('📋 Getting orders for account:', accountId);
      const response = await this.apiClient.get<TradovateOrder[]>(
        `/order/list?accountId=${accountId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<TradovateError>);
    }
  }

  // ============================================================================
  // CASH BALANCE METHODS
  // ============================================================================

  public async getCashBalance(accountId: number): Promise<TradovateCashBalance> {
    try {
      console.log('💰 Getting cash balance for account:', accountId);
      const response = await this.apiClient.get<TradovateCashBalance>(
        `/cashBalance/getCashBalanceSnapshot?accountId=${accountId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<TradovateError>);
    }
  }

  // ============================================================================
  // MARGIN METHODS
  // ============================================================================

  public async getMarginSnapshot(accountId: number): Promise<TradovateMarginSnapshot> {
    try {
      console.log('📊 Getting margin snapshot for account:', accountId);
      const response = await this.apiClient.get<TradovateMarginSnapshot>(
        `/marginSnapshot/item?accountId=${accountId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<TradovateError>);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  public getUserInfo(): { userId: number; userName: string; name: string } | null {
    const userStr = localStorage.getItem('tradovate_user');
    return userStr ? JSON.parse(userStr) : null;
  }
}

export const tradovateApiService = new TradovateApiService();