import { db, initDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET() {
  await initDb();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await db.execute("SELECT key, value FROM settings");
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key as string] = row.value as string;
  }
  return Response.json({ settings });
}

export async function PUT(request: NextRequest) {
  await initDb();
  const session = await getSession();
  if (!session || session.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  const updates = await request.json() as Record<string, string>;
  for (const [key, value] of Object.entries(updates)) {
    await db.execute({
      sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      args: [key, String(value)],
    });
  }
  return Response.json({ success: true });
}
