import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "daily";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter = (alias = "s") =>
    from && to
      ? ` AND date(${alias}.created_at) BETWEEN '${from}' AND '${to}'`
      : from
      ? ` AND date(${alias}.created_at) >= '${from}'`
      : to
      ? ` AND date(${alias}.created_at) <= '${to}'`
      : "";

  if (type === "daily") {
    const { rows } = await db.execute(
      `SELECT date(created_at) as date,
              SUM(total_usd) as total_usd,
              SUM(total_sos) as total_sos,
              COUNT(*) as transaction_count
       FROM sales WHERE payment_status = 'paid'${dateFilter()}
       GROUP BY date(created_at) ORDER BY date DESC LIMIT 30`
    );
    return Response.json({ report: rows });
  }

  if (type === "monthly") {
    const { rows } = await db.execute(
      `SELECT strftime('%Y-%m', created_at) as month,
              SUM(total_usd) as total_usd,
              SUM(total_sos) as total_sos,
              COUNT(*) as transaction_count
       FROM sales WHERE payment_status = 'paid'${dateFilter()}
       GROUP BY strftime('%Y-%m', created_at) ORDER BY month DESC LIMIT 12`
    );
    return Response.json({ report: rows });
  }

  if (type === "by_product") {
    const { rows } = await db.execute(
      `SELECT si.product_name,
              SUM(si.quantity) as quantity_sold,
              SUM(si.subtotal_usd) as revenue_usd,
              COALESCE(p.cost_price_usd, 0) * SUM(si.quantity) as cost_usd,
              SUM(si.subtotal_usd) - COALESCE(p.cost_price_usd, 0) * SUM(si.quantity) as profit_usd
       FROM sale_items si
       LEFT JOIN products p ON si.product_id = p.id
       LEFT JOIN sales s ON si.sale_id = s.id
       WHERE s.payment_status = 'paid'${dateFilter()}
       GROUP BY si.product_name ORDER BY revenue_usd DESC`
    );
    return Response.json({ report: rows });
  }

  if (type === "by_payment_method") {
    const { rows } = await db.execute(
      `SELECT payment_method,
              SUM(total_usd) as total_usd,
              SUM(total_sos) as total_sos,
              COUNT(*) as transaction_count
       FROM sales WHERE payment_status = 'paid'${dateFilter()}
       GROUP BY payment_method`
    );
    return Response.json({ report: rows });
  }

  if (type === "by_currency") {
    const { rows } = await db.execute(
      `SELECT currency,
              SUM(total_usd) as total_usd,
              SUM(total_sos) as total_sos,
              COUNT(*) as transaction_count
       FROM sales WHERE payment_status = 'paid'${dateFilter()}
       GROUP BY currency`
    );
    return Response.json({ report: rows });
  }

  if (type === "unpaid") {
    const { rows } = await db.execute(
      `SELECT c.id as customer_id,
              COALESCE(c.name, 'Walk-in / No customer') as customer_name,
              c.phone as customer_phone,
              COUNT(s.id) as order_count,
              SUM(s.total_usd) as total_usd,
              SUM(s.total_sos) as total_sos,
              MIN(s.created_at) as oldest_created_at
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.payment_status = 'unpaid'${dateFilter()}
       GROUP BY c.id
       ORDER BY oldest_created_at ASC`
    );
    return Response.json({ report: rows });
  }

  if (type === "summary") {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = today.slice(0, 7) + "-01";
    const [todayR, monthR, totalR] = await Promise.all([
      db.execute(`SELECT COALESCE(SUM(total_usd),0) as total_usd, COUNT(*) as cnt FROM sales WHERE payment_status = 'paid' AND date(created_at)='${today}'`),
      db.execute(`SELECT COALESCE(SUM(total_usd),0) as total_usd, COUNT(*) as cnt FROM sales WHERE payment_status = 'paid' AND date(created_at)>='${monthStart}'`),
      db.execute(`SELECT COALESCE(SUM(total_usd),0) as total_usd, COUNT(*) as cnt FROM sales WHERE payment_status = 'paid'`),
    ]);
    return Response.json({
      today: todayR.rows[0],
      month: monthR.rows[0],
      total: totalR.rows[0],
    });
  }

  return Response.json({ error: "Unknown report type" }, { status: 400 });
}
