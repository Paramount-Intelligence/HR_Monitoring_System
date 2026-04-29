import { Suspense } from 'react';
import ActivateAccountContent from './ActivateAccountContent';

export default function ActivateAccountPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ActivateAccountContent />
    </Suspense>
  );
}
