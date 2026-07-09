import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { loadModel } from '@/lib/inference';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    loadModel()
      .catch((e) => console.warn('Model load failed:', e))
      .finally(() => SplashScreen.hideAsync());
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="result"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
