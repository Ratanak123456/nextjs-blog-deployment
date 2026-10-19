"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client-api";
import { fields, type Post, type PostInput, type PostSummary } from "@/lib/posts";

function useResource<T>(url: string) {
  const [state, setState] = useState<{ data?: T; error?: ApiError; loading: boolean }>({ loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    api<T>(url).then(data => { if (active) setState({ data, loading: false }); })
      .catch(error => { if (active) setState({ error, loading: false }); });
    return () => { active = false; };
  }, [url, attempt]);
  return { ...state, retry: () => { setState({ loading: true }); setAttempt(value => value + 1); } };
}
function Failure({ error, retry }: { error: ApiError; retry: () => void }) {
  const missing = error.status === 404 || error.status === 400;
  return <section className="state" role="alert"><span className="state-icon">{missing ? "?" : "↻"}</span><h2>{missing ? "Post not found" : "Unable to load posts"}</h2><p>{error.message}</p>{missing ? <Link className="button" href="/">Back to all posts</Link> : <button onClick={retry}>Try again</button>}</section>;
}
export function Loading() { return <div className="state" role="status"><span className="state-icon">◌</span><p>Loading posts…</p></div>; }
export function BlogList({ deleted }: { deleted: boolean }) {
  const { data, error, loading, retry } = useResource<PostSummary[]>("/api/posts");
  return <>
    <section className="intro"><p className="eyebrow">THE LAB JOURNAL</p><h1>Ideas worth<br /><em>writing down.</em></h1><div className="intro-bottom"><p>Notes, discoveries, and a little perspective.<br />A simple space to share what you’re learning.</p><Link className="button primary" href="/posts/new">+ Write a post</Link></div></section>
    {deleted && <p className="success" role="status">Post deleted successfully.</p>}
    <div className="section-heading"><h2>Latest stories</h2><span>{data ? `${data.length} ${data.length === 1 ? "post" : "posts"}` : "FIELDNOTES"}</span></div>
    {loading ? <Loading /> : error ? <Failure error={error} retry={retry} /> : !data?.length ? <section className="state"><span className="state-icon">✎</span><h2>A blank page. A new beginning.</h2><p>No posts yet. Share your first idea with the lab.</p><Link href="/posts/new" className="button primary">Write the first post</Link></section> : <div className="post-grid">{data.map((post, index) => <article className="post-card" key={post.id}><div className="card-kicker"><span>FIELD NOTE {String(index + 1).padStart(2, "0")}</span><time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</time></div><h2><Link href={`/posts/${post.id}`}>{post.title}</Link></h2><p className="excerpt">{post.excerpt}{post.excerpt.length === 240 ? "…" : ""}</p><div className="card-bottom"><span className="byline">By {post.author}</span><Link className="read-link" href={`/posts/${post.id}`} aria-label={`Read ${post.title}`}>Read story ↗</Link></div></article>)}</div>}
  </>;
}
export function PostForm({ post }: { post?: Post }) {
  const router = useRouter();
  const [values, setValues] = useState<PostInput>(post ? { title: post.title, content: post.content, author: post.author } : { title: "", content: "", author: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try { fields(values); } catch (cause) { setError(cause instanceof Error ? cause.message : "Check the required fields."); requestAnimationFrame(() => errorRef.current?.focus()); return; }
    setSaving(true);
    try {
      const saved = await api<Post>(post ? `/api/posts/${post.id}` : "/api/posts", { method: post ? "PATCH" : "POST", body: JSON.stringify(values) });
      router.push(`/posts/${saved.id}?notice=${post ? "updated" : "created"}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save post."); setSaving(false); requestAnimationFrame(() => errorRef.current?.focus()); }
  }
  return <section className="editor"><p className="eyebrow">{post ? "BACK TO THE DRAFTING TABLE" : "START WITH AN IDEA"}</p><h1>{post ? "Edit your story." : "A story starts here."}</h1><p className="lede">Keep it simple. Make it yours.</p><form onSubmit={submit}>
    {error && <p className="error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
    <fieldset disabled={saving}><label htmlFor="title">Title <span>Required · up to 200 characters</span></label><input id="title" name="title" required maxLength={200} value={values.title} placeholder="Give your story a title" onChange={e => setValues({ ...values, title: e.target.value })} />
    <label htmlFor="author">Author name <span>Required · up to 100 characters</span></label><input id="author" name="author" autoComplete="name" required maxLength={100} value={values.author} placeholder="Your name" onChange={e => setValues({ ...values, author: e.target.value })} />
    <label htmlFor="content">Your story <span>Required · plain text · up to 50,000 characters</span></label><textarea id="content" name="content" required maxLength={50000} rows={16} value={values.content} placeholder="What have you been thinking about?" onChange={e => setValues({ ...values, content: e.target.value })} /><div className="character-count" aria-live="off">{values.content.length.toLocaleString()} / 50,000</div>
    <div className="form-actions"><button className="primary" type="submit">{saving ? "Saving…" : post ? "Save changes" : "Publish post"}</button><Link className="button" href={post ? `/posts/${post.id}` : "/"}>Cancel</Link></div></fieldset>
  </form></section>;
}
export function PostPage({ id, edit = false, notice }: { id: string; edit?: boolean; notice?: string }) {
  const { data: post, loading, error, retry } = useResource<Post>(`/api/posts/${encodeURIComponent(id)}`);
  if (loading) return <Loading />;
  if (error) return <Failure error={error} retry={retry} />;
  if (!post) return null;
  return edit ? <PostForm key={post.id} post={post} /> : <PostArticle post={post} notice={notice} />;
}
function PostArticle({ post, notice }: { post: Post; notice?: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setDeleting(true); setError("");
    try { await api(`/api/posts/${post.id}`, { method: "DELETE" }); router.push("/?notice=deleted"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to delete post."); setDeleting(false); }
  }
  return <article className="full-post">
    {(notice === "created" || notice === "updated") && <p className="success" role="status">Post {notice} successfully.</p>}
    <p className="eyebrow">A FIELD NOTE</p><h1>{post.title}</h1><div className="article-meta"><span>By <strong>{post.author}</strong></span><span>Published <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleString()}</time></span><span>Updated <time dateTime={post.updated_at}>{new Date(post.updated_at).toLocaleString()}</time></span></div>
    <div className="article-actions"><Link className="button" href={`/posts/${post.id}/edit`}>Edit post</Link><button className="danger-outline" onClick={() => { setError(""); dialog.current?.showModal(); }}>Delete post</button></div>
    <div className="post-content">{post.content}</div>
    <dialog ref={dialog} aria-labelledby="delete-title" onCancel={event => { if (deleting) event.preventDefault(); }}><h2 id="delete-title">Delete this post?</h2><p>“{post.title}” will be permanently deleted. This cannot be undone.</p>{error && <p className="error" role="alert">{error}</p>}<div className="form-actions"><button autoFocus disabled={deleting} onClick={() => dialog.current?.close()}>Keep post</button><button className="danger" disabled={deleting} onClick={() => void remove()}>{deleting ? "Deleting…" : "Delete post"}</button></div></dialog>
  </article>;
}
