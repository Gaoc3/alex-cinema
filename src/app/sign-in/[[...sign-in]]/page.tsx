import AuthPageShell from "@/components/auth/AuthPageShell";
import CustomAuthCard from "@/components/auth/CustomAuthCard";
import { getAuthUser } from "@/lib/getAuthUser";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const resolvedParams = await searchParams;
  const redirectUrl = resolvedParams.redirect_url && resolvedParams.redirect_url.startsWith('/')
    ? resolvedParams.redirect_url
    : '/home';

  const user = await getAuthUser();
  if (user) redirect(redirectUrl);

  return (
    <AuthPageShell mode="sign-in">
      <CustomAuthCard mode="sign-in" redirectUrl={redirectUrl} />
    </AuthPageShell>
  );
}
