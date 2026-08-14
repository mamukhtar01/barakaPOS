"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Card, Col, Empty, Image as AntImage, Input, Row, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { Category, Product } from "@/lib/types";

const { Title, Text } = Typography;

function getProductImage(product: Product) {
  return product.img ?? product.thumbnail_url ?? product.image_url;
}

const formatUsd = (usd: number) => `$${usd.toFixed(2)}`;

export function MenuClient({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");

  const usedCategories = useMemo(() => {
    const ids = new Set(products.map((p) => p.category_id));
    return categories.filter((c) => ids.has(c.id));
  }, [products, categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q);
      const matchesCategory =
        activeCategory === "all" || p.category_id === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, activeCategory]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Product[]>();
    for (const product of filtered) {
      const key = product.category_name ?? "Other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(product);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 pt-5 pb-3">
          <div className="flex items-center gap-3 mb-4">
            <Image
              src="/logo.png"
              alt="Abukhayr Café logo"
              width={44}
              height={44}
              className="w-11 h-11 shrink-0 rounded-full object-cover shadow-sm"
            />
            <div>
              <Title level={4} className="mb-0! font-bold! text-green-500!">
                Abukhayr Café
              </Title>
              <Text type="secondary" className="text-xs">
                Our Menu
              </Text>
            </div>
          </div>

          <Input
            prefix={<SearchOutlined className="text-gray-400" />}
            allowClear
            placeholder="Search the menu"
            size="large"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />

          <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                activeCategory === "all"
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              All
            </button>
            {usedCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  activeCategory === c.id
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {filtered.length === 0 ? (
          <div className="py-20">
            <Empty description="No items found" />
          </div>
        ) : (
          grouped.map(([categoryName, items]) => (
            <div key={categoryName} className="mb-7 last:mb-0">
              {activeCategory === "all" && (
                <Title level={5} className="mb-3! text-gray-700">
                  {categoryName}
                </Title>
              )}
              <Row gutter={[12, 12]}>
                {items.map((product) => {
                  const image = getProductImage(product);
                  return (
                    <Col key={product.id} xs={12} sm={8}>
                      <Card
                        size="small"
                        variant="borderless"
                        className="h-full shadow-sm"
                        styles={{ body: { padding: 10 } }}
                      >
                        {image ? (
                          <AntImage
                            src={image}
                            alt={`Photo of ${product.name}`}
                            preview={false}
                            width="100%"
                            height={110}
                            className="rounded-lg object-cover mb-2"
                          />
                        ) : (
                          <div className="h-[110px] rounded-lg bg-green-50 flex items-center justify-center mb-2 text-3xl">
                            🍽️
                          </div>
                        )}
                        <Text strong className="block leading-snug">
                          {product.name}
                        </Text>
                        <Text className="text-green-700 font-semibold block mt-1">
                          {formatUsd(Number(product.sale_price_usd))}
                        </Text>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </div>
          ))
        )}

        <div className="text-center py-6">
          <Text type="secondary" className="text-xs">
            Prices are subject to change
          </Text>
        </div>
      </div>
    </div>
  );
}
