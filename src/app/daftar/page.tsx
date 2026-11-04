import { redirect } from "next/navigation";

/** `/daftar` is a tab on `/masuk`; keep the URL working for anyone who types it. */
export default function DaftarPage() {
  redirect("/masuk?tab=daftar");
}
