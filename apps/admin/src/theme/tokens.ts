export const themeTokens = {
  primary: "#2563eb",
  accentBlue: "#2563eb",
  accentGreen: "#16a34a",
  accentOrange: "#ea580c",
  accentYellow: "#ca8a04",
  secondaryTextLight: "#475569",
  secondaryTextDark: "#94a3b8",
  borderLight: "#e2e8f0",
  borderDark: "#334155",
  cardShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  cardBorderRadius: 8,
  focusRing: "0 0 0 2px rgba(37, 99, 235, 0.4)",
  // Attendance color system (3-tier)
  attendanceGood: "#16a34a", // >92% - Green
  attendanceWarning: "#d97706", // 86-92% - Amber
  attendanceDanger: "#dc2626", // <86% - Red
} as const;

export type ThemeTokens = typeof themeTokens;
