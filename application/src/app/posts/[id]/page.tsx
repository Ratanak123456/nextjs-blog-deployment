import { PostPage } from "@/components/blog";
export default async function ReadPost({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string }> }) {
  return <PostPage id={(await params).id} notice={(await searchParams).notice} />;
}
