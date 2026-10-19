import { BlogList } from "@/components/blog";
export default async function Home({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  return <BlogList deleted={(await searchParams).notice === "deleted"} />;
}
