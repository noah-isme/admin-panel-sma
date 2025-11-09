export const themeTokens = {
  primary: "#2f6fed",
  accentBlue: "#2563eb",
  accentGreen: "#16a34a",
  accentOrange: "#f97316",
  accentYellow: "#eab308",
  secondaryTextLight: "#6b7280",
  secondaryTextDark: "#94a3b8",
  cardShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
  cardBorderRadius: 16,
  focusRing: "0 0 0 3px rgba(47, 111, 237, 0.35)",
  // Attendance color system (3-tier)
  attendanceGood: "#16a34a", // >92% - Green
  attendanceWarning: "#f59e0b", // 86-92% - Amber
  attendanceDanger: "#dc2626", // <86% - Red
} as const;

export type ThemeTokens = typeof themeTokens;
