"use client";

import { Eye, EyeOff, Loader2, LogIn, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type AuthResult, login, loginDemo } from "@/lib/auth/actions";

const fieldShell =
  "rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-brand/70 focus-within:bg-brand-soft/40";

export function LoginForm({
  initialEmail = "",
  initialPassword = "",
  demo = false,
}: {
  initialEmail?: string;
  initialPassword?: string;
  demo?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    AuthResult | undefined,
    FormData
  >(login, undefined);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [demoPending, startDemo] = useTransition();
  const [demoError, setDemoError] = useState<string>();

  useEffect(() => {
    setEmail(initialEmail);
    setPassword(initialPassword);
  }, [initialEmail, initialPassword]);

  useEffect(() => {
    if (!state?.ok || !state.account) return;
    router.push("/companion");
    router.refresh();
  }, [state, router]);

  function handleDemo() {
    setDemoError(undefined);
    startDemo(async () => {
      const result = await loginDemo();
      if (result.ok && result.account) {
        router.push("/companion");
        router.refresh();
        return;
      }
      setDemoError(result.error ?? "Akun demo sedang tidak tersedia.");
    });
  }

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
              maxLength={254}
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
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password akunmu"
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
              className="absolute top-1/2 right-1 size-11 -translate-y-1/2 rounded-full text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
              {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            </Button>
          </div>
        </Field>

        {state?.error ? (
          <Alert role="alert" variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="h-12 w-full rounded-full bg-brand font-medium text-bg transition-colors hover:bg-brand/90"
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

        {demo ? (
          <>
            {demoError ? (
              <Alert role="alert" variant="destructive">
                <AlertDescription>{demoError}</AlertDescription>
              </Alert>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={demoPending}
              onClick={handleDemo}
              className="h-12 w-full rounded-full"
            >
              {demoPending ? (
                <Loader2
                  data-icon="inline-start"
                  aria-hidden
                  className="animate-spin"
                />
              ) : (
                <Sparkles data-icon="inline-start" aria-hidden />
              )}
              {demoPending ? "Menyiapkan akun demo…" : "Masuk dengan akun demo"}
            </Button>
          </>
        ) : null}
      </FieldGroup>
    </form>
  );
}
