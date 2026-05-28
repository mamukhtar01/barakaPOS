import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL! ;
const authToken = process.env.TURSO_AUTH_TOKEN;

export const db = createClient({ url, authToken });

export async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      pin_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#1677ff',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      img TEXT,
      thumbnail_url TEXT,
      image_url TEXT,
      sale_price_usd REAL NOT NULL DEFAULT 0,
      cost_price_usd REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      cashier_id INTEGER NOT NULL REFERENCES users(id),
      currency TEXT NOT NULL DEFAULT 'USD',
      exchange_rate REAL NOT NULL DEFAULT 1,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      payment_status TEXT NOT NULL DEFAULT 'paid',
      total_usd REAL NOT NULL DEFAULT 0,
      total_sos REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price_usd REAL NOT NULL DEFAULT 0,
      unit_price_sos REAL NOT NULL DEFAULT 0,
      subtotal_usd REAL NOT NULL DEFAULT 0,
      subtotal_sos REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('exchange_rate', '28000');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_name', 'Baraka Café');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('receipt_footer', 'Thank you for your visit!');
  `);

  // Schema migration: add optional thumbnail_url for faster product list rendering.
  const productColumns = await db.execute("PRAGMA table_info(products)");
  const hasImgColumn = productColumns.rows.some(
    (col) => (col.name as string) === "img"
  );
  if (!hasImgColumn) {
    await db.execute("ALTER TABLE products ADD COLUMN img TEXT");
  }
  const hasThumbnailColumn = productColumns.rows.some(
    (col) => (col.name as string) === "thumbnail_url"
  );
  if (!hasThumbnailColumn) {
    await db.execute("ALTER TABLE products ADD COLUMN thumbnail_url TEXT");
  }
  const hasImageUrlColumn = productColumns.rows.some(
    (col) => (col.name as string) === "image_url"
  );
  if (!hasImageUrlColumn) {
    await db.execute("ALTER TABLE products ADD COLUMN image_url TEXT");
  }

  // Keep legacy `image_url` aligned for older consumers and historical rows.
  await db.execute(
    "UPDATE products SET image_url = img WHERE img IS NOT NULL AND (image_url IS NULL OR image_url = '')"
  );

  const saleColumns = await db.execute("PRAGMA table_info(sales)");
  const hasPaymentStatusColumn = saleColumns.rows.some(
    (col) => (col.name as string) === "payment_status"
  );
  if (!hasPaymentStatusColumn) {
    await db.execute("ALTER TABLE sales ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'paid'");
  }

  // Seed default admin if no users exist
  const { rows } = await db.execute("SELECT COUNT(*) as cnt FROM users");
  if ((rows[0].cnt as number) === 0) {
    const { hashPin } = await import("./auth");
    const pinHash = await hashPin("1234");
    await db.execute({
      sql: "INSERT INTO users (username, pin_hash, role) VALUES (?, ?, ?)",
      args: ["admin", pinHash, "admin"],
    });
  }

  // Seed default categories if none exist
  const catResult = await db.execute("SELECT COUNT(*) as cnt FROM categories");
  if ((catResult.rows[0].cnt as number) === 0) {
    await db.executeMultiple(`
      INSERT INTO categories (name, color) VALUES ('Sandwiches', '#fa8c16');
      INSERT INTO categories (name, color) VALUES ('Drinks', '#1677ff');
      INSERT INTO categories (name, color) VALUES ('Juices', '#52c41a');
      INSERT INTO categories (name, color) VALUES ('Cakes', '#eb2f96');
      INSERT INTO categories (name, color) VALUES ('Snacks', '#722ed1');
    `);
  }
}
