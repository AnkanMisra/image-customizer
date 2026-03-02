"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DesignNav() {
    const pathname = usePathname();

    const links = [
        { href: "/1", label: "1" },
        { href: "/2", label: "2" },
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1.5 p-1.5 rounded-[6px] bg-[#0A0A0A] border border-white/[0.08] backdrop-blur-md shadow-2xl">
            {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`
              w-8 h-8 flex items-center justify-center font-mono text-[11px] rounded-[4px] transition-all
              ${isActive
                                ? "bg-white text-black font-semibold"
                                : "text-white/40 hover:text-white hover:bg-white/[0.04]"
                            }
            `}>
                        {link.label}
                    </Link>
                );
            })}
        </div >
    );
}
