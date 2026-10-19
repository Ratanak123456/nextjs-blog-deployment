export type PostInput = { title: string; content: string; author: string };
export type Post = PostInput & { id: string; created_at: string; updated_at: string };
export type PostSummary = Omit<Post, "content"> & { excerpt: string };
export class InputError extends Error {}
export function postId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new InputError("Invalid post ID.");
  return id;
}
export function fields(value: unknown, partial = false): Partial<PostInput> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("Expected a JSON object.");
  const body = value as Record<string, unknown>;
  const result: Partial<PostInput> = {};
  for (const [key, max] of [["title", 200], ["content", 50000], ["author", 100]] as const) {
    if (!Object.hasOwn(body, key)) {
      if (!partial) throw new InputError(`${key} is required.`);
      continue;
    }
    const text = body[key];
    if (typeof text !== "string") throw new InputError(`${key} must be text.`);
    const normalized = key === "content" ? text : text.trim();
    if (!normalized.trim() || normalized.length > max) throw new InputError(`${key} must contain 1–${max} characters.`);
    // Preserve content whitespace and line breaks; trim the metadata fields.
    result[key] = normalized;
  }
  if (partial && !Object.keys(result).length) throw new InputError("Provide at least one supported field.");
  return result;
}
