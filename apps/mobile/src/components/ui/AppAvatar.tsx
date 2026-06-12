import { Image, StyleSheet, Text, View, type ImageStyle, type ViewStyle } from 'react-native';
import { colors, radii } from '../../constants/theme';
import { getInitials } from '../../utils/format';

interface AppAvatarProps {
  name?: string | null;
  imageUrl?: string | null;
  size?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

export function AppAvatar({
  name,
  imageUrl,
  size = 48,
  style,
  imageStyle,
}: AppAvatarProps) {
  const radius = size / 2;
  const sizeStyle = { width: size, height: size, borderRadius: radius };

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, sizeStyle, imageStyle]}
      />
    );
  }

  return (
    <View style={[styles.fallback, sizeStyle, style]}>
      <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.overlay,
  },
  fallback: {
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.primary,
    fontWeight: '800',
  },
});
