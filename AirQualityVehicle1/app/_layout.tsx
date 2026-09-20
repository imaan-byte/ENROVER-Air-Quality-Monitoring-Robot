import { Stack } from 'expo-router';
import { BluetoothProvider } from './BluetoothContext';

export default function RootLayout() {
  return (
    <BluetoothProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </BluetoothProvider>
  );
}