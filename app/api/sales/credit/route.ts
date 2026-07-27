import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

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
     WHERE s.payment_status = 'unpaid'
     GROUP BY c.id
     ORDER BY oldest_created_at ASC`
  );

  return Response.json({ groups: rows });
}
