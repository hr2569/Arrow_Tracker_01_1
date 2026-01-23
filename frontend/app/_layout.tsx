import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

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
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Archery Scorer',
            headerShown: true 
          }} 
        />
        <Stack.Screen 
          name="sessionType" 
          options={{ 
            title: 'New Session',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="capture" 
          options={{ 
            title: 'New Session',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="alignment" 
          options={{ 
            title: 'Target Detection',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="scoring" 
          options={{ 
            title: 'Score Arrows',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="summary" 
          options={{ 
            title: 'Round Summary',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="history" 
          options={{ 
            title: 'Score History',
            headerBackTitle: 'Back'
          }} 
        />
      </Stack>
    </>
  );
}
