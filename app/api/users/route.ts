import { db } from "@/lib/db";
import { getSession, hashPin } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { rows } = await db.execute(
    "SELECT id, username, role, active, created_at FROM users ORDER BY username ASC"
  );
  return Response.json({ users: rows });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { username, pin, role } = await request.json();
  if (!username || !pin) return Response.json({ error: "Username and PIN required" }, { status: 400 });
  const pinHash = await hashPin(String(pin));
  try {
    const { rows } = await db.execute({
      sql: "INSERT INTO users (username, pin_hash, role) VALUES (?, ?, ?) RETURNING id, username, role, active, created_at",
      args: [username, pinHash, role ?? "cashier"],
    });
    return Response.json({ user: rows[0] }, { status: 201 });
  } catch {
    return Response.json({ error: "Username already exists" }, { status: 409 });
  }
}
