import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ContentLoading } from "@/components/belajar/content-state";
import { PostEditor } from "@/components/community/community-editor";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/server-session";
export const metadata: Metadata = { title: "Mulai diskusi" };
export default function NewPostPage() {
  return (
    <Suspense fallback={<ContentLoading />}>
      <NewPostContent />
    </Suspense>
  );
}
async function NewPostContent() {
  const session = await getSession();
  return (
    <div className="flex w-full min-w-0 flex-col gap-3.5 pb-8">
      <header data-community-header>
        <Button asChild variant="ghost" className="min-h-11 w-fit px-3">
          <Link href="/komunitas">
            <ArrowLeft aria-hidden />
            Semua diskusi
          </Link>
        </Button>
      </header>
      <Card className="gap-4 rounded-card border border-line shadow-[var(--appnext-shadow-ambient)] ring-0">
        <CardHeader>
          <CardTitle>
            <h1 className="text-2xl font-semibold">Mulai diskusi</h1>
          </CardTitle>
          <CardDescription>
            Bagikan hal yang bisa membantu orang lain mengenali polanya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {session ? (
            <PostEditor />
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-dim">
                Masuk menggunakan akun Lumina untuk menerbitkan topik. Semua
                orang tetap bisa membaca diskusi.
              </p>
              <Button asChild className="min-h-11 w-fit rounded-full">
                <Link href="/masuk">Masuk untuk berdiskusi</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
