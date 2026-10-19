"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { priorities, statuses, type Task, type TaskInput } from "@/lib/tasks";
const labels = { todo: "To do", in_progress: "In progress", done: "Done" };
const blank: TaskInput = { title: "", description: "", status: "todo", priority: "medium" };
async function api(path: string, options?: RequestInit) {
  const response = await fetch(path, { ...options, cache: "no-store", headers: { "Content-Type": "application/json" } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || "Request failed. Please retry.");
  return result.data;
}
export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<TaskInput>(blank);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true); setError("");
    try {
      const rows = await api(`/api/tasks?${new URLSearchParams({ search, status })}`);
      if (current === sequence.current) setTasks(rows);
    } catch (cause) { if (current === sequence.current) setError(cause instanceof Error ? cause.message : "Unable to load tasks."); }
    finally { if (current === sequence.current) setLoading(false); }
  }, [search, status]);
  const invalidate = useCallback(() => { sequence.current++; }, []);
  useEffect(() => { const timer = setTimeout(() => { void load(); }, 250); return () => { clearTimeout(timer); invalidate(); }; }, [load, invalidate]);
  useEffect(() => { if (deleting) dialogRef.current?.showModal(); else dialogRef.current?.close(); }, [deleting]);
  function reset() { setEditing(null); setForm(blank); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setNotice(""); setError("");
    try {
      await api(editing ? `/api/tasks/${editing}` : "/api/tasks", { method: editing ? "PATCH" : "POST", body: JSON.stringify(form) });
      setNotice(editing ? "Task updated." : "Task created."); reset(); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save task."); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!deleting) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await api(`/api/tasks/${deleting.id}`, { method: "DELETE" });
      if (editing === deleting.id) reset();
      setDeleting(null); setNotice("Task deleted."); await load();
    } catch (cause) { setDeleting(null); setError(cause instanceof Error ? cause.message : "Unable to delete task."); }
    finally { setSaving(false); }
  }
  return <div className="shell">
    <header className="topbar"><Link className="brand" href="/"><span className="brand-icon">✓</span> taskboard<span className="lab">DEVOPS LAB</span></Link><span className="workspace">Your team’s work, in one place</span></header>
    <main>
      <div className="heading"><div><p className="eyebrow">WORKSPACE / OVERVIEW</p><h1>Make room for progress.</h1><p className="subtitle">Plan your next move. Keep the important work moving.</p></div><span className="workspace-badge">● &nbsp; Lab workspace</span></div>
      <section className="stats" aria-label="Summary of current search and status results">
        {[["Matching tasks", tasks.length], ...statuses.map(s => [labels[s], tasks.filter(t => t.status === s).length])].map(([name, count], i) => <div className={`stat stat-${i}`} key={name}><span>{name}</span><strong>{loading || error ? "—" : count}</strong><small>{i === 0 ? "Current filtered view" : "In this view"}</small></div>)}
      </section>
      <div className="feedback" aria-live="polite">{notice && <p className="success" role="status">✓ {notice}</p>}{error && <div className="error" role="alert">{error} <button onClick={() => void load()} disabled={loading}>Retry connection</button></div>}</div>
      <div className="columns">
        <section className="panel task-panel" aria-labelledby="tasks-heading"><div className="panel-heading"><div><h2 id="tasks-heading">Your tasks <span className="count">{loading || error ? "—" : tasks.length}</span></h2><p>A little structure. A lot of possibility.</p></div><button className="quiet" onClick={() => void load()} disabled={loading}>↻ Refresh</button></div>
          <div className="filters"><label className="search"><span className="sr-only">Search titles and descriptions</span><input type="search" placeholder="Search tasks…" value={search} maxLength={200} onChange={e => setSearch(e.target.value)} /></label><label><span className="sr-only">Filter by status</span><select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{statuses.map(s => <option key={s} value={s}>{labels[s]}</option>)}</select></label></div>
          <div aria-busy={loading}>{loading ? <div className="empty" role="status"><span className="empty-icon">◌</span>Loading your tasks…</div> : error ? <div className="empty"><span className="empty-icon">↻</span><h3>Let’s reconnect.</h3><p>Your tasks will appear when the database is available.</p></div> : !tasks.length ? <div className="empty"><span className="empty-icon">✓</span><h3>{search || status ? "No matching tasks" : "A fresh start."}</h3><p>{search || status ? "Try a different search or status." : "Create your first task and turn a plan into progress."}</p></div> : <ul className="task-list">{tasks.map(task => <li key={task.id} className="task"><div className="task-top"><span className={`status ${task.status}`}>{labels[task.status]}</span><span className={`priority ${task.priority}`}>● {task.priority}</span></div><h3>{task.title}</h3>{task.description && <p className="description">{task.description}</p>}<div className="task-bottom"><div className="dates"><span>Created <time dateTime={task.created_at}>{new Date(task.created_at).toLocaleString()}</time></span><span>Updated <time dateTime={task.updated_at}>{new Date(task.updated_at).toLocaleString()}</time></span></div><div className="actions"><button disabled={saving} aria-label={`Edit ${task.title}`} onClick={() => { setEditing(task.id); setForm({ title: task.title, description: task.description, status: task.status, priority: task.priority }); titleRef.current?.focus(); }}>Edit</button><button disabled={saving} className="delete" aria-label={`Delete ${task.title}`} onClick={() => setDeleting(task)}>Delete</button></div></div></li>)}</ul>}</div>
        </section>
        <aside><section className="panel form-panel"><p className="eyebrow">{editing ? "REFINE THE DETAILS" : "WHAT’S NEXT?"}</p><h2>{editing ? "Edit task" : "Create a task"}</h2><p className="form-intro">Good work starts with a clear next step.</p><form onSubmit={submit}>
          <label htmlFor="title">Task title <span>*</span></label><input id="title" ref={titleRef} required maxLength={200} value={form.title} placeholder="What needs to get done?" onChange={e => setForm({ ...form, title: e.target.value })} />
          <label htmlFor="description">Description <small>optional</small></label><textarea id="description" maxLength={5000} rows={4} value={form.description} placeholder="Add a little context…" onChange={e => setForm({ ...form, description: e.target.value })} />
          <div className="form-row"><div><label htmlFor="status">Status</label><select id="status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TaskInput["status"] })}>{statuses.map(s => <option key={s} value={s}>{labels[s]}</option>)}</select></div><div><label htmlFor="priority">Priority</label><select id="priority" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TaskInput["priority"] })}>{priorities.map(p => <option key={p}>{p}</option>)}</select></div></div>
          <button className="primary" disabled={saving} type="submit">{saving ? "Saving…" : editing ? "Save changes" : "+ Create task"}</button>{editing && <button type="button" className="cancel" disabled={saving} onClick={reset}>Cancel editing</button>}
        </form></section><div className="note"><span>↗</span><div><strong>Small steps, steady progress.</strong><p>Break big ideas into tasks you can finish. Your future self will thank you.</p></div></div></aside>
      </div>
      <footer><span>TASKBOARD</span><span>Built for your DevOps deployment lab · PostgreSQL persistence</span></footer>
    </main>
    <dialog ref={dialogRef} onCancel={e => { if (saving) e.preventDefault(); else setDeleting(null); }} aria-labelledby="delete-heading"><h2 id="delete-heading">Delete this task?</h2><p>“{deleting?.title}” will be permanently deleted.</p><div className="dialog-actions"><button disabled={saving} onClick={() => setDeleting(null)}>Keep task</button><button className="danger" disabled={saving} onClick={() => void remove()}>{saving ? "Deleting…" : "Delete task"}</button></div></dialog>
  </div>;
}
