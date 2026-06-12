import { Alert, StyleSheet, Text, View } from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import {

  PROFILE_PICTURE_MAX_MB,

  PROFILE_PICTURE_MIME_TYPES,

  type ProfilePictureAsset,

} from '../../types/profile';

import { AppButton } from '../ui/AppButton';

import { AppCard } from '../ui/AppCard';

import { colors, spacing } from '../../constants/theme';



interface ProfilePicturePickerProps {

  loading?: boolean;

  removing?: boolean;

  hasPicture?: boolean;

  onPick: (asset: ProfilePictureAsset) => void;

  onRemove?: () => void;

}



function validateAsset(asset: ImagePicker.ImagePickerAsset): string | null {
  const mimeType = (asset.mimeType ?? 'image/jpeg').toLowerCase();

  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    return 'HEIC photos are not supported. Choose a JPEG or PNG image, or re-select with editing enabled.';
  }

  if (!PROFILE_PICTURE_MIME_TYPES.includes(mimeType as (typeof PROFILE_PICTURE_MIME_TYPES)[number])) {

    return 'Please select a JPEG, PNG, or WebP image.';

  }

  if (asset.fileSize && asset.fileSize > PROFILE_PICTURE_MAX_MB * 1024 * 1024) {

    return `Image must be ${PROFILE_PICTURE_MAX_MB} MB or smaller.`;

  }

  return null;

}



function buildAsset(result: ImagePicker.ImagePickerAsset): ProfilePictureAsset {

  const extension = result.mimeType?.includes('png')

    ? 'png'

    : result.mimeType?.includes('webp')

      ? 'webp'

      : 'jpg';



  return {

    uri: result.uri,

    fileName: result.fileName ?? `profile.${extension}`,

    mimeType: result.mimeType ?? 'image/jpeg',

  };

}



export function ProfilePicturePicker({

  loading = false,

  removing = false,

  hasPicture = false,

  onPick,

  onRemove,

}: ProfilePicturePickerProps) {

  const busy = loading || removing;



  const pickImage = async () => {

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {

      Alert.alert(

        'Permission required',

        'Allow photo library access to upload a profile picture.'

      );

      return;

    }



    const result = await ImagePicker.launchImageLibraryAsync({

      mediaTypes: ['images'],

      allowsEditing: true,

      aspect: [1, 1],

      quality: 0.85,

    });



    if (result.canceled || !result.assets?.length) return;



    const asset = result.assets[0];

    const validationError = validateAsset(asset);

    if (validationError) {

      Alert.alert('Invalid image', validationError);

      return;

    }



    onPick(buildAsset(asset));

  };



  const confirmRemove = () => {

    Alert.alert('Remove profile picture', 'Are you sure you want to remove your profile picture?', [

      { text: 'Cancel', style: 'cancel' },

      { text: 'Remove', style: 'destructive', onPress: () => onRemove?.() },

    ]);

  };



  return (

    <AppCard>

      <Text style={styles.title}>Profile Picture</Text>

      <Text style={styles.helper}>JPEG, PNG, or WebP up to {PROFILE_PICTURE_MAX_MB} MB.</Text>

      <View style={styles.actions}>

        <AppButton

          title={loading ? 'Uploading...' : 'Upload Profile Picture'}

          variant="secondary"

          loading={loading}

          disabled={busy}

          onPress={() => void pickImage()}

          style={styles.actionButton}

        />

        {hasPicture && onRemove ? (

          <AppButton

            title="Remove"

            variant="ghost"

            loading={removing}

            disabled={busy}

            onPress={confirmRemove}

            style={styles.actionButton}

          />

        ) : null}

      </View>

    </AppCard>

  );

}



const styles = StyleSheet.create({

  title: {

    fontSize: 16,

    fontWeight: '700',

    color: colors.text,

    marginBottom: spacing.xs,

  },

  helper: {

    fontSize: 13,

    color: colors.mutedText,

    marginBottom: spacing.md,

  },

  actions: {

    gap: spacing.xs,

  },

  actionButton: {

    width: '100%',

  },

});

