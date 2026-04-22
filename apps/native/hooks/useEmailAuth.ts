import { useState } from "react";
import { useSignIn, useSignUp } from "@clerk/expo";
import { useRouter } from "expo-router";
import { AUTH_VERIFY_ROUTE } from "@/lib/auth/auth-routes";

export function useEmailAuth() {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async (email: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await signIn.create({ identifier: email });

      if (!res.error) {
        await signIn.emailCode.sendCode();
        router.push({
          pathname: AUTH_VERIFY_ROUTE,
          params: { email, flow: "signIn" },
        });
        return;
      }

      await signUp.create({ emailAddress: email });
      await signUp.verifications.sendEmailCode();

      router.push({
        pathname: AUTH_VERIFY_ROUTE,
        params: { email, flow: "signUp" },
      });
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return { sendCode, loading, error };
}
