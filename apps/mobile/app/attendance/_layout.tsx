import { Stack } from 'expo-router';

export default function AttendanceStackLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
