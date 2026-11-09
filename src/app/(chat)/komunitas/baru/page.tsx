import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ContentLoading } from "@/components/belajar/content-state";
import { PostEditor } from "@/components/community/community-editor";
import { CommunityRules } from "@/components/community/community-view";
import { WorkspaceShell } from "@/components/shell/workspace-shell";
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
    <WorkspaceShell label="Komunitas" aside={<CommunityRules />}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-8">
        <Button asChild variant="ghost" className="min-h-11 w-fit px-0">
          <Link href="/komunitas">
            <ArrowLeft aria-hidden />
            Semua diskusi
          </Link>
        </Button>
        <Card className="rounded-card">
          <CardHeader>
            <CardTitle>
              <h1 className="text-2xl font-medium">Mulai diskusi</h1>
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
    </WorkspaceShell>
  );
}
