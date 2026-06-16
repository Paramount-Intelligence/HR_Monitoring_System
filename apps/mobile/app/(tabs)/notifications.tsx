import { Redirect } from 'expo-router';

/** Legacy tab route — redirects to the secondary alerts center. */
export default function NotificationsScreen() {
  return <Redirect href="/alerts" />;
}
