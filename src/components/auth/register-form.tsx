"use client";

import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type AuthResult, register } from "@/lib/auth/actions";
import { saveProfile } from "@/lib/auth/local-profile";
import { seedProgress } from "@/lib/progress";

const fieldShell =
  "rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-brand/70 focus-within:bg-brand-soft/40";

export function RegisterForm({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    AuthResult | undefined,
    FormData
  >(register, undefined);
  const [email, setEmail] = useState(initialEmail);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (!state?.ok || !state.account) return;
    saveProfile({
      email: state.account.email,
      nama: state.account.nama,
      createdAt: new Date().toISOString(),
    });
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
          <FieldLabel htmlFor="nama" className="text-muted-foreground">
            Nama
          </FieldLabel>
          <div className={fieldShell}>
            <Input
              id="nama"
              name="nama"
              autoComplete="name"
              required
              placeholder="Nama panggilan"
              className="h-12 rounded-2xl border-0 bg-transparent px-4 text-base focus-visible:ring-0"
            />
          </div>
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="email-baru" className="text-muted-foreground">
            Email
          </FieldLabel>
          <div className={fieldShell}>
            <Input
              id="email-baru"
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
          <FieldLabel htmlFor="password-baru" className="text-muted-foreground">
            Password
          </FieldLabel>
          <div className={`relative ${fieldShell}`}>
            <Input
              id="password-baru"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
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
            Tidak ada email verifikasi. Tidak ada reset password.
          </FieldDescription>
        </Field>

        <Field orientation="horizontal" className="items-start">
          <Checkbox id="consent" name="consent" className="mt-0.5" />
          <FieldLabel htmlFor="consent" className="font-normal leading-snug">
            Saya paham profil dan progres hanya tersimpan di perangkat ini. Saat
            mendaftar, yang dikirim ke server hanya sesi masuk demo. Pertanyaan
            di companion dikirim ke model untuk dijawab; pesan yang saya periksa
            tidak pernah ikut.
          </FieldLabel>
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
            <UserPlus data-icon="inline-start" aria-hidden />
          )}
          {pending ? "Membuat profil…" : "Buat akun demo"}
        </Button>
      </FieldGroup>
    </form>
  );
}
