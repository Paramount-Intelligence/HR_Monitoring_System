import { Redirect } from 'expo-router';

export default function ManageCorrectionsScreen() {
  return <Redirect href={{ pathname: '/manage/approvals', params: { filter: 'correction' } }} />;
}
