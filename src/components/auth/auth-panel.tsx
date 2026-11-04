"use client";

import Link from "next/link";
import { useState } from "react";
import { DemoAccountPicker } from "@/components/auth/demo-account-picker";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AuthPanel({ defaultTab = "masuk" }: { defaultTab?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex flex-col gap-5">
      <Tabs defaultValue={defaultTab === "daftar" ? "daftar" : "masuk"}>
        <TabsList className="w-full">
          <TabsTrigger value="masuk">Masuk</TabsTrigger>
          <TabsTrigger value="daftar">Daftar</TabsTrigger>
        </TabsList>

        <TabsContent value="masuk" className="mt-5">
          <LoginForm initialEmail={email} initialPassword={password} />
        </TabsContent>

        <TabsContent value="daftar" className="mt-5">
          <RegisterForm />
        </TabsContent>
      </Tabs>

      <DemoAccountPicker
        onFill={(nextEmail, nextPassword) => {
          setEmail(nextEmail);
          setPassword(nextPassword);
        }}
      />

      <p className="text-dim text-xs">
        Tidak ingin masuk?{" "}
        <Link
          href="/companion"
          className="text-safe underline-offset-4 hover:underline"
        >
          Periksa pesan tanpa akun
        </Link>
        .
      </p>
    </div>
  );
}
