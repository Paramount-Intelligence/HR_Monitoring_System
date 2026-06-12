import { Redirect } from 'expo-router';

export default function ManageLeavesScreen() {
  return <Redirect href={{ pathname: '/manage/approvals', params: { filter: 'leave' } }} />;
}
