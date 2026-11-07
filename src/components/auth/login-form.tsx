"use client";

import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
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
import { seedProgress } from "@/lib/progress";

const fieldShell =
  "rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-brand/70 focus-within:bg-brand-soft/40";

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
  const [showPassword, setShowPassword] = useState(false);

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
      <FieldGroup className="gap-4">
        <Field className="gap-2">
          <FieldLabel htmlFor="email" className="text-muted-foreground">
            Email
          </FieldLabel>
          <div className={fieldShell}>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@contoh.id"
              className="h-12 rounded-2xl border-0 bg-transparent px-4 text-base focus-visible:ring-0"
            />
          </div>
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="password" className="text-muted-foreground">
            Password
          </FieldLabel>
          <div className={`relative ${fieldShell}`}>
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="minimal 8 karakter"
              className="h-12 rounded-2xl border-0 bg-transparent px-4 pr-12 text-base focus-visible:ring-0"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={
                showPassword ? "Sembunyikan password" : "Tampilkan password"
              }
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-xl text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
              {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            </Button>
          </div>
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
          className="h-12 w-full rounded-2xl bg-brand font-medium text-bg transition-colors hover:bg-brand/90"
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
