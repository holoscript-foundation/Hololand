# HoloScript Mobile (React Native) Deployment Guide

## Overview

Deploy HoloScript applications to iOS and Android using React Native, Expo, and native modules for multiplayer gaming, offline gameplay, and local parties.

**Platforms**: iOS 12+, Android 6+  
**Framework**: React Native + Expo + TypeScript  
**Architecture**: Client-side (native file system, Bluetooth, WiFi)  
**Target**: Mobile multiplayer, local LAN parties, offline gameplay

---

## Prerequisites

### System Requirements

```bash
# Node.js 16+
node --version

# Expo CLI
npm install -g expo-cli
expo --version

# iOS: Xcode 12+ (macOS only)
xcode-select --install

# Android: Android Studio 4.1+
android --version
```

### Install Dependencies

```bash
# Create React Native app with TypeScript
npx create-expo-app HoloScript --template

cd HoloScript

# Install HoloScript systems
npm install events @types/events

# Install React Native specific packages
npm install react-native-async-storage
npm install @react-native-community/netinfo
npm install react-native-document-picker
npm install @react-native-firebase/app @react-native-firebase/database  # Optional cloud sync
```

---

## Project Setup

### 1. Create React Native Bridge

**src/services/NativeHoloScriptBridge.ts**:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import * as FileSystem from 'expo-file-system'

export class NativeHoloScriptBridge {
  private docDir = FileSystem.documentDirectory || ''
  
  // ===== Party Storage =====
  async savePartyData(partyId: string, data: any): Promise<void> {
    const path = `${this.docDir}parties/${partyId}.json`
    await FileSystem.makeDirectoryAsync(
      `${this.docDir}parties`,
      { intermediates: true }
    )
    await FileSystem.writeAsStringAsync(path, JSON.stringify(data))
  }
  
  async loadPartyData(partyId: string): Promise<any> {
    const path = `${this.docDir}parties/${partyId}.json`
    try {
      const data = await FileSystem.readAsStringAsync(path)
      return JSON.parse(data)
    } catch {
      return null
    }
  }
  
  async listParties(): Promise<string[]> {
    const partiesDir = `${this.docDir}parties`
    try {
      const files = await FileSystem.readDirectoryAsync(partiesDir)
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''))
    } catch {
      return []
    }
  }
  
  // ===== Analytics Storage =====
  async saveAnalyticsSession(sessionId: string, csv: string): Promise<void> {
    const path = `${this.docDir}analytics/${sessionId}.csv`
    await FileSystem.makeDirectoryAsync(
      `${this.docDir}analytics`,
      { intermediates: true }
    )
    await FileSystem.writeAsStringAsync(path, csv)
  }
  
  async loadAnalyticsSession(sessionId: string): Promise<string | null> {
    const path = `${this.docDir}analytics/${sessionId}.csv`
    try {
      return await FileSystem.readAsStringAsync(path)
    } catch {
      return null
    }
  }
  
  // ===== Offline Sync Queue =====
  async queueLocalUpdate(update: any): Promise<void> {
    const queue = await this.getOfflineSyncQueue()
    queue.push({
      ...update,
      queuedAt: Date.now()
    })
    await AsyncStorage.setItem('offsetSyncQueue', JSON.stringify(queue))
  }
  
  async getOfflineSyncQueue(): Promise<any[]> {
    try {
      const queue = await AsyncStorage.getItem('offsetSyncQueue')
      return queue ? JSON.parse(queue) : []
    } catch {
      return []
    }
  }
  
  async clearOfflineSyncQueue(): Promise<void> {
    await AsyncStorage.removeItem('offsetSyncQueue')
  }
  
  // ===== Network Status =====
  async checkNetworkStatus(): Promise<boolean> {
    const state = await NetInfo.fetch()
    return state.isConnected || false
  }
  
  subscribeToNetworkStatus(callback: (isOnline: boolean) => void) {
    return NetInfo.addEventListener(state => {
      callback(state.isConnected || false)
    })
  }
  
  // ===== World Saves =====
  async saveWorld(worldId: string, data: any): Promise<void> {
    const path = `${this.docDir}worlds/${worldId}.json`
    await FileSystem.makeDirectoryAsync(
      `${this.docDir}worlds`,
      { intermediates: true }
    )
    await FileSystem.writeAsStringAsync(path, JSON.stringify(data))
  }
  
  async loadWorld(worldId: string): Promise<any> {
    const path = `${this.docDir}worlds/${worldId}.json`
    try {
      const data = await FileSystem.readAsStringAsync(path)
      return JSON.parse(data)
    } catch {
      return null
    }
  }
  
  async listWorlds(): Promise<string[]> {
    const worldsDir = `${this.docDir}worlds`
    try {
      const files = await FileSystem.readDirectoryAsync(worldsDir)
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''))
    } catch {
      return []
    }
  }
}

export const nativeBridge = new NativeHoloScriptBridge()
```

### 2. Create React Native Hooks

**src/hooks/useMobileHoloScript.ts**:
```typescript
import { useEffect, useState, useCallback } from 'react'
import { useAllSystems } from './useHoloScriptSystems'
import { nativeBridge } from '../services/NativeHoloScriptBridge'

export function useMobileParty() {
  const { party } = useAllSystems()
  const [savedParties, setSavedParties] = useState<string[]>([])
  
  useEffect(() => {
    nativeBridge.listParties().then(setSavedParties)
  }, [])
  
  const createAndSave = useCallback(async (name: string) => {
    const newParty = party.createParty(name, { maxPlayers: 4 })
    await nativeBridge.savePartyData(newParty.partyId, newParty)
    setSavedParties(prev => [...prev, newParty.partyId])
    return newParty
  }, [party])
  
  const loadParty = useCallback(async (partyId: string) => {
    const data = await nativeBridge.loadPartyData(partyId)
    if (data) {
      party.joinParty(data.partyId)
      return data
    }
  }, [party])
  
  return {
    ...party,
    createAndSave,
    loadParty,
    savedParties
  }
}

export function useMobileAnalytics() {
  const { analytics } = useAllSystems()
  const [isOnline, setIsOnline] = useState(true)
  
  useEffect(() => {
    const unsubscribe = nativeBridge.subscribeToNetworkStatus(isOnline => {
      setIsOnline(isOnline)
      
      if (isOnline && analytics.isRecording) {
        // Auto-sync analytics when coming online
        handleExport()
      }
    })
    
    return unsubscribe
  }, [analytics])
  
  const handleExport = useCallback(async () => {
    const csv = analytics.exportAsCSV()
    const sessionId = analytics.sessionId || 'session'
    await nativeBridge.saveAnalyticsSession(sessionId, csv)
  }, [analytics])
  
  return {
    ...analytics,
    exportAndSave: handleExport,
    isOnline
  }
}

export function useMobileOfflineSync() {
  const { sync } = useAllSystems()
  const [isOnline, setIsOnline] = useState(true)
  
  useEffect(() => {
    const unsubscribe = nativeBridge.subscribeToNetworkStatus(isOnline => {
      setIsOnline(isOnline)
      
      if (isOnline) {
        // Auto-sync when online
        handleSync()
      }
    })
    
    return unsubscribe
  }, [])
  
  const queueUpdate = useCallback(async (update: any) => {
    sync.trackLocalUpdate(update)
    await nativeBridge.queueLocalUpdate(update)
  }, [sync])
  
  const handleSync = useCallback(async () => {
    const queue = await nativeBridge.getOfflineSyncQueue()
    if (queue.length > 0) {
      await sync.syncAll()
      await nativeBridge.clearOfflineSyncQueue()
    }
  }, [sync])
  
  return {
    queueUpdate,
    syncNow: handleSync,
    isOnline,
    pendingCount: sync.pendingUpdates
  }
}

export function useMobileWorlds() {
  const { examples } = useAllSystems()
  const [savedWorlds, setSavedWorlds] = useState<string[]>([])
  
  useEffect(() => {
    nativeBridge.listWorlds().then(setSavedWorlds)
  }, [])
  
  const saveWorld = useCallback(async (worldId: string, worldData: any) => {
    await nativeBridge.saveWorld(worldId, worldData)
    setSavedWorlds(prev => [...prev, worldId])
  }, [])
  
  const loadWorld = useCallback(async (worldId: string) => {
    return await nativeBridge.loadWorld(worldId)
  }, [])
  
  return {
    ...examples,
    saveWorld,
    loadWorld,
    savedWorlds
  }
}
```

---

## Mobile UI Components

### 1. Main App

**App.tsx**:
```typescript
import React from 'react'
import { SafeAreaView, StyleSheet, ScrollView } from 'react-native'
import { MobileHoloScriptApp } from './components/MobileHoloScriptApp'

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <MobileHoloScriptApp />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  }
})
```

### 2. Main Component

**src/components/MobileHoloScriptApp.tsx**:
```typescript
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useMobileParty, useMobileAnalytics, useMobileOfflineSync, useMobileWorlds } from '../hooks/useMobileHoloScript'

export function MobileHoloScriptApp() {
  const party = useMobileParty()
  const analytics = useMobileAnalytics()
  const sync = useMobileOfflineSync()
  const worlds = useMobileWorlds()
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎮 HoloScript Mobile</Text>
      
      {/* Party Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Party Management</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => party.createAndSave('Mobile Party')}
        >
          <Text style={styles.buttonText}>Create Party</Text>
        </TouchableOpacity>
        <Text style={styles.info}>
          Saved Parties: {party.savedParties.length}
        </Text>
      </View>
      
      {/* Analytics Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analytics</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => analytics.startSession('MobilePlayer')}
        >
          <Text style={styles.buttonText}>
            {analytics.isRecording ? 'Stop Recording' : 'Start Recording'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => analytics.exportAndSave()}
        >
          <Text style={styles.buttonText}>Export Data</Text>
        </TouchableOpacity>
        <Text style={styles.info}>
          Status: {analytics.isOnline ? '📡 Online' : '📵 Offline'}
        </Text>
      </View>
      
      {/* Sync Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Offline Sync</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => sync.syncNow()}
        >
          <Text style={styles.buttonText}>Sync Now</Text>
        </TouchableOpacity>
        <Text style={styles.info}>
          Pending Updates: {sync.pendingCount}
        </Text>
      </View>
      
      {/* Worlds Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved Worlds</Text>
        {worlds.savedWorlds.map(worldId => (
          <TouchableOpacity key={worldId} style={styles.worldItem}>
            <Text style={styles.worldName}>{worldId}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8
  },
  secondaryButton: {
    backgroundColor: '#34C759'
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600'
  },
  info: {
    marginTop: 10,
    fontSize: 14,
    color: '#666'
  },
  worldItem: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
    borderRadius: 4
  },
  worldName: {
    fontSize: 14,
    fontWeight: '500'
  }
})
```

---

## Building for Mobile

### iOS

```bash
# Build for iOS
eas build --platform ios

# Or locally with Xcode
npx expo prebuild --clean
npx expo run:ios

# For App Store
eas submit --platform ios
```

**eas.json** (iOS configuration):
```json
{
  "build": {
    "production": {
      "ios": {
        "buildType": "app-store"
      }
    },
    "preview": {
      "ios": {
        "buildType": "simulator"
      }
    }
  }
}
```

### Android

```bash
# Build for Android
eas build --platform android

# Or locally
npx expo prebuild --clean
npx expo run:android

# For Play Store
eas submit --platform android
```

**eas.json** (Android configuration):
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

---

## Native Capabilities

### Local Network Discovery

```typescript
import * as NetInfo from '@react-native-community/netinfo'

const discoverLocalParties = async () => {
  const state = await NetInfo.fetch()
  if (state.type === 'wifi') {
    // Broadcast on local network
    // Use mDNS or UDP broadcast
  }
}
```

### File Sharing

```typescript
import * as Sharing from 'expo-sharing'

const shareAnalytics = async (csv: string) => {
  const file = FileSystem.cacheDirectory + 'analytics.csv'
  await FileSystem.writeAsStringAsync(file, csv)
  await Sharing.shareAsync(file)
}
```

### Bluetooth (Optional for P2P)

```typescript
// Install: npm install expo-ble-peripheral

import * as BLE from 'expo-ble-peripheral'

const advertiseParty = async (partyId: string) => {
  await BLE.startAdvertising({
    name: 'HoloScript',
    serviceUuids: [partyId]
  })
}
```

---

## App Store Distribution

### App Store (iOS)

1. Create Apple Developer account
2. Create app in App Store Connect
3. Configure signing certificates
4. Submit with `eas submit --platform ios`

### Play Store (Android)

1. Create Google Play Developer account
2. Create app in Google Play Console
3. Generate signing key
4. Submit with `eas submit --platform android`

---

## Performance Optimization

### Memory Management

```typescript
// Cleanup large objects
useEffect(() => {
  return () => {
    // Cleanup code
  }
}, [])
```

### Local Storage Limits

```typescript
const MAX_STORAGE = 50 * 1024 * 1024 // 50 MB

// Check space
const info = await FileSystem.getInfoAsync(FileSystem.documentDirectory!)
if (info.size > MAX_STORAGE) {
  // Cleanup old files
}
```

---

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Build test
eas build --platform ios --profile preview
```

---

## Next Steps

1. ✅ Mobile setup complete
2. → Submit to App Store and Play Store
3. → Add Bluetooth P2P networking
4. → Integrate Game Center / Google Play Games
5. → Add push notifications

---

**Mobile ready!** 🚀
