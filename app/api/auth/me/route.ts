import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { rows } = await db.execute({
    sql: "SELECT id, username, role, active FROM users WHERE id = ?",
    args: [session.id],
  });
  if (rows.length === 0) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }
  return Response.json({ user: rows[0] });
}
