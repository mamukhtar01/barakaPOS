import { db, initDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  await initDb();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 20);
  const offset = Number(searchParams.get("offset") ?? 0);
  const { rows } = await db.execute({
    sql: `SELECT s.*, c.name as customer_name, u.username as cashier_name
          FROM sales s
          LEFT JOIN customers c ON s.customer_id = c.id
          LEFT JOIN users u ON s.cashier_id = u.id
          ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
    args: [limit, offset],
  });
  const countResult = await db.execute("SELECT COUNT(*) as total FROM sales");
  return Response.json({ sales: rows, total: countResult.rows[0].total });
}

export async function POST(request: NextRequest) {
  await initDb();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { customer_id, currency, exchange_rate, payment_method, items, discount, notes } = body;

  if (!items || items.length === 0) {
    return Response.json({ error: "No items in sale" }, { status: 400 });
  }

  const rate = Number(exchange_rate ?? 1);
  let total_usd = 0;

  for (const item of items) {
    total_usd += Number(item.unit_price_usd) * Number(item.quantity);
  }

  const disc = Number(discount ?? 0);
  const final_usd = total_usd - disc;
  const final_sos = final_usd * rate;

  const saleResult = await db.execute({
    sql: `INSERT INTO sales (customer_id, cashier_id, currency, exchange_rate, payment_method, total_usd, total_sos, discount, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    args: [
      customer_id ?? null,
      session.id,
      currency ?? "USD",
      rate,
      payment_method ?? "cash",
      final_usd,
      final_sos,
      disc,
      notes ?? null,
    ],
  });

  const sale = saleResult.rows[0];

  for (const item of items) {
    const unitUsd = Number(item.unit_price_usd);
    const unitSos = unitUsd * rate;
    const qty = Number(item.quantity);
    await db.execute({
      sql: `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price_usd, unit_price_sos, subtotal_usd, subtotal_sos)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        sale.id as number,
        item.product_id ?? null,
        item.product_name,
        qty,
        unitUsd,
        unitSos,
        unitUsd * qty,
        unitSos * qty,
      ],
    });
  }

  const { rows: saleRows } = await db.execute({
    sql: `SELECT s.*, c.name as customer_name, u.username as cashier_name
          FROM sales s
          LEFT JOIN customers c ON s.customer_id = c.id
          LEFT JOIN users u ON s.cashier_id = u.id
          WHERE s.id = ?`,
    args: [sale.id as number],
  });

  const { rows: itemRows } = await db.execute({
    sql: "SELECT * FROM sale_items WHERE sale_id = ?",
    args: [sale.id as number],
  });

  return Response.json({ sale: { ...saleRows[0], items: itemRows } }, { status: 201 });
}
