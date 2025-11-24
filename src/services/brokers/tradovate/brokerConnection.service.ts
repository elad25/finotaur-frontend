// src/services/brokers/brokerConnection.service.ts

import { supabase } from '@/lib/supabase';

export interface BrokerConnection {
  id: string;
  user_id: string;
  broker_name: 'tradovate' | 'interactive_brokers' | 'ninjatrader' | 'tradestation';
  broker_account_id: string | null;
  broker_account_name: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  connection_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

class BrokerConnectionService {
  async getConnections(userId: string): Promise<BrokerConnection[]> {
    const { data, error } = await supabase
      .from('broker_connections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching broker connections:', error);
      throw error;
    }

    return data || [];
  }

  async getConnection(
    userId: string, 
    brokerName: string, 
    brokerAccountId?: string
  ): Promise<BrokerConnection | null> {
    let query = supabase
      .from('broker_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('broker_name', brokerName);

    if (brokerAccountId) {
      query = query.eq('broker_account_id', brokerAccountId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching broker connection:', error);
      throw error;
    }

    return data;
  }

  async createConnection(connection: Omit<BrokerConnection, 'id' | 'created_at' | 'updated_at'>): Promise<BrokerConnection> {
    const { data, error } = await supabase
      .from('broker_connections')
      .insert([connection])
      .select()
      .single();

    if (error) {
      console.error('Error creating broker connection:', error);
      throw error;
    }

    return data;
  }

  async updateConnection(
    id: string, 
    updates: Partial<Omit<BrokerConnection, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<BrokerConnection> {
    const { data, error } = await supabase
      .from('broker_connections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating broker connection:', error);
      throw error;
    }

    return data;
  }

  async updateLastSync(id: string): Promise<void> {
    const { error } = await supabase
      .from('broker_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating last sync timestamp:', error);
      throw error;
    }
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('broker_connections')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      console.error('Error updating connection status:', error);
      throw error;
    }
  }

  async deleteConnection(id: string): Promise<void> {
    const { error } = await supabase
      .from('broker_connections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting broker connection:', error);
      throw error;
    }
  }

  async getActiveConnections(userId: string): Promise<BrokerConnection[]> {
    const { data, error } = await supabase
      .from('broker_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active broker connections:', error);
      throw error;
    }

    return data || [];
  }

  async getConnectionsByBroker(userId: string, brokerName: string): Promise<BrokerConnection[]> {
    const { data, error } = await supabase
      .from('broker_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('broker_name', brokerName)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching broker connections by broker:', error);
      throw error;
    }

    return data || [];
  }
}

export const brokerConnectionService = new BrokerConnectionService();