import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Root 404. It lives outside the route groups, so it renders on the token
 * ground from `RootLayout` with no nav; a lost user gets one clear way back and
 * the community is one click away.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={1} className="text-2xl">
            Halaman tidak ditemukan
          </CardTitle>
          <CardDescription>
            Alamat ini tidak ada di Lumina. Kamu bisa kembali ke beranda atau
            membaca diskusi komunitas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-dim">
            Periksa kembali tautannya, atau mulai dari salah satu halaman di
            bawah.
          </p>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3">
          <Button asChild className="min-h-11">
            <Link href="/" data-pressable>
              Kembali ke beranda
            </Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/komunitas" data-pressable>
              Buka komunitas
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
