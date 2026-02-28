import React, { useEffect, useState } from 'react';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../i18n'; // Initialize i18n
import { loadSavedLanguage } from '../i18n';

// Prevent the splash screen from auto-hiding before loading completes
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Load saved language preference at app startup
    const initLanguage = async () => {
      await loadSavedLanguage();
      SplashScreen.hideAsync();
    };
    initLanguage();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a1a2e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#16213e',
          },
          headerBackVisible: true,
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Arrow Tracker',
            headerShown: true,
            headerLeft: () => null,
          }} 
        />
        <Stack.Screen name="scoring" options={{ headerShown: false }} />
        <Stack.Screen name="summary" options={{ headerBackVisible: false }} />
        <Stack.Screen name="history" options={{ headerShown: false }} />
        <Stack.Screen name="stats" options={{ headerShown: false }} />
        <Stack.Screen name="bows" options={{ headerShown: false }} />
        <Stack.Screen name="sessionSetup" options={{ headerShown: false }} />
        <Stack.Screen name="report" options={{ headerShown: false }} />
        <Stack.Screen name="backup" options={{ headerShown: false }} />
        <Stack.Screen name="competitionSetup" options={{ headerShown: false }} />
        <Stack.Screen name="competitionScoring" options={{ headerShown: false }} />
        <Stack.Screen name="competitionSummary" options={{ headerShown: false }} />
        <Stack.Screen name="competitionMenu" options={{ headerShown: false }} />
        <Stack.Screen name="scoreKeeping" options={{ headerShown: false }} />
        <Stack.Screen name="manualScoring" options={{ headerShown: false }} />
        <Stack.Screen name="importPdf" options={{ headerShown: false }} />
        <Stack.Screen name="competitionHistory" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
