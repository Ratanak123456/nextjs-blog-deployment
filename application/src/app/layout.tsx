import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = { title: "Fieldnotes | The Lab Journal", description: "A simple blog for ideas and discoveries from the DevOps lab." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><header className="site-header"><nav aria-label="Main navigation"><Link className="brand" href="/"><span className="brand-mark">f.</span> fieldnotes<span className="lab-label">THE LAB JOURNAL</span></Link><Link className="nav-write" href="/posts/new">Write a post ↗</Link></nav></header><main id="main">{children}</main><footer><Link href="/" className="footer-brand">fieldnotes.</Link><span>A small space for good ideas. · DevOps deployment lab</span></footer></body></html>;
}
