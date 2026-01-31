import { Platform } from 'react-native';
import * as Network from 'expo-network';
import { Competition, generateSyncPayload, applySyncPayload } from './competitionStorage';

// Network sync utilities for multi-device competition mode
// This provides a foundation for local network and Bluetooth sync

export interface SyncDevice {
  id: string;
  name: string;
  ipAddress?: string;
  isHost: boolean;
  lastSeen: string;
}

export interface SyncMessage {
  type: 'join_request' | 'join_accepted' | 'score_update' | 'sync_full' | 'ping' | 'pong';
  competitionId: string;
  joinCode?: string;
  deviceId: string;
  deviceName: string;
  payload?: string;
  timestamp: string;
}

// Generate a unique device ID
export const getDeviceId = async (): Promise<string> => {
  // In a real app, you'd store this persistently
  const id = `device_${Platform.OS}_${Math.random().toString(36).substring(2, 10)}`;
  return id;
};

// Get local IP address
export const getLocalIpAddress = async (): Promise<string | null> => {
  try {
    const ip = await Network.getIpAddressAsync();
    return ip;
  } catch (error) {
    console.error('Error getting IP address:', error);
    return null;
  }
};

// Check network connectivity
export const checkNetworkStatus = async (): Promise<{
  isConnected: boolean;
  isWifi: boolean;
  ipAddress: string | null;
}> => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    const ipAddress = await getLocalIpAddress();
    
    return {
      isConnected: networkState.isConnected || false,
      isWifi: networkState.type === Network.NetworkStateType.WIFI,
      ipAddress,
    };
  } catch (error) {
    console.error('Error checking network status:', error);
    return { isConnected: false, isWifi: false, ipAddress: null };
  }
};

// Generate QR code data for joining competition
export const generateJoinQRData = (competition: Competition, hostIp: string): string => {
  return JSON.stringify({
    type: 'competition_join',
    competitionId: competition.id,
    joinCode: competition.joinCode,
    hostIp,
    competitionName: competition.name,
    targetType: competition.targetType,
    distance: competition.distance,
  });
};

// Parse QR code data for joining
export const parseJoinQRData = (qrData: string): {
  competitionId: string;
  joinCode: string;
  hostIp: string;
  competitionName: string;
} | null => {
  try {
    const data = JSON.parse(qrData);
    if (data.type === 'competition_join') {
      return {
        competitionId: data.competitionId,
        joinCode: data.joinCode,
        hostIp: data.hostIp,
        competitionName: data.competitionName,
      };
    }
    return null;
  } catch (error) {
    console.error('Error parsing QR data:', error);
    return null;
  }
};

// Create sync message
export const createSyncMessage = (
  type: SyncMessage['type'],
  competitionId: string,
  deviceId: string,
  deviceName: string,
  payload?: string,
  joinCode?: string
): SyncMessage => {
  return {
    type,
    competitionId,
    joinCode,
    deviceId,
    deviceName,
    payload,
    timestamp: new Date().toISOString(),
  };
};

// Simple HTTP-based sync (for when devices are on same network)
// Host device would need to run a server - this is a client-side helper
export class NetworkSyncClient {
  private hostUrl: string;
  private deviceId: string;
  private deviceName: string;
  private competitionId: string;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(hostIp: string, port: number, deviceId: string, deviceName: string, competitionId: string) {
    this.hostUrl = `http://${hostIp}:${port}`;
    this.deviceId = deviceId;
    this.deviceName = deviceName;
    this.competitionId = competitionId;
  }

  async sendScoreUpdate(payload: string): Promise<boolean> {
    try {
      const message = createSyncMessage(
        'score_update',
        this.competitionId,
        this.deviceId,
        this.deviceName,
        payload
      );

      const response = await fetch(`${this.hostUrl}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending score update:', error);
      return false;
    }
  }

  async fetchLatestState(): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.hostUrl}/competition/${this.competitionId}/state`
      );
      if (response.ok) {
        const data = await response.json();
        return JSON.stringify(data);
      }
      return null;
    } catch (error) {
      console.error('Error fetching state:', error);
      return null;
    }
  }

  startPolling(callback: (payload: string) => void, intervalMs: number = 3000): void {
    this.stopPolling();
    this.pollInterval = setInterval(async () => {
      const state = await this.fetchLatestState();
      if (state) {
        callback(state);
      }
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}

// Bluetooth sync placeholder
// Full implementation would require react-native-ble-plx and a dev client build
export const isBluetoothAvailable = async (): Promise<boolean> => {
  // This would check if Bluetooth is available and enabled
  // Requires native module - returning false for now
  return false;
};

export const startBluetoothAdvertising = async (competition: Competition): Promise<boolean> => {
  // Would start BLE advertising as a peripheral
  console.log('Bluetooth advertising not implemented - requires dev client build');
  return false;
};

export const scanForBluetoothCompetitions = async (): Promise<SyncDevice[]> => {
  // Would scan for BLE peripherals advertising competitions
  console.log('Bluetooth scanning not implemented - requires dev client build');
  return [];
};
