import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { rows: saleRows } = await db.execute({
    sql: `SELECT s.*, c.name as customer_name, u.username as cashier_name
          FROM sales s
          LEFT JOIN customers c ON s.customer_id = c.id
          LEFT JOIN users u ON s.cashier_id = u.id
          WHERE s.id = ?`,
    args: [Number(id)],
  });
  if (saleRows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
  const { rows: itemRows } = await db.execute({
    sql: "SELECT * FROM sale_items WHERE sale_id = ?",
    args: [Number(id)],
  });
  return Response.json({ sale: { ...saleRows[0], items: itemRows } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { payment_status } = body;
  if (payment_status !== "paid" && payment_status !== "unpaid") {
    return Response.json({ error: "Invalid payment status" }, { status: 400 });
  }

  const { id } = await params;
  const { rows } = await db.execute({
    sql: "UPDATE sales SET payment_status = ? WHERE id = ? RETURNING id",
    args: [payment_status, Number(id)],
  });

  if (rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ success: true });
}
