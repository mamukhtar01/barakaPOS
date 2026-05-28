import { db, initDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  await initDb();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("category_id");
  const status = searchParams.get("status") ?? "active";
  const search = searchParams.get("search");

  let sql =
    "SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1";
  const args: (string | number)[] = [];

  if (status !== "all") {
    sql += " AND p.status = ?";
    args.push(status);
  }
  if (categoryId) {
    sql += " AND p.category_id = ?";
    args.push(Number(categoryId));
  }
  if (search) {
    sql += " AND p.name LIKE ?";
    args.push(`%${search}%`);
  }
  sql += " ORDER BY p.name ASC";

  const { rows } = await db.execute({ sql, args });
  return Response.json({ products: rows });
}

export async function POST(request: NextRequest) {
  await initDb();
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const { name, category_id, img, image_url, thumbnail_url, sale_price_usd, cost_price_usd, status } = body;
  const productImage = img ?? image_url ?? null;
  if (!name || sale_price_usd == null) {
    return Response.json({ error: "Name and sale price required" }, { status: 400 });
  }
  const { rows } = await db.execute({
    sql: "INSERT INTO products (name, category_id, img, image_url, thumbnail_url, sale_price_usd, cost_price_usd, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *",
    args: [
      name,
      category_id ?? null,
      productImage,
      productImage,
      thumbnail_url ?? null,
      Number(sale_price_usd),
      Number(cost_price_usd ?? 0),
      status ?? "active",
    ],
  });
  return Response.json({ product: { id: rows[0].id } }, { status: 201 });
}
