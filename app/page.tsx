import type { Metadata } from "next";
import { db } from "@/lib/db";
import type { Product } from "@/lib/types";
import { LandingClient } from "./LandingClient";

export const metadata: Metadata = {
  title: "Abukhayr Café — Fresh Coffee & Snacks",
  description:
    "Abukhayr Café: great coffee, fresh bites, and warm hospitality. Browse our menu, hours, and how to find us.",
};

export const revalidate = 60;

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const { rows } = await db.execute(
      "SELECT p.id, p.name, p.category_id, c.name as category_name, p.img, p.image_url, p.thumbnail_url, p.sale_price_usd FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = 'active' ORDER BY p.id DESC LIMIT 6",
    );
    return rows.map((row) => ({ ...row }) as unknown as Product);
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const products = await getFeaturedProducts();
  return <LandingClient products={products} />;
}
