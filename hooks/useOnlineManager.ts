import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

import { runFullSync } from '../lib/services/syncService';

export const useOnlineManager = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;

      setIsOnline(online ?? true);

      if (online) {
        console.log("İnternet bağlantısı sağlandı, senkronizasyon tetikleniyor.");
        runFullSync();
      } else {
        console.log("İnternet bağlantısı koptu.");
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return isOnline;
};