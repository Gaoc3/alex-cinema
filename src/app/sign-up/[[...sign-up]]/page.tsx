import AuthPageShell from "@/components/auth/AuthPageShell";
import CustomAuthCard from "@/components/auth/CustomAuthCard";
import { getAuthUser } from "@/lib/getAuthUser";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SignUpPage() {
  const user = await getAuthUser();
  if (user) redirect("/home");

  return (
    <AuthPageShell mode="sign-up">
      <CustomAuthCard mode="sign-up" />
    </AuthPageShell>
  );
}
