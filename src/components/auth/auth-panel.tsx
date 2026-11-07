"use client";

import Link from "next/link";
import { useState } from "react";
import { DemoAccountPicker } from "@/components/auth/demo-account-picker";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AuthPanel({
  defaultTab = "masuk",
  variant = "card",
}: {
  defaultTab?: string;
  variant?: "card" | "inline";
}) {
  const [tab, setTab] = useState<"masuk" | "daftar">(
    defaultTab === "daftar" ? "daftar" : "masuk",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const compact = variant === "inline";

  return (
    <div className={compact ? "flex flex-col gap-4" : "flex flex-col gap-5"}>
      <Tabs
        value={tab}
        onValueChange={(value) =>
          setTab(value === "daftar" ? "daftar" : "masuk")
        }
      >
        <TabsList className="w-full">
          <TabsTrigger value="masuk">Masuk</TabsTrigger>
          <TabsTrigger value="daftar">Daftar</TabsTrigger>
        </TabsList>

        <TabsContent value="masuk" className="mt-4">
          <LoginForm initialEmail={email} initialPassword={password} />
        </TabsContent>

        <TabsContent value="daftar" className="mt-4">
          <RegisterForm initialEmail={email} />
        </TabsContent>
      </Tabs>

      <DemoAccountPicker
        variant={variant}
        onFill={(nextEmail, nextPassword) => {
          setEmail(nextEmail);
          setPassword(nextPassword);
        }}
      />

      <p
        className={
          compact
            ? "text-center text-dim text-xs"
            : "text-center text-dim text-sm"
        }
      >
        {tab === "masuk" ? (
          <>
            Belum punya akun?{" "}
            <button
              type="button"
              onClick={() => setTab("daftar")}
              className="font-medium text-brand-strong underline-offset-4 hover:underline"
            >
              Daftar akun demo
            </button>
          </>
        ) : (
          <>
            Sudah punya akun?{" "}
            <button
              type="button"
              onClick={() => setTab("masuk")}
              className="font-medium text-brand-strong underline-offset-4 hover:underline"
            >
              Masuk
            </button>
          </>
        )}
      </p>

      <p
        className={
          compact ? "text-dim text-[11px] leading-snug" : "text-dim text-xs"
        }
      >
        Tidak ingin masuk?{" "}
        <Link
          href="/companion"
          className="text-brand-strong underline-offset-4 hover:underline"
        >
          Periksa pesan tanpa akun
        </Link>
        .
      </p>
    </div>
  );
}
