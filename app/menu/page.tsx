import type { Metadata } from "next";
import { db } from "@/lib/db";
import { MenuClient } from "./MenuClient";
import type { Category, Product } from "@/lib/types";

export const metadata: Metadata = {
  title: "Menu | Baraka Café",
  description: "Browse our menu",
};

export const revalidate = 30;

export default async function MenuPage() {
  const [{ rows: products }, { rows: categories }] = await Promise.all([
    db.execute(
      "SELECT p.id, p.name, p.category_id, c.name as category_name, p.img, p.image_url, p.thumbnail_url, p.sale_price_usd FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = 'active' ORDER BY p.name ASC",
    ),
    db.execute("SELECT id, name, color FROM categories ORDER BY name ASC"),
  ]);

  return (
    <MenuClient
      products={products as unknown as Product[]}
      categories={categories as unknown as Category[]}
    />
  );
}
