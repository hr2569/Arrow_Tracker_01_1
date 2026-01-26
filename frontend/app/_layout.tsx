import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function HeaderBackButton() {
  const router = useRouter();
  return (
    <TouchableOpacity 
      onPress={() => router.back()} 
      style={{ marginLeft: 10, padding: 8 }}
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
