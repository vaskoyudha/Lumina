"use client";

import { Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
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
import { saveProfile, seedProgress } from "@/lib/auth/local-profile";

export function RegisterForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    AuthResult | undefined,
    FormData
  >(register, undefined);

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
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="nama">Nama</FieldLabel>
          <Input
            id="nama"
            name="nama"
            autoComplete="name"
            required
            placeholder="Nama panggilan"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="email-baru">Email</FieldLabel>
          <Input
            id="email-baru"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="nama@contoh.id"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password-baru">Password</FieldLabel>
          <Input
            id="password-baru"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="minimal 8 karakter"
          />
          <FieldDescription>
            Tidak ada email verifikasi. Tidak ada reset password.
          </FieldDescription>
        </Field>
        <Field orientation="horizontal">
          <Checkbox id="consent" name="consent" />
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
          className="h-11 w-full bg-safe text-bg hover:bg-safe/90"
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
