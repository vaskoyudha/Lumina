"use client";

import { Loader2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type AuthResult, login } from "@/lib/auth/actions";
import { seedProgress } from "@/lib/auth/local-profile";

export function LoginForm({
  initialEmail = "",
  initialPassword = "",
}: {
  initialEmail?: string;
  initialPassword?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    AuthResult | undefined,
    FormData
  >(login, undefined);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);

  useEffect(() => {
    setEmail(initialEmail);
    setPassword(initialPassword);
  }, [initialEmail, initialPassword]);

  useEffect(() => {
    if (!state?.ok || !state.account) return;
    seedProgress({
      completedModules: state.account.seed.completedModules,
      badges: state.account.seed.badges,
      missedPatterns: [],
    });
    router.push("/companion");
  }, [state, router]);

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nama@contoh.id"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="minimal 8 karakter"
          />
          <FieldDescription>
            Akun demo memakai password <code>demo1234</code>.
          </FieldDescription>
        </Field>

        {state?.error ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full bg-safe text-bg hover:bg-safe/90"
        >
          {pending ? (
            <Loader2
              data-icon="inline-start"
              aria-hidden
              className="animate-spin"
            />
          ) : (
            <LogIn data-icon="inline-start" aria-hidden />
          )}
          {pending ? "Memeriksa…" : "Masuk"}
        </Button>
      </FieldGroup>
    </form>
  );
}
