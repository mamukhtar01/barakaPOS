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

  const { id } = await params;
  const saleId = Number(id);
  const body = await request.json();
  const { payment_status, is_done, items, notes } = body as {
    payment_status?: "paid" | "unpaid";
    is_done?: boolean;
    items?: Array<{
      product_id?: number | null;
      product_name: string;
      quantity: number;
      unit_price_usd: number;
    }>;
    notes?: string;
  };

  if (items !== undefined) {
    const { rows: saleRows } = await db.execute({
      sql: "SELECT id, payment_status, exchange_rate, discount FROM sales WHERE id = ?",
      args: [saleId],
    });

    if (saleRows.length === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const sale = saleRows[0];
    if ((sale.payment_status as string) !== "unpaid") {
      return Response.json({ error: "Only unpaid orders can be edited" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "At least one item is required" }, { status: 400 });
    }

    const normalizedItems = items.map((item) => ({
      product_id: item.product_id ?? null,
      product_name: String(item.product_name ?? "").trim(),
      quantity: Number(item.quantity),
      unit_price_usd: Number(item.unit_price_usd),
    }));

    if (
      normalizedItems.some(
        (item) => !item.product_name || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unit_price_usd) || item.unit_price_usd < 0
      )
    ) {
      return Response.json({ error: "Invalid item payload" }, { status: 400 });
    }

    let exchangeRate = Number(sale.exchange_rate);
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 1) {
      const settingsRate = await db.execute({
        sql: "SELECT value FROM settings WHERE key = 'exchange_rate' LIMIT 1",
      });
      const fallbackRate = Number(settingsRate.rows[0]?.value ?? 28000);
      exchangeRate = Number.isFinite(fallbackRate) && fallbackRate > 1 ? fallbackRate : 28000;
    }
    const discount = Number(sale.discount ?? 0);
    const subtotalUsd = normalizedItems.reduce(
      (sum, item) => sum + item.unit_price_usd * item.quantity,
      0
    );

    if (discount > subtotalUsd) {
      return Response.json({ error: "Discount exceeds order subtotal" }, { status: 400 });
    }

    const totalUsd = subtotalUsd - discount;
    const totalSos = totalUsd * exchangeRate;

    await db.execute({ sql: "DELETE FROM sale_items WHERE sale_id = ?", args: [saleId] });
    for (const item of normalizedItems) {
      const unitPriceSos = item.unit_price_usd * exchangeRate;
      await db.execute({
        sql: `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price_usd, unit_price_sos, subtotal_usd, subtotal_sos)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          saleId,
          item.product_id,
          item.product_name,
          item.quantity,
          item.unit_price_usd,
          unitPriceSos,
          item.unit_price_usd * item.quantity,
          unitPriceSos * item.quantity,
        ],
      });
    }

    await db.execute({
      sql: "UPDATE sales SET exchange_rate = ?, total_usd = ?, total_sos = ? WHERE id = ?",
      args: [exchangeRate, totalUsd, totalSos, saleId],
    });

    const { rows: updatedSaleRows } = await db.execute({
      sql: `SELECT s.*, c.name as customer_name, u.username as cashier_name
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN users u ON s.cashier_id = u.id
            WHERE s.id = ?`,
      args: [saleId],
    });

    const { rows: updatedItemRows } = await db.execute({
      sql: "SELECT * FROM sale_items WHERE sale_id = ?",
      args: [saleId],
    });

    return Response.json({ sale: { ...updatedSaleRows[0], items: updatedItemRows } });
  }

  const hasPaymentStatus = payment_status === "paid" || payment_status === "unpaid";
  const hasIsDone = typeof is_done === "boolean";
  const hasNotes = typeof notes === "string";

  if (!hasPaymentStatus && !hasIsDone && !hasNotes) {
    return Response.json(
      { error: "Invalid payload: provide payment_status, is_done and/or notes" },
      { status: 400 }
    );
  }

  const { rows: currentSaleRows } = await db.execute({
    sql: "SELECT id, payment_status, is_done, notes FROM sales WHERE id = ?",
    args: [saleId],
  });

  if (currentSaleRows.length === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const currentSale = currentSaleRows[0];
  const currentPaymentStatus =
    (currentSale.payment_status as "paid" | "unpaid") ?? "paid";
  const currentIsDone = Boolean(Number(currentSale.is_done ?? 0));
  const currentNotes = (currentSale.notes as string | null) ?? "";

  const nextPaymentStatus = hasPaymentStatus ? payment_status : currentPaymentStatus;
  const nextIsDone = hasIsDone ? is_done : currentIsDone;
  const nextNotes = hasNotes ? notes.trim() : currentNotes;

  if (nextIsDone && nextPaymentStatus !== "paid") {
    return Response.json(
      { error: "Only paid orders can be marked as done" },
      { status: 400 }
    );
  }

  const { rows } = await db.execute({
    sql: "UPDATE sales SET payment_status = ?, is_done = ?, notes = ? WHERE id = ? RETURNING id",
    args: [nextPaymentStatus, nextIsDone ? 1 : 0, nextNotes || null, saleId],
  });

  if (rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const saleId = Number(id);

  const { rows: saleRows } = await db.execute({
    sql: "SELECT id, payment_status FROM sales WHERE id = ?",
    args: [saleId],
  });

  if (saleRows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });

  if ((saleRows[0].payment_status as string) !== "unpaid") {
    return Response.json({ error: "Only unpaid orders can be cancelled" }, { status: 400 });
  }

  await db.execute({ sql: "DELETE FROM sale_items WHERE sale_id = ?", args: [saleId] });
  await db.execute({ sql: "DELETE FROM sales WHERE id = ?", args: [saleId] });

  return Response.json({ success: true });
}
