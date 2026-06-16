import { apiClient } from './client';
import { getMe } from './user.api';
import type { ProfilePictureAsset, ProfileUpdatePayload } from '../types/profile';
import type { User } from '../types/user';

export async function getProfile(): Promise<User> {
  return getMe();
}

export async function updateProfile(payload: ProfileUpdatePayload): Promise<User> {
  const { data } = await apiClient.patch<User>('/users/me/profile', payload);
  return data;
}

export async function uploadProfilePicture(asset: ProfilePictureAsset): Promise<User> {
  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    name: asset.fileName,
    type: asset.mimeType,
  } as unknown as Blob);

  const { data } = await apiClient.patch<User>('/users/me/profile-picture', formData, {
    headers: {
      Accept: 'application/json',
    },
    timeout: 90000,
  });

  return data;
}

export async function deleteProfilePicture(): Promise<User> {
  const { data } = await apiClient.delete<User>('/users/me/profile-picture');
  return data;
}
