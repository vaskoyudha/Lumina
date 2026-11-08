"use client";

import Link from "next/link";
import { useState } from "react";
import { GoogleButton } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AuthPanel({
  defaultTab = "masuk",
  variant = "card",
  mode,
  demo = false,
}: {
  defaultTab?: string;
  variant?: "card" | "inline";
  mode?: "masuk" | "daftar";
  demo?: boolean;
}) {
  const [tab, setTab] = useState<"masuk" | "daftar">(
    defaultTab === "daftar" ? "daftar" : "masuk",
  );
  const activeTab = mode || tab;
  const content = (intent: "masuk" | "daftar") => (
    <div className="flex flex-col gap-5">
      <GoogleButton intent={intent} />
      {intent === "masuk" ? <LoginForm demo={demo} /> : <RegisterForm />}
    </div>
  );

  return (
    <div
      className={
        variant === "inline" ? "flex flex-col gap-4" : "flex flex-col gap-5"
      }
    >
      {mode ? (
        content(mode)
      ) : (
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
            {content("masuk")}
          </TabsContent>
          <TabsContent value="daftar" className="mt-4">
            {content("daftar")}
          </TabsContent>
        </Tabs>
      )}
      <p className="text-center text-dim text-sm">
        {activeTab === "masuk" ? "Belum punya akun? " : "Sudah punya akun? "}
        {mode ? (
          <Link
            href={mode === "masuk" ? "/daftar" : "/masuk"}
            className="font-medium text-brand-strong hover:underline"
          >
            {mode === "masuk" ? "Daftar" : "Masuk"}
          </Link>
        ) : (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-brand-strong"
            onClick={() => setTab(tab === "masuk" ? "daftar" : "masuk")}
          >
            {tab === "masuk" ? "Daftar" : "Masuk"}
          </Button>
        )}
      </p>
      <p className="text-center text-dim text-xs">
        <Link href="/companion" className="underline-offset-4 hover:underline">
          Lanjut tanpa akun
        </Link>
        {" · "}
        <Link href="/darurat" className="underline-offset-4 hover:underline">
          Bantuan darurat
        </Link>
      </p>
    </div>
  );
}
