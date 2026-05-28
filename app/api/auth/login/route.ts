import { db, initDb } from "@/lib/db";
import { hashPin, createSession, setSessionCookie } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  await initDb();
  const { username, pin } = await request.json();
  if (!username || !pin) {
    return Response.json({ error: "Username and PIN required" }, { status: 400 });
  }
  const pinHash = await hashPin(String(pin));
  const { rows } = await db.execute({
    sql: "SELECT id, username, role, active FROM users WHERE username = ? AND pin_hash = ?",
    args: [username, pinHash],
  });
  if (rows.length === 0) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const user = rows[0];
  if (!user.active) {
    return Response.json({ error: "Account disabled" }, { status: 403 });
  }
  const token = await createSession({
    id: user.id as number,
    username: user.username as string,
    role: user.role as "admin" | "cashier",
    active: Boolean(user.active),
    created_at: "",
  });
  await setSessionCookie(token);
  return Response.json({ user: { id: user.id, username: user.username, role: user.role } });
}
