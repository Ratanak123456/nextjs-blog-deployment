import { PostPage } from "@/components/blog";
export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  return <PostPage id={(await params).id} edit />;
}
