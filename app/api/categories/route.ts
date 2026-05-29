import { db, initDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET() {
  await initDb();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await db.execute("SELECT * FROM categories ORDER BY name ASC");
  return Response.json({ categories: rows }, {
    headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=3600" },
  });
}

export async function POST(request: NextRequest) {
  await initDb();
  const session = await getSession();
  if (!session || session.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { name, color } = await request.json();
  if (!name) return Response.json({ error: "Name required" }, { status: 400 });
  const { rows } = await db.execute({
    sql: "INSERT INTO categories (name, color) VALUES (?, ?) RETURNING *",
    args: [name, color ?? "#1677ff"],
  });
  return Response.json({ category: rows[0] }, { status: 201 });
}
