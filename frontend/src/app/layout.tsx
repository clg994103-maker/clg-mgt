import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Events | College Event Management",
  description: "Discover and manage events across campus.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}