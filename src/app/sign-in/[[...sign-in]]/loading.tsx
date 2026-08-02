import React from 'react';
import AuthPageShell from '@/components/auth/AuthPageShell';
import AuthCardSkeleton from '@/components/skeleton/AuthCardSkeleton';

export default function SignInLoading() {
  return (
    <AuthPageShell mode="sign-in">
      <AuthCardSkeleton mode="sign-in" />
    </AuthPageShell>
  );
}
