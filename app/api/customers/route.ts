import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";

function normalizeCustomerName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCustomerPhone(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

async function findExistingCustomer(name: string, phone: string | null) {
  if (phone) {
    const { rows } = await db.execute({
      sql: "SELECT * FROM customers WHERE phone = ? ORDER BY id ASC LIMIT 1",
      args: [phone],
    });

    if (rows.length > 0) {
      return rows[0];
    }
  }

  if (!phone) {
    const { rows } = await db.execute({
      sql: "SELECT * FROM customers WHERE LOWER(TRIM(name)) = LOWER(?) ORDER BY id ASC LIMIT 1",
      args: [name],
    });

    if (rows.length > 0) {
      return rows[0];
    }
  }

  return null;
}

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
  const normalizedName = normalizeCustomerName(name);
  const normalizedPhone = normalizeCustomerPhone(phone);

  if (!normalizedName) return Response.json({ error: "Name required" }, { status: 400 });

  const existingCustomer = await findExistingCustomer(normalizedName, normalizedPhone);
  if (existingCustomer) {
    return Response.json({ customer: existingCustomer });
  }

  const { rows } = await db.execute({
    sql: "INSERT INTO customers (name, phone) VALUES (?, ?) RETURNING *",
    args: [normalizedName, normalizedPhone],
  });
  return Response.json({ customer: rows[0] }, { status: 201 });
}
