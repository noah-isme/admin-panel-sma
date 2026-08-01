import React from "react";
import { ConfigProvider, App as AntdApp, theme as antdTheme } from "antd";
import {
  ThemeProvider as MuiThemeProvider,
  CssBaseline,
  createTheme,
  responsiveFontSizes,
  type PaletteMode,
} from "@mui/material";
import { themeTokens } from "./tokens";
import { responsiveThemeOptions } from "./responsive";

const STORAGE_KEY = "sma-admin-theme-mode";

type ColorMode = Extract<PaletteMode, "light" | "dark">;

type ThemeContextValue = {
  mode: ColorMode;
  toggleMode: () => void;
  setMode: (mode: ColorMode) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

const resolveInitialMode = (): ColorMode => {
  if (typeof window === "undefined") {
    return "light";
  }

  const persisted = window.localStorage.getItem(STORAGE_KEY);
  if (persisted === "light" || persisted === "dark") {
    return persisted;
  }

  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  return prefersDark ? "dark" : "light";
};

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [mode, setMode] = React.useState<ColorMode>(() => resolveInitialMode());

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, mode);
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  const muiTheme = React.useMemo(() => {
    const baseTheme = createTheme(responsiveThemeOptions(mode));
    const theme = createTheme(baseTheme, {
      palette: {
        primary: {
          main: themeTokens.primary,
        },
        secondary: {
          main: mode === "dark" ? "#38bdf8" : "#0284c7",
        },
        success: {
          main: themeTokens.accentGreen,
        },
        warning: {
          main: themeTokens.accentOrange,
        },
        error: {
          main: themeTokens.attendanceDanger,
        },
        divider: mode === "dark" ? themeTokens.borderDark : themeTokens.borderLight,
        background: {
          default: mode === "dark" ? "#0f172a" : "#f8fafc",
          paper: mode === "dark" ? "#1e293b" : "#ffffff",
        },
        text: {
          primary: mode === "dark" ? "#f8fafc" : "#0f172a",
          secondary:
            mode === "dark" ? themeTokens.secondaryTextDark : themeTokens.secondaryTextLight,
        },
      },
      typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        h5: {
          fontWeight: 600,
          letterSpacing: "-0.01em",
        },
        h6: {
          fontWeight: 600,
          letterSpacing: "-0.01em",
        },
        subtitle1: {
          fontWeight: 600,
          fontSize: "0.9375rem",
        },
        subtitle2: {
          fontWeight: 500,
          fontSize: "0.875rem",
          color: mode === "dark" ? themeTokens.secondaryTextDark : themeTokens.secondaryTextLight,
        },
        body1: {
          fontSize: "0.875rem",
        },
        body2: {
          fontSize: "0.8125rem",
        },
        button: {
          textTransform: "none",
          fontWeight: 600,
        },
      },
      shape: {
        borderRadius: themeTokens.cardBorderRadius,
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 6,
              boxShadow: "none",
              padding: "6px 14px",
              "&:hover": {
                boxShadow: "none",
              },
              "&:focus-visible": {
                boxShadow: themeTokens.focusRing,
                outline: "none",
              },
            },
          },
        },
        MuiIconButton: {
          styleOverrides: {
            root: {
              borderRadius: 6,
              "&:focus-visible": {
                boxShadow: themeTokens.focusRing,
                outline: "none",
              },
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: themeTokens.cardBorderRadius,
              border: "1px solid",
              borderColor: mode === "dark" ? themeTokens.borderDark : themeTokens.borderLight,
              boxShadow: mode === "dark" ? "none" : themeTokens.cardShadow,
              backgroundImage: "none",
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: themeTokens.cardBorderRadius,
              border: "1px solid",
              borderColor: mode === "dark" ? themeTokens.borderDark : themeTokens.borderLight,
              boxShadow: mode === "dark" ? "none" : themeTokens.cardShadow,
              backgroundImage: "none",
            },
          },
        },
        MuiListItemButton: {
          styleOverrides: {
            root: {
              borderRadius: 6,
              paddingTop: 6,
              paddingBottom: 6,
              "&.Mui-focusVisible": {
                boxShadow: themeTokens.focusRing,
              },
            },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              padding: "8px 12px",
              borderColor: mode === "dark" ? themeTokens.borderDark : themeTokens.borderLight,
            },
            head: {
              fontWeight: 600,
              backgroundColor: mode === "dark" ? "#1e293b" : "#f8fafc",
            },
          },
        },
      },
    });

    return responsiveFontSizes(theme);
  }, [mode]);

  const antdConfig = React.useMemo(
    () => ({
      algorithm: [mode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm],
      token: {
        colorPrimary: themeTokens.primary,
        colorInfo: themeTokens.primary,
        controlHeight: 36,
        borderRadius: 6,
        colorBorder: mode === "dark" ? themeTokens.borderDark : themeTokens.borderLight,
        colorBgContainer: mode === "dark" ? "#1e293b" : "#ffffff",
        colorBgLayout: mode === "dark" ? "#0f172a" : "#f8fafc",
        colorTextSecondary:
          mode === "dark" ? themeTokens.secondaryTextDark : themeTokens.secondaryTextLight,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
    }),
    [mode]
  );

  const value = React.useMemo(
    () => ({
      mode,
      toggleMode: () => setMode((prev) => (prev === "dark" ? "light" : "dark")),
      setMode,
    }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider theme={antdConfig}>
        <MuiThemeProvider theme={muiTheme}>
          <CssBaseline enableColorScheme />
          <AntdApp>{children}</AntdApp>
        </MuiThemeProvider>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

export const useColorMode = (): ThemeContextValue => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useColorMode must be used within ThemeProvider");
  }
  return context;
};
