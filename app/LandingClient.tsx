"use client";

import Image from "next/image";
import Link from "next/link";
import { Button, Image as AntImage, Typography } from "antd";
import {
  CoffeeOutlined,
  DollarCircleOutlined,
  SmileOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  WhatsAppOutlined,
  FacebookOutlined,
  InstagramOutlined,
  TikTokOutlined,
} from "@ant-design/icons";
import type { Product } from "@/lib/types";
import { LandingNav } from "./LandingNav";

const { Title, Text, Paragraph } = Typography;

const CONTACT = {
  address: "Masalaha, Ciir Mall, Hargeisa, Somaliland",
  phone: "+252 63 314 5555",
  whatsapp: "252633145555",
  hours: "Every day · 7:00 AM – 12:00 PM",
  social: "abukhayrsnackbar",
};

const SOCIAL_LINKS = [
  { icon: FacebookOutlined, href: `https://facebook.com/${CONTACT.social}`, label: "Facebook" },
  { icon: InstagramOutlined, href: `https://instagram.com/${CONTACT.social}`, label: "Instagram" },
  { icon: TikTokOutlined, href: `https://tiktok.com/@${CONTACT.social}`, label: "TikTok" },
];

function getProductImage(product: Product) {
  return product.img ?? product.thumbnail_url ?? product.image_url;
}

const formatUsd = (usd: number) => `$${Number(usd).toFixed(2)}`;

export function LandingClient({ products }: { products: Product[] }) {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero */}
      <section className="bg-gradient-to-b from-green-50 via-white to-white">
        <div className="max-w-5xl mx-auto px-4 pt-10 pb-14 sm:pt-16 sm:pb-20 text-center">
          <Image
            src="/logo.png"
            alt="Abukhayr Café logo"
            width={72}
            height={72}
            className="mx-auto rounded-full object-cover shadow-lg mb-5 sm:mb-6 w-16 h-16 sm:w-[72px] sm:h-[72px]"
          />
          <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Now Open
          </span>
          <Title level={1} className="mb-3! text-3xl! sm:text-5xl! font-bold! text-gray-900!">
            Abukhayr Café
          </Title>
          <Paragraph className="text-base! sm:text-lg! text-gray-600! max-w-xl mx-auto mb-8! px-2">
            Great coffee, fresh bites, and warm hospitality — right in the heart of the city.
          </Paragraph>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-xs sm:max-w-none mx-auto">
            <Link href="/menu" className="block">
              <Button type="primary" size="large" block className="sm:w-auto!">View Our Menu</Button>
            </Link>
            <a href="#contact" className="block">
              <Button size="large" block className="sm:w-auto!">Find Us</Button>
            </a>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section id="about" className="max-w-5xl mx-auto px-4 py-10 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="text-center p-5 sm:p-6 rounded-2xl bg-gray-50">
            <CoffeeOutlined className="text-3xl text-green-600 mb-3" />
            <Title level={5} className="mb-1!">Fresh Daily</Title>
            <Text type="secondary">Coffee brewed and snacks prepared fresh every day.</Text>
          </div>
          <div className="text-center p-5 sm:p-6 rounded-2xl bg-gray-50">
            <DollarCircleOutlined className="text-3xl text-green-600 mb-3" />
            <Title level={5} className="mb-1!">Pay Your Way</Title>
            <Text type="secondary">We accept cash, ZAAD, and eDahab — in USD or SSHL.</Text>
          </div>
          <div className="text-center p-5 sm:p-6 rounded-2xl bg-gray-50">
            <SmileOutlined className="text-3xl text-green-600 mb-3" />
            <Title level={5} className="mb-1!">Warm Hospitality</Title>
            <Text type="secondary">A cozy spot to relax, meet friends, or get some work done.</Text>
          </div>
        </div>
      </section>

      {/* Featured products */}
      {products.length > 0 && (
        <section className="bg-green-50/60 py-10 sm:py-16">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-end justify-between mb-5 sm:mb-6 gap-2">
              <Title level={3} className="mb-0! text-xl! sm:text-2xl!">From Our Menu</Title>
              <Link href="/menu" className="text-green-700 font-medium hover:underline whitespace-nowrap text-sm sm:text-base">
                View full menu →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {products.map((product) => {
                const image = getProductImage(product);
                return (
                  <div key={product.id} className="bg-white rounded-xl shadow-sm p-3">
                    {image ? (
                      <AntImage
                        src={image}
                        alt={product.name}
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
                    <Text strong className="block leading-snug">{product.name}</Text>
                    <Text className="text-green-700 font-semibold block">
                      {formatUsd(product.sale_price_usd)}
                    </Text>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section id="contact" className="max-w-5xl mx-auto px-4 py-10 sm:py-16">
        <Title level={3} className="mb-6! sm:mb-8! text-center text-xl! sm:text-2xl!">Visit Us</Title>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-2xl mx-auto">
          <div className="flex items-start gap-3">
            <EnvironmentOutlined className="text-xl text-green-600 mt-1" />
            <div>
              <Text strong className="block">Address</Text>
              <Text type="secondary">{CONTACT.address}</Text>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ClockCircleOutlined className="text-xl text-green-600 mt-1" />
            <div>
              <Text strong className="block">Hours</Text>
              <Text type="secondary">{CONTACT.hours}</Text>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <PhoneOutlined className="text-xl text-green-600 mt-1" />
            <div>
              <Text strong className="block">Phone</Text>
              <a href={`tel:${CONTACT.phone.replace(/\s+/g, "")}`} className="text-gray-500 hover:text-green-700">
                {CONTACT.phone}
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <WhatsAppOutlined className="text-xl text-green-600 mt-1" />
            <div>
              <Text strong className="block">WhatsApp</Text>
              <a
                href={`https://wa.me/${CONTACT.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-green-700"
              >
                {CONTACT.phone}
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 mt-8 sm:mt-10">
          {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="w-11 h-11 rounded-full bg-green-50 text-green-700 flex items-center justify-center text-lg hover:bg-green-100 transition-colors"
            >
              <Icon />
            </a>
          ))}
        </div>
        <Text type="secondary" className="block text-center text-sm mt-3">
          @{CONTACT.social}
        </Text>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 sm:py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 sm:gap-4 text-sm text-gray-500 text-center">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Abukhayr Café logo"
              width={24}
              height={24}
              className="rounded-full object-cover"
            />
            <span>© {new Date().getFullYear()} Abukhayr Café</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/menu" className="hover:text-green-700">Menu</Link>
            <a href="#contact" className="hover:text-green-700">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
