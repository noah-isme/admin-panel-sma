import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: 600,
              textAlign: "center",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: "2rem",
            }}
          >
            <h2 style={{ color: "#dc2626", marginBottom: "0.5rem" }}>Something went wrong</h2>
            <p style={{ color: "#64748b", marginBottom: "1rem" }}>
              An unexpected error occurred while loading the admin panel.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre
                style={{
                  background: "#1e293b",
                  color: "#e2e8f0",
                  padding: "1rem",
                  borderRadius: 8,
                  fontSize: "0.8rem",
                  overflow: "auto",
                  textAlign: "left",
                }}
              >
                {this.state.error.stack}
              </pre>
            )}
            <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
              Check the browser console (F12) for details. Try refreshing the page.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
