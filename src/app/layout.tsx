import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Taskboard | Deployment Lab", description: "A PostgreSQL-backed task workspace for the DevOps lab." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
