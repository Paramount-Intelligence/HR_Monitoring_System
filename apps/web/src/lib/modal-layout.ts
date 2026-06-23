import { cn } from '@/lib/utils';

/** Standard modal width tokens */
export const modalSizeSm = 'sm:max-w-md';
export const modalSizeMd = 'sm:max-w-lg';
export const modalSizeLg = 'sm:max-w-xl';
export const modalSizeXl = 'sm:max-w-2xl';

/** Vertical rhythm inside modal forms */
export const modalFormClass = 'space-y-5';
export const modalFormGridClass = 'grid grid-cols-1 md:grid-cols-2 gap-4';
export const modalFormFieldClass = 'space-y-2';

export function modalContentClass(extra?: string) {
  return cn(
    'w-[calc(100vw-2rem)] max-h-[85vh] overflow-hidden rounded-2xl',
    extra
  );
}
