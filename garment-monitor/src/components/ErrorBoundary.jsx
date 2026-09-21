// src/components/ErrorBoundary.jsx
// Safety net: if a render throws, show the error on screen instead of a blank
// page. Normal operation is unaffected — this only renders when there's a crash.
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error("App crash:", err, info); }
  render() {
    if (this.state.err) {
      return (
        <div style={{ minHeight: "100vh", background: "#0F172A", color: "#F8FAFC", padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <h2 style={{ color: "#EF4444", marginBottom: 12 }}>Something went wrong</h2>
          <p style={{ color: "#94A3B8", marginBottom: 12, fontSize: 14 }}>Please share this message so it can be fixed:</p>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#1E293B", padding: 16, borderRadius: 8, fontSize: 12, lineHeight: 1.5 }}>
            {String(this.state.err?.stack || this.state.err)}
          </pre>
          <button onClick={() => location.reload()}
            style={{ marginTop: 16, padding: "10px 18px", background: "#3B82F6", color: "#fff", border: 0, borderRadius: 8, fontWeight: 700 }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
