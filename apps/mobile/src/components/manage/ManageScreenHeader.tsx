import { useRouter } from 'expo-router';
import { BrandHeader } from '../brand/BrandHeader';

interface ManageScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
}

export function ManageScreenHeader({
  title,
  subtitle,
  showBack = true,
}: ManageScreenHeaderProps) {
  const router = useRouter();

  return (
    <BrandHeader
      title={title}
      subtitle={subtitle}
      centerTitle
      onBack={showBack ? () => router.back() : undefined}
    />
  );
}
