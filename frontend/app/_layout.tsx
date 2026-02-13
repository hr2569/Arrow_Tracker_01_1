import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, Platform, View, ActivityIndicator } from 'react-native';
import { Icon } from '../components/Icon';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../i18n'; // Initialize i18n
import { loadSavedLanguage } from '../i18n';

function HeaderBackButton() {
  const router = useRouter();
  
  const handleBack = () => {
    // Simple back: always go to home screen
    router.replace('/');
  };
  
  return (
    <TouchableOpacity 
      onPress={handleBack} 
      style={{ marginLeft: 10, padding: 8, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.7}
    >
      <Icon name="arrow-back" size={24} color="#fff" />
    </TouchableOpacity>
  );
}

export default function RootLayout() {
  const [isLanguageLoaded, setIsLanguageLoaded] = useState(false);

  useEffect(() => {
    // Load saved language preference at app startup
    const initLanguage = async () => {
      await loadSavedLanguage();
      setIsLanguageLoaded(true);
    };
    initLanguage();
  }, []);

  // Show a loading screen until the language is loaded
  if (!isLanguageLoaded) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#121212' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
          <ActivityIndicator size="large" color="#8B0000" />
        </View>
      </GestureHandlerRootView>
    );
  }

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
            headerLeft: () => null, // No back button on home
          }} 
        />
        <Stack.Screen 
          name="scoring" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="summary" 
          options={{ 
            title: 'Round Summary',
            headerBackVisible: false,
          }} 
        />
        <Stack.Screen 
          name="history" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="stats" 
          options={{ 
            title: 'Statistics',
            headerBackVisible: false,
            headerLeft: () => <HeaderBackButton />,
          }} 
        />
        <Stack.Screen 
          name="bows" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="sessionSetup" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="report" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="backup" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="competitionSetup" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="competitionScoring" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="competitionSummary" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="competitionMenu" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="scoreKeeping" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="manualScoring" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="importPdf" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="competitionHistory" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="settings" 
          options={{ 
            headerShown: false,
          }} 
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
