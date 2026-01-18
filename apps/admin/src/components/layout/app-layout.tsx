import React from "react";
import {
  AppBar,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Chip,
  Collapse,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  LayoutDashboard,
  GraduationCap,
  CalendarRange,
  CalendarDays,
  CalendarClock,
  Sparkles,
  SlidersHorizontal,
  BookOpen,
  FileBarChart,
  ListChecks,
  Gauge,
  FileText,
  Users,
  UserRound,
  UserCheck,
  UserCircle,
  ClipboardList,
  CalendarCheck,
  BarChart3,
  ShieldCheck,
  Shield,
  Settings2,
  RotateCcw,
  Megaphone,
  NotebookPen,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  Search,
} from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import { useGetIdentity, useList, useLogout, useNavigation } from "@refinedev/core";

import { AppBreadcrumb } from "./app-breadcrumb";
import { themeTokens } from "../../theme/tokens";
import { useColorMode } from "../../theme/theme-provider";

const SKIP_LINK_ID = "main-content";

type TermRecord = {
  id: string;
  name: string;
  active?: boolean;
};

type NavNode = {
  key: string;
  label: string;
  icon: React.ReactNode;
  ariaLabel: string;
  path?: string;
  resource?: string;
  disabled?: boolean;
  danger?: boolean;
  onClick?: () => void;
  children?: NavNode[];
  defaultOpen?: boolean;
};

type ActiveState = { key?: string; ancestors: string[]; score: number };

type BottomNavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  resource?: string;
  onClick?: () => void;
};

const NAV_ITEMS = (logout: () => void): NavNode[] => [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={18} aria-label="Dashboard" />,
    ariaLabel: "Menu Dashboard",
    path: "/dashboard",
  },
  {
    key: "akademik",
    label: "Akademik",
    icon: <GraduationCap size={18} aria-label="Menu Akademik" />,
    ariaLabel: "Kelompok menu Akademik",
    defaultOpen: true,
    children: [
      {
        key: "akademik-terms",
        label: "Tahun Ajar / Semester",
        icon: <CalendarRange size={18} aria-label="Tahun ajar" />,
        ariaLabel: "Tahun Ajar / Semester",
        resource: "terms",
      },
      {
        key: "akademik-calendar",
        label: "Kalender Akademik",
        icon: <CalendarClock size={18} aria-label="Kalender akademik" />,
        ariaLabel: "Kalender Akademik",
        path: "/calendar",
        resource: "calendar",
      },
      {
        key: "akademik-classes",
        label: "Kelas",
        icon: <GraduationCap size={18} aria-label="Kelas" />,
        ariaLabel: "Kelas",
        resource: "classes",
      },
      {
        key: "akademik-schedules",
        label: "Jadwal",
        icon: <CalendarDays size={18} aria-label="Jadwal" />,
        ariaLabel: "Jadwal",
        resource: "schedules",
      },
      {
        key: "akademik-schedule-generator",
        label: "Generator Jadwal",
        icon: <Sparkles size={18} aria-label="Generator jadwal" />,
        ariaLabel: "Generator Jadwal",
        path: "/schedules/generator",
      },
      {
        key: "akademik-teacher-preferences",
        label: "Preferensi Guru",
        icon: <SlidersHorizontal size={18} aria-label="Preferensi guru" />,
        ariaLabel: "Preferensi Guru",
        path: "/schedules/preferences",
      },
      {
        key: "akademik-subjects",
        label: "Mapel",
        icon: <BookOpen size={18} aria-label="Mata pelajaran" />,
        ariaLabel: "Mapel",
        resource: "subjects",
      },
      {
        key: "akademik-enrollments",
        label: "Penempatan",
        icon: <DeploymentUnitOutlined size={18} aria-label="Penempatan" />,
        ariaLabel: "Penempatan",
        resource: "enrollments",
      },
    ],
  },
  {
    key: "penilaian",
    label: "Penilaian",
    icon: <FileBarChart size={18} aria-label="Menu penilaian" />,
    ariaLabel: "Kelompok menu Penilaian",
    defaultOpen: true,
    children: [
      {
        key: "penilaian-grade-components",
        label: "Komponen Penilaian",
        icon: <ListChecks size={18} aria-label="Komponen penilaian" />,
        ariaLabel: "Komponen Penilaian",
        resource: "grade-components",
      },
      {
        key: "penilaian-grade-configs",
        label: "Bobot / KKM",
        icon: <Gauge size={18} aria-label="Bobot dan KKM" />,
        ariaLabel: "Bobot dan KKM",
        resource: "grade-configs",
      },
      {
        key: "penilaian-grades",
        label: "Nilai & Rapor",
        icon: <FileText size={18} aria-label="Nilai dan rapor" />,
        ariaLabel: "Nilai dan Rapor",
        resource: "grades",
      },
    ],
  },
  {
    key: "resources",
    label: "Data Sumber Daya",
    icon: <Users size={18} aria-label="Data sumber daya" />,
    ariaLabel: "Kelompok menu Data Sumber Daya",
    defaultOpen: true,
    children: [
      {
        key: "resources-students",
        label: "Siswa",
        icon: <UserRound size={18} aria-label="Data siswa" />,
        ariaLabel: "Siswa",
        resource: "students",
      },
      {
        key: "resources-teachers",
        label: "Guru",
        icon: <UserCheck size={18} aria-label="Data guru" />,
        ariaLabel: "Guru",
        resource: "teachers",
      },
      {
        key: "resources-homerooms",
        label: "Wali Kelas",
        icon: <UserCircle size={18} aria-label="Wali kelas" />,
        ariaLabel: "Wali Kelas",
        path: "/homerooms",
      },
    ],
  },
  {
    key: "attendance",
    label: "Kehadiran",
    icon: <ClipboardList size={18} aria-label="Menu kehadiran" />,
    ariaLabel: "Kelompok menu Kehadiran",
    defaultOpen: true,
    children: [
      {
        key: "attendance-daily",
        label: "Absensi Harian",
        icon: <CalendarCheck size={18} aria-label="Absensi harian" />,
        ariaLabel: "Absensi Harian",
        path: "/attendance/daily",
      },
      {
        key: "attendance-summary",
        label: "Rekap Kehadiran",
        icon: <BarChart3 size={18} aria-label="Rekap kehadiran" />,
        ariaLabel: "Rekap Kehadiran",
        resource: "attendance",
      },
    ],
  },
  {
    key: "administrasi",
    label: "Administrasi",
    icon: <ShieldCheck size={18} aria-label="Menu administrasi" />,
    ariaLabel: "Kelompok menu Administrasi",
    defaultOpen: true,
    children: [
      {
        key: "administrasi-users",
        label: "Users & Roles",
        icon: <Shield size={18} aria-label="Users dan roles" />,
        ariaLabel: "Users & Roles",
        resource: "users",
      },
      {
        key: "administrasi-configuration",
        label: "Konfigurasi",
        icon: <Settings2 size={18} aria-label="Konfigurasi" />,
        ariaLabel: "Konfigurasi",
        path: "/configuration",
        resource: "settings",
      },
      {
        key: "administrasi-backup",
        label: "Backup / Restore",
        icon: <RotateCcw size={18} aria-label="Backup dan restore" />,
        ariaLabel: "Backup dan Restore",
        disabled: true,
      },
    ],
  },
  {
    key: "setup",
    label: "Setup Pra-Semester",
    icon: <Sparkles size={18} aria-label="Setup pra-semester" />,
    ariaLabel: "Setup pra-semester",
    path: "/setup",
  },
  {
    key: "import-status",
    label: "Status Import",
    icon: <ListChecks size={18} aria-label="Status import" />,
    ariaLabel: "Status import",
    path: "/setup/import-status",
  },
  {
    key: "announcements",
    label: "Pengumuman",
    icon: <Megaphone size={18} aria-label="Pengumuman" />,
    ariaLabel: "Pengumuman",
    resource: "announcements",
  },
  {
    key: "notes",
    label: "Catatan",
    icon: <NotebookPen size={18} aria-label="Catatan" />,
    ariaLabel: "Catatan",
    resource: "behavior-notes",
  },
  {
    key: "logout",
    label: "Keluar",
    icon: <LogOut size={18} aria-label="Keluar" />,
    ariaLabel: "Keluar",
    danger: true,
    onClick: logout,
  },
];

const getItemPath = (item: NavNode): string | undefined =>
  item.path ?? (item.resource ? `/${item.resource}` : undefined);

const matchScore = (item: NavNode, pathname: string) => {
  const path = getItemPath(item);
  if (!path) {
    return -1;
  }
  if (pathname === path) {
    return path.length;
  }
  if (pathname.startsWith(`${path}/`)) {
    return path.length;
  }
  return -1;
};

const resolveActiveState = (
  items: NavNode[],
  pathname: string,
  ancestors: string[] = []
): ActiveState => {
  let active: ActiveState = { key: undefined, ancestors, score: -1 };

  items.forEach((item) => {
    const itemScore = matchScore(item, pathname);
    if (itemScore > active.score) {
      active = { key: item.key, ancestors, score: itemScore };
    }

    if (item.children) {
      const childActive = resolveActiveState(item.children, pathname, [...ancestors, item.key]);
      if (childActive.score > active.score) {
        active = childActive;
      }
    }
  });

  return active;
};

const NavListItem: React.FC<{
  item: NavNode;
  isActive: boolean;
  isAncestor: boolean;
  depth: number;
  onClick: () => void;
  hasChildren?: boolean;
  isOpen?: boolean;
  sidebarCollapsed?: boolean;
}> = ({
  item,
  isActive,
  isAncestor,
  depth,
  onClick,
  hasChildren = false,
  isOpen = false,
  sidebarCollapsed = false,
}) => {
  const theme = useTheme();
  const background = isActive
    ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.22 : 0.12)
    : isAncestor
      ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08)
      : "transparent";
  const textColor = item.danger
    ? theme.palette.error.main
    : theme.palette.mode === "dark"
      ? theme.palette.grey[100]
      : theme.palette.text.primary;

  return (
    <ListItem disablePadding sx={{ mb: 0.5 }}>
      <ListItemButton
        onClick={onClick}
        disabled={item.disabled}
        selected={isActive}
        aria-expanded={hasChildren ? isOpen : undefined}
        sx={{
          pl: depth * 2 + 2,
          pr: hasChildren ? 1.5 : 2,
          borderRadius: 12,
          alignItems: "center",
          borderLeft: `3px solid ${isActive ? theme.palette.primary.main : "transparent"}`,
          backgroundColor: background,
          transition: "background-color 0.2s ease, border-color 0.2s ease",
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
          },
          "&.Mui-disabled": {
            opacity: 0.5,
            cursor: "not-allowed",
          },
        }}
      >
        <ListItemIcon
          aria-label={item.ariaLabel}
          sx={{
            minWidth: 36,
            color: isActive
              ? theme.palette.primary.main
              : theme.palette.mode === "dark"
                ? theme.palette.grey[300]
                : item.danger
                  ? theme.palette.error.main
                  : theme.palette.text.secondary,
          }}
        >
          {item.icon}
        </ListItemIcon>
        {!sidebarCollapsed && (
          <ListItemText
            primary={
              <Typography
                component="span"
                sx={{
                  fontWeight: isActive ? 700 : 500,
                  fontSize: depth > 0 ? 14 : 15,
                  color: textColor,
                }}
              >
                {item.label}
              </Typography>
            }
          />
        )}
        {hasChildren ? (
          <Box
            component="span"
            sx={{
              display: "flex",
              alignItems: "center",
              color:
                isActive || isAncestor
                  ? theme.palette.primary.main
                  : theme.palette.mode === "dark"
                    ? theme.palette.grey[400]
                    : theme.palette.text.secondary,
              transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 0.2s ease",
            }}
            aria-label={isOpen ? "Tutup grup" : "Buka grup"}
          >
            <ChevronDown size={16} aria-hidden="true" focusable="false" />
          </Box>
        ) : null}
      </ListItemButton>
    </ListItem>
  );
};

const findNavItem = (items: NavNode[], key?: string): NavNode | undefined => {
  if (!key) return undefined;
  for (const item of items) {
    if (item.key === key) return item;
    if (item.children) {
      const found = findNavItem(item.children, key);
      if (found) return found;
    }
  }
  return undefined;
};

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={18} aria-hidden="true" focusable="false" />,
    path: "/dashboard",
  },
  {
    key: "akademik",
    label: "Akademik",
    icon: <GraduationCap size={18} aria-hidden="true" focusable="false" />,
    path: "/classes",
  },
  {
    key: "resources-students",
    label: "Data",
    icon: <Users size={18} aria-hidden="true" focusable="false" />,
    path: "/students",
  },
  {
    key: "attendance-daily",
    label: "Kehadiran",
    icon: <CalendarCheck size={18} aria-hidden="true" focusable="false" />,
    path: "/attendance/daily",
  },
  {
    key: "more",
    label: "Lainnya",
    icon: <Menu size={18} aria-hidden="true" focusable="false" />,
  },
];

export const AppLayout: React.FC = () => {
  const { mutate: logoutMutate } = useLogout();
  const location = useLocation();
  const { list, push } = useNavigation();
  const { data: identity } = useGetIdentity<{ id: string; name?: string; email?: string }>();
  const { data: activeTerms, isLoading: isLoadingTerms } = useList<TermRecord>({
    resource: "terms",
    filters: [{ field: "active", operator: "eq", value: true }],
    pagination: { current: 1, pageSize: 5 },
  });
  const { mode, toggleMode } = useColorMode();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));

  const navItems = React.useMemo(() => NAV_ITEMS(() => logoutMutate()), [logoutMutate]);
  const activeState = React.useMemo(
    () => resolveActiveState(navItems, location.pathname),
    [navItems, location.pathname]
  );

  const defaultOpen = React.useMemo(
    () => navItems.filter((item) => item.children && item.defaultOpen).map((item) => item.key),
    [navItems]
  );

  const [openGroups, setOpenGroups] = React.useState<string[]>(defaultOpen);

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    setOpenGroups((prev) => {
      const withActive = new Set(prev);
      activeState.ancestors.forEach((ancestor) => withActive.add(ancestor));
      return Array.from(withActive);
    });
  }, [activeState.ancestors]);

  React.useEffect(() => {
    if (isMdUp) {
      setMobileNavOpen(false);
    }
  }, [isMdUp]);

  const handleNavigate = React.useCallback(
    (item: NavNode) => {
      if (item.disabled) {
        return;
      }
      if (item.onClick) {
        item.onClick();
        setMobileNavOpen(false);
        return;
      }
      if (item.resource) {
        list(item.resource);
        setMobileNavOpen(false);
        return;
      }
      if (item.path) {
        push(item.path);
        setMobileNavOpen(false);
      }
    },
    [list, push]
  );

  const renderNavItems = (items: NavNode[], depth = 0): React.ReactNode =>
    items.map((item) => {
      const isGroup = Boolean(item.children?.length);
      const isActive = activeState.key === item.key;
      const isAncestor = activeState.ancestors.includes(item.key);

      if (!isGroup) {
        return (
          <NavListItem
            key={item.key}
            item={item}
            isActive={isActive}
            isAncestor={isAncestor}
            depth={depth}
            onClick={() => handleNavigate(item)}
            hasChildren={false}
            sidebarCollapsed={sidebarCollapsed}
          />
        );
      }

      const isOpen = openGroups.includes(item.key);

      return (
        <Box key={item.key} sx={{ mb: 1 }}>
          <NavListItem
            item={item}
            isActive={isActive}
            isAncestor={isAncestor}
            depth={depth}
            hasChildren
            isOpen={isOpen}
            onClick={() =>
              setOpenGroups((prev) =>
                prev.includes(item.key)
                  ? prev.filter((key) => key !== item.key)
                  : [...prev, item.key]
              )
            }
            sidebarCollapsed={sidebarCollapsed}
          />
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <Box sx={{ pl: 1.5 }}>{renderNavItems(item.children ?? [], depth + 1)}</Box>
          </Collapse>
        </Box>
      );
    });

  const activeTerm =
    activeTerms?.data?.find((term) => term.active) ?? activeTerms?.data?.[0] ?? null;

  const activeItem = React.useMemo(
    () => findNavItem(navItems, activeState.key),
    [navItems, activeState.key]
  );
  const pageTitle = activeItem?.label ?? "SMA Admin";

  const activeBottomKey = React.useMemo(() => {
    const directMatch = BOTTOM_NAV_ITEMS.find((item) => {
      const itemPath = item.path ?? (item.resource ? `/${item.resource}` : undefined);
      if (!itemPath) return false;
      return location.pathname.startsWith(itemPath);
    });
    if (directMatch) {
      return directMatch.key;
    }
    if (activeState.key) {
      return activeState.key;
    }
    return "dashboard";
  }, [location.pathname, activeState.key]);

  const [bottomValue, setBottomValue] = React.useState(activeBottomKey);
  React.useEffect(() => {
    setBottomValue(activeBottomKey);
  }, [activeBottomKey]);

  const handleBottomChange = (_: React.SyntheticEvent, value: string) => {
    if (value === "more") {
      setMobileNavOpen(true);
      setBottomValue(value);
      return;
    }
    const target = BOTTOM_NAV_ITEMS.find((item) => item.key === value);
    if (target?.path) {
      push(target.path);
    } else if (target?.resource) {
      list(target.resource);
    }
    setBottomValue(value);
  };

  // Sidebar/drawer content untuk desktop dan mobile
  const sidebarContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        px: sidebarCollapsed ? 1 : 3,
        py: 3,
      }}
    >
      <Box sx={{ flex: 1, maxHeight: "calc(100vh - 200px)", overflowY: "auto", pr: 1 }}>
        <List disablePadding>{renderNavItems(navItems)}</List>
      </Box>
      <Box
        sx={{
          mt: "auto",
          pt: 2,
          borderTop: `1px solid ${alpha(theme.palette.text.secondary, 0.08)}`,
        }}
      >
        <Tooltip title={sidebarCollapsed ? "Perluas sidebar" : "Minimalkan sidebar"}>
          <IconButton
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            color="primary"
            aria-label={sidebarCollapsed ? "Perluas sidebar" : "Minimalkan sidebar"}
            size="small"
            sx={{
              width: "100%",
              borderRadius: 2,
              py: 1,
              "&:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              },
            }}
          >
            {sidebarCollapsed ? (
              <ChevronRight size={18} aria-label="Perluas sidebar" />
            ) : (
              <ChevronLeft size={18} aria-label="Minimalkan sidebar" />
            )}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: theme.palette.background.default }}>
      {/* Skip link untuk accessibility */}
      <Box
        component="a"
        href={`#${SKIP_LINK_ID}`}
        sx={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          top: -40,
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          px: 2,
          py: 1,
          borderRadius: 999,
          zIndex: theme.zIndex.tooltip,
          transition: "top 0.3s",
          "&:focus": {
            top: 16,
          },
        }}
      >
        Lewati ke konten utama
      </Box>

      {/* Header - tampil berbeda untuk desktop dan mobile */}
      {isMdUp ? (
        // Desktop header (pertahankan layout lama)
        <Box
          component="header"
          sx={{
            px: 4,
            py: 2.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 3,
            borderBottom: `1px solid ${alpha(theme.palette.text.secondary, 0.12)}`,
            position: "sticky",
            top: 0,
            zIndex: 10,
            backdropFilter: "blur(12px)",
            backgroundColor: alpha(theme.palette.background.default, 0.9),
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 14,
                bgcolor: themeTokens.primary,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 18,
              }}
              aria-label="Logo sekolah"
            >
              HN
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: -0.3 }}>
                SMA Harapan Nusantara
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Panel Administrasi Akademik
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Tahun Ajar Aktif
            </Typography>
            {isLoadingTerms ? (
              <Skeleton variant="rounded" width={120} height={28} aria-label="Memuat tahun ajar" />
            ) : (
              <Chip
                label={activeTerm?.name ?? "Belum dipilih"}
                color={activeTerm ? "primary" : "default"}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <Tooltip title={mode === "dark" ? "Matikan mode gelap" : "Aktifkan mode gelap"}>
              <IconButton
                onClick={toggleMode}
                color="primary"
                aria-label={mode === "dark" ? "Matikan mode gelap" : "Aktifkan mode gelap"}
                size="small"
              >
                {mode === "dark" ? (
                  <Sun size={18} aria-label="Ikon mode terang" />
                ) : (
                  <Moon size={18} aria-label="Ikon mode gelap" />
                )}
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ height: 36 }} />
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: theme.palette.primary.main,
              }}
            >
              {identity?.name?.[0] ?? "P"}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {identity?.name ?? "Pengguna"}
              </Typography>
              {identity?.email ? (
                <Typography variant="body2" color="text.secondary">
                  {identity.email}
                </Typography>
              ) : null}
            </Box>
          </Stack>
        </Box>
      ) : (
        // Mobile header - AppBar simpel
        <AppBar
          position="sticky"
          color="default"
          elevation={0}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Toolbar sx={{ gap: 1, justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1 }}>
              <IconButton
                color="primary"
                aria-label={mobileNavOpen ? "Tutup navigasi" : "Buka navigasi"}
                onClick={() => setMobileNavOpen((prev) => !prev)}
              >
                <Menu size={20} />
              </IconButton>
              <Typography variant="h6" component="h1" sx={{ fontWeight: 700, fontSize: 16 }}>
                {pageTitle}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Cari">
                <IconButton color="primary" aria-label="Buka pencarian" size="small">
                  <Search size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title={mode === "dark" ? "Matikan mode gelap" : "Aktifkan mode gelap"}>
                <IconButton
                  onClick={toggleMode}
                  color="primary"
                  aria-label={mode === "dark" ? "Matikan mode gelap" : "Aktifkan mode gelap"}
                  size="small"
                >
                  {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </IconButton>
              </Tooltip>
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: theme.palette.primary.main,
                  width: 32,
                  height: 32,
                }}
              >
                {identity?.name?.[0] ?? "P"}
              </Avatar>
            </Stack>
          </Toolbar>
        </AppBar>
      )}

      {/* Main layout */}
      <Box sx={{ display: "flex", minHeight: "calc(100vh - 80px)" }}>
        {/* Sidebar - desktop fixed, mobile drawer */}
        {isMdUp ? (
          // Desktop sidebar (pertahankan tampilan lama)
          <Box
            component="aside"
            sx={{
              width: sidebarCollapsed ? 100 : 292,
              px: sidebarCollapsed ? 1 : 3,
              py: 4,
              borderRight: `1px solid ${alpha(theme.palette.text.secondary, 0.12)}`,
              backgroundColor: theme.palette.mode === "dark" ? "#0b1220" : "#ffffff",
              transition: "width 0.3s ease, padding 0.3s ease",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {sidebarContent}
          </Box>
        ) : (
          // Mobile drawer
          <Drawer
            anchor="left"
            open={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
            ModalProps={{ keepMounted: true }}
            PaperProps={{
              sx: {
                width: "85%",
                maxWidth: 360,
                backgroundColor: theme.palette.mode === "dark" ? "#0b1220" : "#ffffff",
              },
            }}
          >
            <Box sx={{ px: 3, py: 3 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    bgcolor: themeTokens.primary,
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  HN
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    SMA Harapan Nusantara
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Admin Panel
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Tahun Ajar:
                </Typography>
                {isLoadingTerms ? (
                  <Skeleton variant="rounded" width={80} height={20} />
                ) : (
                  <Chip
                    label={activeTerm?.name ?? "Belum dipilih"}
                    color={activeTerm ? "primary" : "default"}
                    size="small"
                    sx={{ fontWeight: 600, height: 24 }}
                  />
                )}
              </Stack>
              <Divider sx={{ mb: 2 }} />
            </Box>

            <Box sx={{ flex: 1, overflowY: "auto", px: 2 }}>
              <List disablePadding>{renderNavItems(navItems)}</List>
            </Box>

            <Box
              sx={{
                px: 3,
                py: 2,
                borderTop: `1px solid ${alpha(theme.palette.text.secondary, 0.08)}`,
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    color: theme.palette.primary.main,
                    width: 36,
                    height: 36,
                  }}
                >
                  {identity?.name?.[0] ?? "P"}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 14 }}>
                    {identity?.name ?? "Pengguna"}
                  </Typography>
                  {identity?.email ? (
                    <Typography variant="caption" color="text.secondary">
                      {identity.email}
                    </Typography>
                  ) : null}
                </Box>
              </Stack>
            </Box>
          </Drawer>
        )}

        {/* Main content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            backgroundColor: theme.palette.background.default,
            overflow: "auto",
            pb: isMdUp ? 0 : 7, // padding bottom untuk bottom nav di mobile
          }}
        >
          <Box
            sx={{
              width: "100%",
              px: { xs: 1.5, sm: 2, md: 2.5 },
              py: { xs: 2, md: 3 },
            }}
          >
            <Box
              id={SKIP_LINK_ID}
              sx={{
                bgcolor: theme.palette.background.paper,
                borderRadius: 2,
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
                p: { xs: 2, sm: 3, md: 4 },
                minHeight: "calc(100vh - 160px)",
                overflow: "visible",
              }}
            >
              <AppBreadcrumb />
              <Outlet />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Bottom navigation untuk mobile */}
      {!isMdUp && (
        <BottomNavigation
          showLabels
          value={bottomValue}
          onChange={handleBottomChange}
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            borderTop: 1,
            borderColor: "divider",
            backgroundColor: theme.palette.background.paper,
            zIndex: theme.zIndex.appBar,
          }}
        >
          {BOTTOM_NAV_ITEMS.map((item) => (
            <BottomNavigationAction
              key={item.key}
              label={item.label}
              value={item.key}
              icon={item.icon}
              sx={{ minWidth: "auto", px: 0.5 }}
            />
          ))}
        </BottomNavigation>
      )}
    </Box>
  );
};
