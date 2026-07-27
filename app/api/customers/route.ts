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

async function findCustomerByPhone(phone: string) {
  const { rows } = await db.execute({
    sql: "SELECT * FROM customers WHERE phone = ? ORDER BY id ASC LIMIT 1",
    args: [phone],
  });
  return rows.length > 0 ? rows[0] : null;
}

async function findCustomerByName(name: string) {
  const { rows } = await db.execute({
    sql: "SELECT * FROM customers WHERE LOWER(TRIM(name)) = LOWER(?) ORDER BY id ASC LIMIT 1",
    args: [name],
  });
  return rows.length > 0 ? rows[0] : null;
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

  if (normalizedPhone) {
    const existingByPhone = await findCustomerByPhone(normalizedPhone);
    if (existingByPhone) {
      return Response.json(
        { error: "A customer with this phone number already exists", customer: existingByPhone },
        { status: 409 },
      );
    }
  } else {
    const existingByName = await findCustomerByName(normalizedName);
    if (existingByName) {
      return Response.json({ customer: existingByName });
    }
  }

  const { rows } = await db.execute({
    sql: "INSERT INTO customers (name, phone) VALUES (?, ?) RETURNING *",
    args: [normalizedName, normalizedPhone],
  });
  return Response.json({ customer: rows[0] }, { status: 201 });
}
