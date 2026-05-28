import { db, initDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { rows } = await db.execute({
    sql: "SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?",
    args: [Number(id)],
  });
  if (rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ product: rows[0] });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const session = await getSession();
  if (!session || session.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await request.json();
  const { name, category_id, image_url, thumbnail_url, sale_price_usd, cost_price_usd, status } = body;
  const { rows } = await db.execute({
    sql: "UPDATE products SET name=?, category_id=?, image_url=?, thumbnail_url=?, sale_price_usd=?, cost_price_usd=?, status=? WHERE id=? RETURNING *",
    args: [name, category_id ?? null, image_url ?? null, thumbnail_url ?? null, Number(sale_price_usd), Number(cost_price_usd ?? 0), status ?? "active", Number(id)],
  });
  if (rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ product: rows[0] });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const session = await getSession();
  if (!session || session.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await db.execute({ sql: "DELETE FROM products WHERE id = ?", args: [Number(id)] });
  return Response.json({ success: true });
}
