import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
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
          name="capture" 
          options={{ 
            title: 'Capture Target',
            presentation: 'modal' 
          }} 
        />
        <Stack.Screen 
          name="alignment" 
          options={{ 
            title: 'Align Target' 
          }} 
        />
        <Stack.Screen 
          name="scoring" 
          options={{ 
            title: 'Score Arrows' 
          }} 
        />
        <Stack.Screen 
          name="summary" 
          options={{ 
            title: 'Round Summary' 
          }} 
        />
        <Stack.Screen 
          name="history" 
          options={{ 
            title: 'Score History' 
          }} 
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
