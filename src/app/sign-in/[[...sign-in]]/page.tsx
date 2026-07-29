import AuthPageShell from "@/components/auth/AuthPageShell";
import CustomAuthCard from "@/components/auth/CustomAuthCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SignInPage() {
  return (
    <AuthPageShell mode="sign-in">
      <CustomAuthCard mode="sign-in" />
    </AuthPageShell>
  );
}
