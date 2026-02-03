"use client";

import { useEffect, useMemo, useState } from "react";

type ReportSummary = {
  sessionId: string;
  studentName: string;
  studentEmail: string;
  generatedAt: string;
  mastery_level: string;
  confidence: number;
};

type ReportPayload = {
  sessionId: string;
  generatedAt: string;
  student?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  assessment?: any;
  report?: any;
  transcript?: Array<{ role: string; text: string; ts: number }>;
};

const formatDate = (value: string) =>
  value ? new Date(value).toLocaleString() : "";

export default function TeacherDashboard() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("teacher_authed");
    if (stored === "true") {
      setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    void loadSummaries();
  }, [authenticated]);

  const metrics = useMemo(() => {
    const total = reports.length;
    const avgConfidence =
      total === 0
        ? 0
        : reports.reduce((sum, r) => sum + (r.confidence ?? 0), 0) / total;

    const byLevel = reports.reduce<Record<string, number>>((acc, report) => {
      const level = report.mastery_level || "unknown";
      acc[level] = (acc[level] ?? 0) + 1;
      return acc;
    }, {});

    return { total, avgConfidence, byLevel };
  }, [reports]);

  const authenticate = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        throw new Error("Invalid password");
      }
      sessionStorage.setItem("teacher_authed", "true");
      setAuthenticated(true);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const loadSummaries = async () => {
    setReportError(null);
    try {
      const res = await fetch("/api/teacher/reports");
      const data = await res.json();
      setReports(Array.isArray(data.reports) ? data.reports : []);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Failed to load reports");
    }
  };

  const loadReport = async () => {
    if (!selectedId) return;
    setLoading(true);
    setReportError(null);
    try {
      const res = await fetch(`/api/teacher/reports?sessionId=${selectedId}`);
      const data = await res.json();
      setSelectedReport(data.report ?? null);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <main className="app">
        <section className="dashboard card">
          <h1>Teacher Dashboard</h1>
          <p className="lead">Enter the password to view student reports.</p>
          <div className="controls">
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button className="btn primary" onClick={authenticate} disabled={loading}>
              Unlock
            </button>
          </div>
          {authError ? <div className="error">{authError}</div> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <section className="dashboard">
        <div className="dashboard-header">
          <div>
            <p className="eyebrow">Teacher dashboard</p>
            <h1>Student reports</h1>
          </div>
          <button className="btn ghost" onClick={loadSummaries}>
            Refresh
          </button>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <span>Total sessions</span>
            <strong>{metrics.total}</strong>
          </div>
          <div className="metric-card">
            <span>Avg confidence</span>
            <strong>{metrics.avgConfidence.toFixed(2)}</strong>
          </div>
          <div className="metric-card">
            <span>Mastery distribution</span>
            <div className="metric-tags">
              {Object.keys(metrics.byLevel).length === 0 ? (
                <span className="pill">No data</span>
              ) : (
                Object.entries(metrics.byLevel).map(([level, count]) => (
                  <span key={level} className="pill mono">
                    {level} {count}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="report-grid">
          <div className="card">
            <h2>Reports</h2>
            {reports.length === 0 ? (
              <p>No reports yet.</p>
            ) : (
              <div className="report-list">
                {reports.map((report) => (
                  <button
                    key={report.sessionId}
                    className={`report-item ${
                      selectedId === report.sessionId ? "active" : ""
                    }`}
                    onClick={() => {
                      setSelectedId(report.sessionId);
                      setSelectedReport(null);
                    }}
                  >
                    <div>
                      <div>{report.studentName || "Unknown student"}</div>
                      <div className="muted">
                        {report.studentEmail || report.sessionId}
                      </div>
                      <div className="muted">{formatDate(report.generatedAt)}</div>
                    </div>
                    <div className="pill mono">
                      {report.mastery_level || "unknown"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2>Report detail</h2>
            <div className="controls">
              <input
                className="input"
                placeholder="Session ID"
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
              />
              <button className="btn primary" onClick={loadReport} disabled={loading}>
                Load
              </button>
            </div>

            {reportError ? <div className="error">{reportError}</div> : null}

            {selectedReport ? (
              <div className="report-detail">
                <div className="pill-row">
                  <span className="pill mono">
                    {`${selectedReport.student?.first_name ?? ""} ${
                      selectedReport.student?.last_name ?? ""
                    }`.trim() || "Unknown student"}
                  </span>
                  <span className="pill mono">{selectedReport.student?.email ?? "no email"}</span>
                  <span className="pill mono">{selectedReport.sessionId}</span>
                  <span className="pill">{formatDate(selectedReport.generatedAt)}</span>
                </div>
                <h3>Summary</h3>
                <p>{selectedReport.report?.summary ?? "No summary."}</p>
                <div className="report-columns">
                  <div>
                    <h4>Strengths</h4>
                    <ul>
                      {(selectedReport.report?.strengths ?? []).map((item: string, index: number) => (
                        <li key={`s-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>Gaps</h4>
                    <ul>
                      {(selectedReport.report?.gaps ?? []).map((item: string, index: number) => (
                        <li key={`g-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <h4>Recommended next steps</h4>
                <ul>
                  {(selectedReport.report?.recommended_next_steps ?? []).map(
                    (item: string, index: number) => (
                      <li key={`n-${index}`}>{item}</li>
                    )
                  )}
                </ul>
              </div>
            ) : (
              <p>Select a report to view details.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
