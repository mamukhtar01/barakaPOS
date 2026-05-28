import { db } from "@/lib/db";
import { getSession, hashPin } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { username, pin, role, active } = await request.json();

  if (pin) {
    const pinHash = await hashPin(String(pin));
    const { rows } = await db.execute({
      sql: "UPDATE users SET username=?, pin_hash=?, role=?, active=? WHERE id=? RETURNING id, username, role, active",
      args: [username, pinHash, role ?? "cashier", active ? 1 : 0, Number(id)],
    });
    if (rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ user: rows[0] });
  }

  const { rows } = await db.execute({
    sql: "UPDATE users SET username=?, role=?, active=? WHERE id=? RETURNING id, username, role, active",
    args: [username, role ?? "cashier", active ? 1 : 0, Number(id)],
  });
  if (rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ user: rows[0] });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  // Don't allow deleting yourself
  if (Number(id) === session.id) {
    return Response.json({ error: "Cannot delete your own account" }, { status: 400 });
  }
  await db.execute({ sql: "DELETE FROM users WHERE id = ?", args: [Number(id)] });
  return Response.json({ success: true });
}
