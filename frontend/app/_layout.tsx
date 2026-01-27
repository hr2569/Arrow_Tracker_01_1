import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function HeaderBackButton() {
  const router = useRouter();
  const pathname = usePathname();
  
  const handleBack = () => {
    console.log('HeaderBackButton pressed, pathname:', pathname);
    console.log('canGoBack:', router.canGoBack());
    
    // On native, try back() first without checking canGoBack
    // canGoBack() can sometimes return false even when back navigation is possible
    try {
      router.back();
      console.log('router.back() called');
    } catch (error) {
      console.log('Back navigation error:', error);
      // Fallback: navigate to home
      router.replace('/');
    }
  };
  
  return (
    <TouchableOpacity 
      onPress={handleBack} 
      style={{ marginLeft: 10, padding: 8, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-back" size={24} color="#fff" />
    </TouchableOpacity>
  );
}

export default function RootLayout() {
  return (
    <>
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
            title: 'Archery Scorer',
            headerShown: true,
            headerLeft: () => null, // No back button on home
          }} 
        />
        <Stack.Screen 
          name="sessionType" 
          options={{ 
            title: 'New Session',
            headerBackTitle: 'Back',
            headerLeft: () => <HeaderBackButton />,
          }} 
        />
        <Stack.Screen 
          name="scoring" 
          options={{ 
            title: 'Score Arrows',
            headerBackTitle: 'Back',
            headerLeft: () => <HeaderBackButton />,
          }} 
        />
        <Stack.Screen 
          name="summary" 
          options={{ 
            title: 'Round Summary',
            headerBackTitle: 'Back',
            headerLeft: () => <HeaderBackButton />,
          }} 
        />
        <Stack.Screen 
          name="history" 
          options={{ 
            title: 'Score History',
            headerBackTitle: 'Back',
            headerLeft: () => <HeaderBackButton />,
          }} 
        />
        <Stack.Screen 
          name="stats" 
          options={{ 
            title: 'Statistics',
            headerBackTitle: 'Back',
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
          name="settings" 
          options={{ 
            headerShown: false,
          }} 
        />
      </Stack>
    </>
  );
}
