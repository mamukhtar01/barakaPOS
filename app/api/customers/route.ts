import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const search = new URL(request.url).searchParams.get("search");
  let sql = "SELECT * FROM customers WHERE 1=1";
  const args: string[] = [];
  if (search) {
    sql += " AND (name LIKE ? OR phone LIKE ?)";
    args.push(`%${search}%`, `%${search}%`);
  }
  sql += " ORDER BY name ASC";
  const { rows } = await db.execute({ sql, args });
  return Response.json({ customers: rows });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { name, phone } = await request.json();
  if (!name) return Response.json({ error: "Name required" }, { status: 400 });
  const { rows } = await db.execute({
    sql: "INSERT INTO customers (name, phone) VALUES (?, ?) RETURNING *",
    args: [name, phone ?? null],
  });
  return Response.json({ customer: rows[0] }, { status: 201 });
}
