import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProfilView } from "@/components/profil/profil-view";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/auth/server-session";

export const metadata: Metadata = {
  title: "Profil",
  description:
    "Akun Lumina dan kemajuan belajar yang tersimpan di perangkat ini.",
};

/**
 * The session read sits in its own Suspense boundary so the shell prerenders
 * statically and only the personal block waits for the request.
 */
async function ProfilSession() {
  const session = await getSession();
  if (!session) redirect("/masuk");
  return (
    <ProfilView
      nama={session.nama}
      email={session.email}
      createdAt={session.created_at}
    />
  );
}

function ProfilSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <Skeleton className="h-10 w-28 rounded-full" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-52" />
        </div>
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export default function ProfilPage() {
  return (
    <Suspense fallback={<ProfilSkeleton />}>
      <ProfilSession />
    </Suspense>
  );
}
