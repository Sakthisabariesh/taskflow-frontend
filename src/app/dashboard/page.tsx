"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext, Status, Priority, Role, Task } from "@/context/AppContext";

type Tab = "board" | "tasks" | "team" | "report";

const PRIORITY_MAP: Record<Priority, string> = {
  Urgent: "badge-urgent", High: "badge-high", Medium: "badge-medium", Low: "badge-low"
};
const COLUMNS: Status[] = ["To Do", "In Progress", "In Review", "Done"];
const BLANK_TASK = { title: "", assigneeId: "", priority: "Medium", status: "To Do", due: "" };

export default function Dashboard() {
  const router = useRouter();
  const { currentUser, members, tasks, logout, addMember, removeMember, addTask, updateTask, updateTaskStatus, deleteTask } = useAppContext();

  const [tab, setTab] = useState<Tab>("board");
  const [theme, setTheme] = useState("dark");
  const [taskModal, setTaskModal] = useState(false);
  const [memberModal, setMemberModal] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ ...BLANK_TASK });
  const [newMember, setNewMember] = useState({ name: "", role: "Member" });
  const [reportFormat, setReportFormat] = useState<"CSV" | "Excel" | "PDF">("PDF");
  const [reportTemplate, setReportTemplate] = useState<"Compact" | "Detailed">("Detailed");

  useEffect(() => { if (!currentUser) router.push("/"); }, [currentUser, router]);

  const toggleTheme = () => {
    const t = theme === "dark" ? "light" : "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  };

  const stats = useMemo(() => {
    return {
      dueToday: tasks.filter(t => t.status !== "Done" && t.due.toLowerCase() === "today").length,
      pending: tasks.filter(t => t.status !== "Done").length,
      done: tasks.filter(t => t.status === "Done").length,
      total: tasks.length,
    };
  }, [tasks]);

  const getMember = (id: string) => members.find(m => m.id === id);

  const openNew = () => {
    setEditId(null);
    setTaskForm({ ...BLANK_TASK, assigneeId: members[0]?.id || "" });
    setTaskModal(true);
  };

  const openEdit = (t: Task) => {
    setEditId(t.id);
    setTaskForm({ title: t.title, assigneeId: t.assigneeId, priority: t.priority, status: t.status, due: t.due });
    setTaskModal(true);
  };

  const saveTask = () => {
    if (!taskForm.title.trim() || !taskForm.assigneeId) return;
    const payload = { ...taskForm, priority: taskForm.priority as Priority, status: taskForm.status as Status, due: taskForm.due || "No date" };
    editId ? updateTask(editId, payload) : addTask(payload);
    setTaskModal(false);
  };

  const saveMember = () => {
    if (!newMember.name.trim()) return;
    addMember(newMember.name, newMember.role as Role);
    setNewMember({ name: "", role: "Member" });
    setMemberModal(false);
  };

  const downloadReport = async () => {
    const rows = tasks.map(t => {
      const base = { Task: t.title, Status: t.status };
      return reportTemplate === "Detailed"
        ? { ...base, Assignee: getMember(t.assigneeId)?.name || "?", Priority: t.priority, Due: t.due, CompletedAt: t.completedAt || "N/A" }
        : base;
    });

    if (reportFormat === "CSV" || reportFormat === "Excel") {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, reportFormat === "CSV" ? "report.csv" : "report.xlsx");
    } else {
      const { jsPDF } = await import("jspdf");
      await import("jspdf-autotable");
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Weekly Progress Report", 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}  |  Completed: ${stats.done}  |  Pending: ${stats.pending}`, 14, 22);
      // @ts-ignore
      doc.autoTable({ head: [Object.keys(rows[0] || { Task: "", Status: "" })], body: rows.map(r => Object.values(r)), startY: 28, styles: { fontSize: 9 } });
      doc.save("report.pdf");
    }
    setReportModal(false);
  };

  if (!currentUser) return null;

  // ── Shared input style ──
  const inp = { width: "100%", padding: "0.75rem 1rem", background: "var(--bg-base)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", color: "var(--text-main)", fontSize: "1rem", minHeight: "48px" } as const;
  const lbl = { display: "block", marginBottom: "0.35rem", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "var(--bg-base)" }}>

      {/* ── Top Bar ── */}
      <header style={{ flexShrink: 0, height: "60px", background: "var(--bg-panel)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1rem", paddingTop: "var(--safe-top)" }}>
        <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "1.2rem", color: "var(--primary)" }}>✦ TaskFlow</span>
        <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
          <button className="icon-btn" onClick={toggleTheme}>{theme === "dark" ? "🌞" : "🌙"}</button>
          <div className="avatar" style={{ background: currentUser.color, cursor: "pointer" }} onClick={() => { logout(); router.push("/"); }}>
            {currentUser.avatar}
          </div>
        </div>
      </header>

      {/* ── Main Scrollable Content ── */}
      <main className="scroll-y" style={{ flex: 1, paddingBottom: "80px" }}>

        {/* BOARD TAB */}
        {tab === "board" && (
          <div style={{ padding: "1rem" }}>
            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div className="stat-card">
                <span style={{ fontSize: "1.8rem", fontWeight: 800, fontFamily: "var(--font-heading)" }}>{stats.dueToday}</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>Due Today</span>
              </div>
              <div className="stat-card" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
                <span style={{ fontSize: "1.8rem", fontWeight: 800, fontFamily: "var(--font-heading)", color: "var(--danger)" }}>{stats.pending}</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>Pending</span>
              </div>
              <div className="stat-card">
                <span style={{ fontSize: "1.8rem", fontWeight: 800, fontFamily: "var(--font-heading)", color: "var(--success)" }}>{stats.done}</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>Done</span>
              </div>
            </div>

            {/* Kanban horizontal scroll */}
            <h2 style={{ fontWeight: 700, marginBottom: "0.75rem", fontSize: "1rem" }}>Kanban Board</h2>
            <div style={{ display: "flex", gap: "0.75rem", overflowX: "auto", paddingBottom: "0.5rem", WebkitOverflowScrolling: "touch" as any }}>
              {COLUMNS.map(col => {
                const colTasks = tasks.filter(t => t.status === col);
                const accent = col === "Done" ? "var(--success)" : col === "In Review" ? "var(--warning)" : col === "In Progress" ? "var(--primary)" : "var(--text-muted)";
                return (
                  <div key={col} className="kanban-col">
                    <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem", color: accent }}>{col}</span>
                      <span style={{ background: "var(--bg-hover)", padding: "0.1rem 0.5rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 700 }}>{colTasks.length}</span>
                    </div>
                    <div className="scroll-y" style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "340px" }}>
                      {colTasks.length === 0 && <div className="empty-state"><span className="empty-icon">📭</span><p>Empty</p></div>}
                      {colTasks.map(task => {
                        const m = getMember(task.assigneeId);
                        return (
                          <div key={task.id} className="task-card" onClick={() => openEdit(task)}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                              <span className={`badge ${PRIORITY_MAP[task.priority]}`}>{task.priority}</span>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>📅 {task.due}</span>
                            </div>
                            <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.75rem", lineHeight: 1.4 }}>{task.title}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <select
                                value={task.status}
                                onClick={e => e.stopPropagation()}
                                onChange={e => updateTaskStatus(task.id, e.target.value as Status)}
                                style={{ background: "var(--bg-hover)", border: "none", borderRadius: "4px", fontSize: "0.7rem", padding: "0.25rem 0.4rem", color: "var(--text-muted)", minHeight: "28px" }}
                              >
                                {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              {m && <div className="avatar" style={{ background: m.color, width: "24px", height: "24px", fontSize: "0.65rem" }}>{m.avatar}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TASKS TAB */}
        {tab === "tasks" && (
          <div style={{ padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontWeight: 700, fontSize: "1.1rem" }}>All Tasks ({tasks.length})</h2>
              <button className="btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", minHeight: "36px" }} onClick={openNew}>+ Add</button>
            </div>
            {tasks.length === 0 && <div className="empty-state"><span className="empty-icon">📋</span><p>No tasks yet.</p><button className="btn-primary" onClick={openNew}>Create your first task</button></div>}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {tasks.map(task => {
                const m = getMember(task.assigneeId);
                return (
                  <div key={task.id} className="task-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <div style={{ flex: 1 }}>
                        <span className={`badge ${PRIORITY_MAP[task.priority]}`} style={{ marginBottom: "0.4rem", display: "inline-block" }}>{task.priority}</span>
                        <div style={{ fontWeight: 600 }}>{task.title}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {m && <><div className="avatar" style={{ background: m.color, width: "22px", height: "22px", fontSize: "0.6rem" }}>{m.avatar}</div><span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{m.name}</span></>}
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>· {task.due}</span>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <select value={task.status} onChange={e => updateTaskStatus(task.id, e.target.value as Status)} style={{ background: "var(--bg-hover)", border: "none", borderRadius: "6px", fontSize: "0.75rem", padding: "0.3rem 0.5rem", color: "var(--text-main)", minHeight: "32px" }}>
                          {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button onClick={() => openEdit(task)} style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0 0.6rem", fontSize: "0.75rem", fontWeight: 600, minHeight: "32px" }}>Edit</button>
                        <button onClick={() => deleteTask(task.id)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "0 0.6rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--danger)", minHeight: "32px" }}>Del</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TEAM TAB */}
        {tab === "team" && (
          <div style={{ padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Team ({members.length})</h2>
              {currentUser.role === "Admin" && (
                <button className="btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", minHeight: "36px" }} onClick={() => setMemberModal(true)}>+ Member</button>
              )}
            </div>
            {members.length === 0 && <div className="empty-state"><span className="empty-icon">👥</span><p>No members added yet.</p></div>}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {members.map(m => {
                const memberTasks = tasks.filter(t => t.assigneeId === m.id);
                const doneTasks = memberTasks.filter(t => t.status === "Done").length;
                return (
                  <div key={m.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div className="avatar" style={{ background: m.color, width: "44px", height: "44px", fontSize: "1rem" }}>{m.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{m.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{m.role} · {memberTasks.length} tasks · {doneTasks} done</div>
                    </div>
                    {currentUser.role === "Admin" && m.id !== currentUser.id && (
                      <button onClick={() => removeMember(m.id)} style={{ color: "var(--danger)", fontSize: "0.75rem", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "0.3rem 0.6rem", background: "rgba(239,68,68,0.08)", fontWeight: 600 }}>Remove</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* REPORT TAB */}
        {tab === "report" && (
          <div style={{ padding: "1rem" }}>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "1rem" }}>Weekly Report</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              {[["✅ Done", stats.done, "var(--success)"], ["⏳ Pending", stats.pending, "var(--warning)"], ["📅 Due Today", stats.dueToday, "var(--primary)"], ["📊 Total", stats.total, "var(--text-main)"]].map(([label, val, color]) => (
                <div key={label as string} className="stat-card">
                  <span style={{ fontSize: "1.8rem", fontWeight: 800, color: color as string }}>{val}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>{label}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "1rem", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={lbl}>Template</label>
                <select value={reportTemplate} onChange={e => setReportTemplate(e.target.value as any)} style={inp}>
                  <option value="Detailed">Detailed (All info)</option>
                  <option value="Compact">Compact (Title & Status)</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Export Format</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                  {(["CSV", "Excel", "PDF"] as const).map(f => (
                    <button key={f} onClick={() => setReportFormat(f)} style={{ padding: "0.75rem 0.5rem", border: `2px solid ${reportFormat === f ? "var(--primary)" : "var(--border)"}`, borderRadius: "var(--radius-md)", background: reportFormat === f ? "var(--primary-light)" : "var(--bg-base)", color: reportFormat === f ? "var(--primary)" : "var(--text-muted)", fontWeight: 700, fontSize: "0.85rem", minHeight: "44px" }}>
                      {f === "CSV" ? "📄" : f === "Excel" ? "📊" : "📑"} {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <h3 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.75rem", color: "var(--text-muted)" }}>Completed This Week</h3>
            {tasks.filter(t => t.status === "Done").length === 0
              ? <div className="empty-state" style={{ padding: "1.5rem" }}><p>No completed tasks yet.</p></div>
              : tasks.filter(t => t.status === "Done").map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--success)", fontSize: "1.1rem" }}>✓</span>
                  <span style={{ flex: 1, fontWeight: 500, fontSize: "0.9rem" }}>{t.title}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{getMember(t.assigneeId)?.name}</span>
                </div>
              ))
            }

            <button className="btn-primary" onClick={downloadReport} style={{ width: "100%", marginTop: "1.5rem", fontSize: "1rem" }}>
              Download {reportFormat} Report
            </button>
          </div>
        )}

      </main>

      {/* ── FAB (Add Task) ── only on board/tasks */}
      {(tab === "board" || tab === "tasks") && (
        <button
          onClick={openNew}
          style={{
            position: "fixed",
            right: "1.25rem",
            bottom: "calc(72px + var(--safe-bottom))",
            width: "56px",
            height: "56px",
            borderRadius: "var(--radius-full)",
            background: "var(--primary)",
            color: "#fff",
            fontSize: "1.75rem",
            fontWeight: 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 20px rgba(79,70,229,0.5)",
            zIndex: 90,
            transition: "var(--transition)",
          }}
        >+</button>
      )}

      {/* ── Bottom Navigation ── */}
      <nav className="bottom-nav">
        {([
          ["board", "🏠", "Board"],
          ["tasks", "✅", "Tasks"],
          ["team", "👥", "Team"],
          ["report", "📊", "Report"],
        ] as [Tab, string, string][]).map(([id, icon, label]) => (
          <button key={id} className={`bottom-nav-item ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* ── Task Add/Edit Modal ── */}
      {taskModal && (
        <div className="modal-overlay" onClick={() => setTaskModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ padding: "1.25rem 1.25rem 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: 700, fontSize: "1.2rem" }}>{editId ? "Edit Task" : "New Task"}</h3>
              <button className="icon-btn" onClick={() => setTaskModal(false)}>✕</button>
            </div>
            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div><label style={lbl}>Title</label><input style={inp} value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="What needs to be done?" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div><label style={lbl}>Assignee</label>
                  <select style={inp} value={taskForm.assigneeId} onChange={e => setTaskForm({ ...taskForm, assigneeId: e.target.value })}>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Priority</label>
                  <select style={inp} value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                    {["Urgent","High","Medium","Low"].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div><label style={lbl}>Status</label>
                  <select style={inp} value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}>
                    {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Due Date</label><input style={inp} value={taskForm.due} onChange={e => setTaskForm({ ...taskForm, due: e.target.value })} placeholder="e.g. Tomorrow" /></div>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.5rem" }}>
                <button className="btn-outline" style={{ flex: 1 }} onClick={() => setTaskModal(false)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 2 }} onClick={saveTask}>{editId ? "Save Changes" : "Create Task"}</button>
              </div>
              {editId && <button onClick={() => { deleteTask(editId); setTaskModal(false); }} style={{ color: "var(--danger)", fontSize: "0.9rem", padding: "0.5rem", textAlign: "center", fontWeight: 600 }}>🗑 Delete Task</button>}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Member Modal ── */}
      {memberModal && (
        <div className="modal-overlay" onClick={() => setMemberModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ padding: "1.25rem 1.25rem 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: 700, fontSize: "1.2rem" }}>Add Team Member</h3>
              <button className="icon-btn" onClick={() => setMemberModal(false)}>✕</button>
            </div>
            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div><label style={lbl}>Name</label><input style={inp} value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} placeholder="e.g. John" /></div>
              <div><label style={lbl}>Role</label>
                <select style={inp} value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })}>
                  <option value="Member">Member</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.5rem" }}>
                <button className="btn-outline" style={{ flex: 1 }} onClick={() => setMemberModal(false)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 2 }} onClick={saveMember}>Add Member</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
