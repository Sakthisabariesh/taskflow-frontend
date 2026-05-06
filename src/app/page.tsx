"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext, Role } from "@/context/AppContext";

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, login } = useAppContext();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("Admin");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) router.push("/dashboard");
  }, [currentUser, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setTimeout(() => {
      login(name, role);
      router.push("/dashboard");
    }, 400);
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "var(--bg-base)",
      }}
    >
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            background: "var(--primary)",
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            margin: "0 auto 1rem",
            boxShadow: "0 8px 24px rgba(79, 70, 229, 0.4)",
          }}
        >
          ✦
        </div>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "2rem",
            fontWeight: 800,
            color: "var(--text-main)",
          }}
        >
          TaskFlow
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: "0.4rem", fontSize: "0.95rem" }}>
          Your team's work, in one place
        </p>
      </div>

      {/* Card */}
      <div
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "2rem 1.5rem",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label className="form-label">Your Name</label>
            <input
              className="form-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya"
              required
              autoComplete="name"
              style={{ background: "var(--bg-base)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", color: "var(--text-main)", padding: "0.75rem 1rem", width: "100%", fontSize: "1rem" }}
            />
          </div>

          <div>
            <label className="form-label">Login as</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {(["Admin", "Member"] as Role[]).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  style={{
                    padding: "1rem",
                    border: `2px solid ${role === r ? "var(--primary)" : "var(--border)"}`,
                    borderRadius: "var(--radius-md)",
                    background: role === r ? "var(--primary-light)" : "var(--bg-base)",
                    color: role === r ? "var(--primary)" : "var(--text-muted)",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    transition: "var(--transition)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>{r === "Admin" ? "👑" : "👤"}</span>
                  <span>{r}</span>
                </button>
              ))}
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              Admins can add/remove team members.
            </p>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", marginTop: "0.5rem", fontSize: "1rem", minHeight: "52px" }}
            disabled={loading}
          >
            {loading ? "Entering..." : "Enter Workspace →"}
          </button>
        </form>
      </div>

      <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "2rem", textAlign: "center" }}>
        Data is saved locally in your browser.<br />No account required.
      </p>
    </div>
  );
}
