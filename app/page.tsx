import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { initDb } from "@/lib/db";

export default async function Home() {
  await initDb();
  const session = await getSession();
  if (!session) redirect("/login");
  redirect("/pos");
}
