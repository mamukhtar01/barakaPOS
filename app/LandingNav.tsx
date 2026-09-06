"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "antd";
import { MenuOutlined, CloseOutlined } from "@ant-design/icons";

const navLinks = [
  { href: "/menu", label: "Menu" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Abukhayr Café logo"
            width={36}
            height={36}
            className="w-9 h-9 rounded-full object-cover shadow-sm"
          />
          <span className="font-bold text-green-700 text-lg">Abukhayr Café</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-gray-600 hover:text-green-700 font-medium transition-colors"
            >
              {l.label}
            </a>
          ))}
          <Link href="/login">
            <Button>Staff Login</Button>
          </Link>
        </nav>

        <button
          className="md:hidden text-gray-700 text-xl leading-none"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <CloseOutlined /> : <MenuOutlined />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-3">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-gray-600 py-1"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>
            <Button block>Staff Login</Button>
          </Link>
        </div>
      )}
    </header>
  );
}
