import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { name, color } = await request.json();
  const { rows } = await db.execute({
    sql: "UPDATE categories SET name=?, color=? WHERE id=? RETURNING *",
    args: [name, color ?? "#1677ff", Number(id)],
  });
  if (rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ category: rows[0] });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await db.execute({ sql: "DELETE FROM categories WHERE id = ?", args: [Number(id)] });
  return Response.json({ success: true });
}
