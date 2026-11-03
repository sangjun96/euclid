import React, { useState, useEffect } from "react";
import { api } from "./lib/client.js";
import { Sparkles, Database, Layers, CheckCircle2, AlertCircle, RefreshCw, Send, Clock } from "lucide-react";

interface HealthData {
  status: string;
  timestamp: string;
  services: {
    database: string;
    pgBoss: string;
  };
}

interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

interface Task {
  id: string;
  prompt: string;
  response: string | null;
  status: string;
  model: string;
  langfuse_trace_id: string | null;
  created_at: string;
}

export function App() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Form states
  const [prompt, setPrompt] = useState("Explain pnpm workspaces in one sentence.");
  const [model, setModel] = useState("gpt-4o-mini");
  const [syncResult, setSyncResult] = useState<any>(null);
  const [isSubmittingSync, setIsSubmittingSync] = useState(false);
  const [isSubmittingAsync, setIsSubmittingAsync] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await api.health.$get();
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch {
      setHealth({
        status: "offline",
        timestamp: new Date().toISOString(),
        services: { database: "offline", pgBoss: "offline" },
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.api.users.$get();
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users as unknown as User[]);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await api.api.ai.tasks.$get();
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks as unknown as Task[]);
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchUsers();
    fetchTasks();
    const interval = setInterval(() => {
      fetchHealth();
      fetchTasks();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle Sync AI Generation
  const handleSyncGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    setIsSubmittingSync(true);
    setSyncResult(null);

    try {
      const res = await api.api.ai.sync.$post({
        json: { prompt, model },
      });
      const data = await res.json();
      setSyncResult(data);
      fetchTasks();
    } catch (err) {
      console.error("Sync AI error:", err);
    } finally {
      setIsSubmittingSync(false);
    }
  };

  // Handle Async AI Job (pg-boss queue)
  const handleAsyncQueue = async () => {
    if (!prompt) return;
    setIsSubmittingAsync(true);

    try {
      const res = await api.api.ai.async.$post({
        json: { prompt, model },
      });
      const data = await res.json();
      setActiveJobId(data.taskId);
      fetchTasks();
    } catch (err) {
      console.error("Async AI error:", err);
    } finally {
      setIsSubmittingAsync(false);
    }
  };

  // Handle Create User (Kysely)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail) return;
    setIsCreatingUser(true);

    try {
      const res = await api.api.users.$post({
        json: { name: userName, email: userEmail },
      });
      if (res.ok) {
        setUserName("");
        setUserEmail("");
        fetchUsers();
      }
    } catch (err) {
      console.error("Create user error:", err);
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div className="container">
      <header>
        <div className="logo-group">
          <div className="logo-badge">EUCLID</div>
          <div>
            <h1>Production Monorepo Stack</h1>
            <p className="subtitle">Hono • React • Postgres • Langfuse • OpenAI • pg-boss • Kysely</p>
          </div>
        </div>

        <div className="status-badge">
          <div
            className={`status-dot ${health?.status === "healthy" ? "" : "degraded"}`}
          />
          <span>Stack: {health?.status || "Connecting..."}</span>
          <button
            onClick={() => {
              fetchHealth();
              fetchTasks();
              fetchUsers();
            }}
            className="btn-secondary"
            style={{ padding: "0.2rem 0.5rem", marginLeft: "0.5rem", borderRadius: "4px" }}
            title="Refresh All"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </header>

      {/* Tech Stack Diagnostics Bar */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "1.5rem" }}>
        <div className="card" style={{ padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Postgres & Kysely</span>
            <span className="badge" style={{ color: health?.services.database === "connected" ? "var(--accent-green)" : "var(--accent-amber)" }}>
              {health?.services.database || "offline"}
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>pg-boss Queue</span>
            <span className="badge" style={{ color: health?.services.pgBoss === "ready" ? "var(--accent-green)" : "var(--accent-amber)" }}>
              {health?.services.pgBoss || "offline"}
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Langfuse Tracing</span>
            <span className="badge" style={{ color: "var(--accent-green)" }}>
              Enabled (Port 3000)
            </span>
          </div>
        </div>
      </div>

      <div className="grid">
        {/* OpenAI + Langfuse Testing Card */}
        <div className="card">
          <h2 className="card-title">
            <Sparkles size={20} color="var(--primary)" />
            <span>OpenAI + Langfuse Execution</span>
          </h2>
          <form onSubmit={handleSyncGenerate}>
            <div className="input-group">
              <label>Prompt</label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask something to generate with OpenAI & trace with Langfuse..."
              />
            </div>

            <div className="input-group">
              <label>Model</label>
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
              </select>
            </div>

            <div className="btn-group">
              <button type="submit" disabled={isSubmittingSync || isSubmittingAsync}>
                {isSubmittingSync ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Send size={15} /> Run Sync (Hono API)
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={handleAsyncQueue}
                disabled={isSubmittingSync || isSubmittingAsync}
              >
                {isSubmittingAsync ? (
                  <>Queuing...</>
                ) : (
                  <>
                    <Clock size={15} /> Queue Job (pg-boss)
                  </>
                )}
              </button>
            </div>
          </form>

          {activeJobId && (
            <div style={{ marginTop: "1rem", fontSize: "0.8125rem", color: "var(--accent-amber)" }}>
              Queued Job Task ID: <code>{activeJobId}</code> (Worker will process it in background)
            </div>
          )}

          {syncResult && (
            <div className="result-box">
              <div style={{ fontWeight: 600, marginBottom: "0.5rem", color: "var(--accent-green)" }}>
                API Response:
              </div>
              <pre>{syncResult.response || JSON.stringify(syncResult, null, 2)}</pre>
              {syncResult.traceId && (
                <div className="meta-row">
                  <span>Trace ID: {syncResult.traceId}</span>
                  <span>Model: {syncResult.model}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Database & Kysely Management */}
        <div className="card">
          <h2 className="card-title">
            <Database size={20} color="var(--accent-green)" />
            <span>Kysely Type-Safe DB (Postgres)</span>
          </h2>

          <form onSubmit={handleCreateUser} style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div style={{ flex: 1 }}>
                <label>Name</label>
                <input
                  type="text"
                  placeholder="Ada Lovelace"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Email</label>
                <input
                  type="email"
                  placeholder="ada@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={isCreatingUser}>
              {isCreatingUser ? "Inserting..." : "Insert User via Kysely"}
            </button>
          </form>

          <div>
            <label>Users in Database ({users.length})</label>
            <div className="result-box" style={{ maxHeight: "180px" }}>
              {users.length === 0 ? (
                <span style={{ color: "var(--text-muted)" }}>No users found yet. Insert one above!</span>
              ) : (
                users.map((u) => (
                  <div key={u.id} style={{ padding: "0.35rem 0", borderBottom: "1px solid var(--border)" }}>
                    <strong>{u.name}</strong> <span style={{ color: "var(--text-muted)" }}>({u.email})</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task & Queue History Card */}
      <div className="card">
        <h2 className="card-title">
          <Layers size={20} color="var(--primary)" />
          <span>Recent AI Tasks & pg-boss Worker Processing</span>
        </h2>

        <div className="result-box" style={{ maxHeight: "300px" }}>
          {tasks.length === 0 ? (
            <span style={{ color: "var(--text-muted)" }}>No tasks recorded yet. Submit a prompt above!</span>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  padding: "0.75rem 0",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{task.prompt}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Response: {task.response ? task.response.slice(0, 100) + "..." : "(processing)"}
                  </div>
                  {task.langfuse_trace_id && (
                    <div style={{ fontSize: "0.7rem", color: "var(--primary)" }}>
                      Langfuse Trace: {task.langfuse_trace_id}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: "right" }}>
                  <span
                    className="badge"
                    style={{
                      color:
                        task.status === "completed"
                          ? "var(--accent-green)"
                          : task.status === "pending" || task.status === "processing"
                          ? "var(--accent-amber)"
                          : "var(--accent-red)",
                    }}
                  >
                    {task.status}
                  </span>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    {new Date(task.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
export default App;
