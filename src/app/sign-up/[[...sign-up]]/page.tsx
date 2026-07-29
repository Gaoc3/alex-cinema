import AuthPageShell from "@/components/auth/AuthPageShell";
import CustomAuthCard from "@/components/auth/CustomAuthCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SignUpPage() {
  return (
    <AuthPageShell mode="sign-up">
      <CustomAuthCard mode="sign-up" />
    </AuthPageShell>
  );
}
