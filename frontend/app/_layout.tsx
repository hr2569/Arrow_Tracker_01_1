import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function HeaderBackButton() {
  const router = useRouter();
  const pathname = usePathname();
  
  const handleBack = () => {
    console.log('HeaderBackButton pressed, pathname:', pathname);
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        // Fallback: navigate to home
        router.replace('/');
      }
    } catch (error) {
      console.log('Back navigation error, going to home:', error);
      router.replace('/');
    }
  };
  
  return (
    <TouchableOpacity 
      onPress={handleBack} 
      style={{ marginLeft: 10, padding: 8, minWidth: 44, minHeight: 44, justifyContent: 'center' }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
          name="capture" 
          options={{ 
            title: 'New Session',
            headerBackTitle: 'Back',
            headerLeft: () => <HeaderBackButton />,
          }} 
        />
        <Stack.Screen 
          name="alignment" 
          options={{ 
            title: 'Target Detection',
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
      </Stack>
    </>
  );
}
