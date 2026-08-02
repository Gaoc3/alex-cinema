import React from 'react';
import AuthPageShell from '@/components/auth/AuthPageShell';
import AuthCardSkeleton from '@/components/skeleton/AuthCardSkeleton';

export default function SignUpLoading() {
  return (
    <AuthPageShell mode="sign-up">
      <AuthCardSkeleton mode="sign-up" />
    </AuthPageShell>
  );
}
