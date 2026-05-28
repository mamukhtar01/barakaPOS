import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { name, phone } = await request.json();
  const { rows } = await db.execute({
    sql: "UPDATE customers SET name=?, phone=? WHERE id=? RETURNING *",
    args: [name, phone ?? null, Number(id)],
  });
  if (rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ customer: rows[0] });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await db.execute({ sql: "DELETE FROM customers WHERE id = ?", args: [Number(id)] });
  return Response.json({ success: true });
}
