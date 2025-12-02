/**
 * Network Status Indicator Component
 * 
 * Shows current network status in the navigation bar
 * Displays: Online, Offline, or Retrying with retry count
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { apiClient, NetworkStatus } from '@/lib/apiClient';

export function NetworkStatusIndicator() {
  const [status, setStatus] = useState<NetworkStatus>(apiClient.getStatus());

  useEffect(() => {
    // Subscribe to network status changes
    const unsubscribe = apiClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // Cleanup on unmount
    return unsubscribe;
  }, []);

  // Don't show indicator if everything is fine
  if (status.online && !status.retrying) {
    return null;
  }

  // Show offline indicator
  if (!status.online) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1.5">
        <WifiOff className="h-3 w-3" />
        <span>Offline</span>
      </Badge>
    );
  }

  // Show retrying indicator
  if (status.retrying) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1.5">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Retrying ({status.retryCount})</span>
      </Badge>
    );
  }

  // Show online indicator (briefly after reconnection)
  return (
    <Badge variant="default" className="flex items-center gap-1.5 bg-green-600">
      <Wifi className="h-3 w-3" />
      <span>Online</span>
    </Badge>
  );
}
