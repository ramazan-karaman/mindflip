import { create } from 'zustand';

interface SyncState {

  isSyncing: boolean;
  
  hasPendingChanges: boolean;
  
  setSyncing: (isSyncing: boolean) => void;
  
  setHasPendingChanges: (hasChanges: boolean) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  hasPendingChanges: false,
  setSyncing: (isSyncing) => set({ isSyncing }),
  setHasPendingChanges: (hasChanges) => set({ hasPendingChanges: hasChanges }),
}));