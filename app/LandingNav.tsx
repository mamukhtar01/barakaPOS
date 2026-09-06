"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
      <div className="max-w-5xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <Image
            src="/logo.png"
            alt="Abukhayr Café logo"
            width={36}
            height={36}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shadow-sm shrink-0"
          />
          <span className="font-bold text-green-700 text-base sm:text-lg truncate">Abukhayr Café</span>
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
        </nav>

        <button
          className="md:hidden -mr-2 w-11 h-11 flex items-center justify-center text-gray-700 text-xl leading-none"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <CloseOutlined /> : <MenuOutlined />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-2 flex flex-col">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-gray-600 py-3 text-base border-b border-gray-50 last:border-0"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
