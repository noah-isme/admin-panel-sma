import { useList } from "../../hooks/use-refine-list";
import React from "react";
import {
  AppBar,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Chip,
  Collapse,
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
  CalendarPlus,
  SlidersHorizontal,
  BookOpen,
  UserPlus,
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
  Wrench,
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
import { Outlet, useLocation, useNavigate } from "react-router";
import { useGetIdentity, useLogout, useNavigation } from "@refinedev/core";

import { AppBreadcrumb } from "./app-breadcrumb";
import { themeTokens } from "../../theme/tokens";
import { useColorMode } from "../../theme/theme-provider";
import { ACTIVE_TERM_FILTER_FIELD, resolveActiveTerm } from "../../utils/terms";

const SKIP_LINK_ID = "main-content";
const HEADER_HEIGHT = 56;

type TermRecord = {
  id: string;
  name: string;
  active?: boolean;
  isActive?: boolean;
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
    icon: <LayoutDashboard size={16} aria-label="Dashboard" />,
    ariaLabel: "Menu Dashboard",
    path: "/dashboard",
  },
  {
    key: "akademik",
    label: "Akademik",
    icon: <GraduationCap size={16} aria-label="Menu Akademik" />,
    ariaLabel: "Kelompok menu Akademik",
    defaultOpen: true,
    children: [
      {
        key: "akademik-terms",
        label: "Tahun Ajar / Semester",
        icon: <CalendarRange size={16} aria-label="Tahun ajar" />,
        ariaLabel: "Tahun Ajar / Semester",
        resource: "terms",
      },
      {
        key: "akademik-calendar",
        label: "Kalender Akademik",
        icon: <CalendarClock size={16} aria-label="Kalender akademik" />,
        ariaLabel: "Kalender Akademik",
        path: "/calendar",
        resource: "calendar",
      },
      {
        key: "akademik-classes",
        label: "Kelas",
        icon: <GraduationCap size={16} aria-label="Kelas" />,
        ariaLabel: "Kelas",
        resource: "classes",
      },
      {
        key: "akademik-schedules",
        label: "Jadwal",
        icon: <CalendarDays size={16} aria-label="Jadwal" />,
        ariaLabel: "Jadwal",
        resource: "schedules",
      },
      {
        key: "akademik-schedule-generator",
        label: "Generator Jadwal",
        icon: <CalendarPlus size={16} aria-label="Generator jadwal" />,
        ariaLabel: "Generator Jadwal",
        path: "/schedules/generator",
      },
      {
        key: "akademik-teacher-preferences",
        label: "Preferensi Guru",
        icon: <SlidersHorizontal size={16} aria-label="Preferensi guru" />,
        ariaLabel: "Preferensi Guru",
        path: "/schedules/preferences",
      },
      {
        key: "akademik-subjects",
        label: "Mapel",
        icon: <BookOpen size={16} aria-label="Mata pelajaran" />,
        ariaLabel: "Mapel",
        resource: "subjects",
      },
      {
        key: "akademik-enrollments",
        label: "Penempatan",
        icon: <UserPlus size={16} aria-label="Penempatan" />,
        ariaLabel: "Penempatan",
        resource: "enrollments",
      },
    ],
  },
  {
    key: "penilaian",
    label: "Penilaian",
    icon: <FileBarChart size={16} aria-label="Menu penilaian" />,
    ariaLabel: "Kelompok menu Penilaian",
    defaultOpen: true,
    children: [
      {
        key: "penilaian-grade-components",
        label: "Komponen Penilaian",
        icon: <ListChecks size={16} aria-label="Komponen penilaian" />,
        ariaLabel: "Komponen Penilaian",
        resource: "grade-components",
      },
      {
        key: "penilaian-grade-configs",
        label: "Bobot / KKM",
        icon: <Gauge size={16} aria-label="Bobot dan KKM" />,
        ariaLabel: "Bobot dan KKM",
        resource: "grade-configs",
      },
      {
        key: "penilaian-grades",
        label: "Nilai & Rapor",
        icon: <FileText size={16} aria-label="Nilai dan rapor" />,
        ariaLabel: "Nilai dan Rapor",
        resource: "grades",
      },
    ],
  },
  {
    key: "resources",
    label: "Data Sumber Daya",
    icon: <Users size={16} aria-label="Data sumber daya" />,
    ariaLabel: "Kelompok menu Data Sumber Daya",
    defaultOpen: true,
    children: [
      {
        key: "resources-students",
        label: "Siswa",
        icon: <UserRound size={16} aria-label="Data siswa" />,
        ariaLabel: "Siswa",
        resource: "students",
      },
      {
        key: "resources-teachers",
        label: "Guru",
        icon: <UserCheck size={16} aria-label="Data guru" />,
        ariaLabel: "Guru",
        resource: "teachers",
      },
      {
        key: "resources-homerooms",
        label: "Wali Kelas",
        icon: <UserCircle size={16} aria-label="Wali kelas" />,
        ariaLabel: "Wali Kelas",
        path: "/homerooms",
      },
    ],
  },
  {
    key: "attendance",
    label: "Kehadiran",
    icon: <ClipboardList size={16} aria-label="Menu kehadiran" />,
    ariaLabel: "Kelompok menu Kehadiran",
    defaultOpen: true,
    children: [
      {
        key: "attendance-daily",
        label: "Absensi Harian",
        icon: <CalendarCheck size={16} aria-label="Absensi harian" />,
        ariaLabel: "Absensi Harian",
        path: "/attendance/daily",
      },
      {
        key: "attendance-summary",
        label: "Rekap Kehadiran",
        icon: <BarChart3 size={16} aria-label="Rekap kehadiran" />,
        ariaLabel: "Rekap Kehadiran",
        resource: "attendance",
      },
    ],
  },
  {
    key: "administrasi",
    label: "Administrasi",
    icon: <ShieldCheck size={16} aria-label="Menu administrasi" />,
    ariaLabel: "Kelompok menu Administrasi",
    defaultOpen: true,
    children: [
      {
        key: "administrasi-users",
        label: "Users & Roles",
        icon: <Shield size={16} aria-label="Users dan roles" />,
        ariaLabel: "Users & Roles",
        resource: "users",
      },
      {
        key: "administrasi-configuration",
        label: "Konfigurasi",
        icon: <Settings2 size={16} aria-label="Konfigurasi" />,
        ariaLabel: "Konfigurasi",
        path: "/configuration",
        resource: "settings",
      },
      {
        key: "administrasi-backup",
        label: "Backup / Restore",
        icon: <RotateCcw size={16} aria-label="Backup dan restore" />,
        ariaLabel: "Backup dan Restore",
        disabled: true,
      },
    ],
  },
  {
    key: "setup",
    label: "Setup Pra-Semester",
    icon: <Wrench size={16} aria-label="Setup pra-semester" />,
    ariaLabel: "Setup pra-semester",
    path: "/setup",
  },
  {
    key: "pre-semester-snapshot",
    label: "Snapshot Pra-Semester",
    icon: <ListChecks size={16} aria-label="Snapshot pra-semester" />,
    ariaLabel: "Snapshot pra-semester",
    path: "/setup/pre-semester-snapshot",
  },
  {
    key: "announcements",
    label: "Pengumuman",
    icon: <Megaphone size={16} aria-label="Pengumuman" />,
    ariaLabel: "Pengumuman",
    resource: "announcements",
  },
  {
    key: "notes",
    label: "Catatan",
    icon: <NotebookPen size={16} aria-label="Catatan" />,
    ariaLabel: "Catatan",
    resource: "behavior-notes",
  },
  {
    key: "logout",
    label: "Keluar",
    icon: <LogOut size={16} aria-label="Keluar" />,
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
    ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.08)
    : isAncestor
      ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.04)
      : "transparent";

  const textColor = item.danger
    ? theme.palette.error.main
    : isActive
      ? theme.palette.primary.main
      : theme.palette.text.primary;

  return (
    <ListItem disablePadding sx={{ mb: 0.25 }}>
      <ListItemButton
        onClick={onClick}
        disabled={item.disabled}
        selected={isActive}
        aria-expanded={hasChildren ? isOpen : undefined}
        sx={{
          pl: depth * 1.5 + 1.5,
          pr: hasChildren ? 1 : 1.5,
          py: 0.75,
          borderRadius: "6px",
          alignItems: "center",
          borderLeft: isActive
            ? `3px solid ${theme.palette.primary.main}`
            : "3px solid transparent",
          backgroundColor: background,
          transition: "all 0.15s ease",
          "&:hover": {
            backgroundColor: alpha(
              theme.palette.primary.main,
              theme.palette.mode === "dark" ? 0.12 : 0.06
            ),
          },
          "&.Mui-disabled": {
            opacity: 0.4,
            cursor: "not-allowed",
          },
        }}
      >
        <ListItemIcon
          aria-label={item.ariaLabel}
          sx={{
            minWidth: 28,
            color: isActive
              ? theme.palette.primary.main
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
                  fontWeight: isActive ? 600 : 500,
                  fontSize: depth > 0 ? 13 : 13.5,
                  color: textColor,
                  lineHeight: 1.4,
                }}
              >
                {item.label}
              </Typography>
            }
          />
        )}
        {hasChildren && !sidebarCollapsed ? (
          <Box
            component="span"
            sx={{
              display: "flex",
              alignItems: "center",
              color:
                isActive || isAncestor ? theme.palette.primary.main : theme.palette.text.secondary,
              transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 0.15s ease",
            }}
            aria-label={isOpen ? "Tutup grup" : "Buka grup"}
          >
            <ChevronDown size={14} aria-hidden="true" focusable="false" />
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
  const navigate = useNavigate();
  const { list } = useNavigation();
  const { data: identity } = useGetIdentity<{ id: string; name?: string; email?: string }>();
  const {
    result: activeTerms,
    query: { isLoading: isLoadingTerms },
  } = useList<TermRecord>({
    resource: "terms",
    filters: [{ field: ACTIVE_TERM_FILTER_FIELD, operator: "eq", value: true }],
    pagination: { currentPage: 1, pageSize: 5 },
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
        navigate(item.path);
        setMobileNavOpen(false);
      }
    },
    [list, navigate]
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
        <Box key={item.key} sx={{ mb: 0.5 }}>
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
            <Box sx={{ pl: 0.5 }}>{renderNavItems(item.children ?? [], depth + 1)}</Box>
          </Collapse>
        </Box>
      );
    });

  const activeTerm = resolveActiveTerm(activeTerms?.data);

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
      navigate(target.path);
    } else if (target?.resource) {
      list(target.resource);
    }
    setBottomValue(value);
  };

  const sidebarContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        px: sidebarCollapsed ? 1 : 2,
        py: 2,
      }}
    >
      <Box sx={{ flex: 1, overflowY: "auto", pr: 0.5 }}>
        <List disablePadding>{renderNavItems(navItems)}</List>
      </Box>
      <Box
        sx={{
          mt: "auto",
          pt: 1.5,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Tooltip title={sidebarCollapsed ? "Perluas sidebar" : "Minimalkan sidebar"}>
          <IconButton
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            color="default"
            aria-label={sidebarCollapsed ? "Perluas sidebar" : "Minimalkan sidebar"}
            size="small"
            sx={{
              width: "100%",
              borderRadius: "6px",
              py: 0.75,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            {sidebarCollapsed ? (
              <ChevronRight size={16} aria-label="Perluas sidebar" />
            ) : (
              <ChevronLeft size={16} aria-label="Minimalkan sidebar" />
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
          borderRadius: 2,
          zIndex: theme.zIndex.tooltip,
          fontSize: 13,
          fontWeight: 600,
          transition: "top 0.2s ease",
          "&:focus": {
            top: 12,
          },
        }}
      >
        Lewati ke konten utama
      </Box>

      {/* Header - desktop dan mobile */}
      {isMdUp ? (
        <Box
          component="header"
          sx={{
            px: { xs: 2, md: 3 },
            height: HEADER_HEIGHT,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            position: "sticky",
            top: 0,
            zIndex: theme.zIndex.appBar,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "6px",
                bgcolor: themeTokens.primary,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "-0.02em",
              }}
              aria-label="Logo sekolah"
            >
              HN
            </Box>
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, fontSize: 15, lineHeight: 1.2 }}
              >
                SMA Harapan Nusantara
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 11.5 }}>
                Panel Administrasi Akademik
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
              Tahun Ajar:
            </Typography>
            {isLoadingTerms ? (
              <Skeleton variant="rounded" width={100} height={24} aria-label="Memuat tahun ajar" />
            ) : (
              <Chip
                label={activeTerm?.name ?? "Belum dipilih"}
                color={activeTerm ? "primary" : "default"}
                size="small"
                variant="outlined"
                sx={{
                  fontWeight: 600,
                  fontSize: 12,
                  height: 24,
                  borderRadius: "4px",
                }}
              />
            )}
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Tooltip title={mode === "dark" ? "Matikan mode gelap" : "Aktifkan mode gelap"}>
              <IconButton
                onClick={toggleMode}
                color="default"
                aria-label={mode === "dark" ? "Matikan mode gelap" : "Aktifkan mode gelap"}
                size="small"
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "6px",
                  p: 0.75,
                }}
              >
                {mode === "dark" ? (
                  <Sun size={16} aria-label="Ikon mode terang" />
                ) : (
                  <Moon size={16} aria-label="Ikon mode gelap" />
                )}
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  width: 32,
                  height: 32,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {identity?.name?.[0] ?? "P"}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>
                  {identity?.name ?? "Pengguna"}
                </Typography>
                {identity?.email ? (
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", fontSize: 11, display: "block" }}
                  >
                    {identity.email}
                  </Typography>
                ) : null}
              </Box>
            </Stack>
          </Stack>
        </Box>
      ) : (
        <AppBar
          position="sticky"
          color="default"
          elevation={0}
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Toolbar sx={{ gap: 1, justifyContent: "space-between", minHeight: 48, px: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1 }}>
              <IconButton
                color="default"
                aria-label={mobileNavOpen ? "Tutup navigasi" : "Buka navigasi"}
                onClick={() => setMobileNavOpen((prev) => !prev)}
                size="small"
              >
                <Menu size={18} />
              </IconButton>
              <Typography variant="h6" component="h1" sx={{ fontWeight: 600, fontSize: 15 }}>
                {pageTitle}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Cari">
                <IconButton color="default" aria-label="Buka pencarian" size="small">
                  <Search size={16} />
                </IconButton>
              </Tooltip>
              <Tooltip title={mode === "dark" ? "Matikan mode gelap" : "Aktifkan mode gelap"}>
                <IconButton
                  onClick={toggleMode}
                  color="default"
                  aria-label={mode === "dark" ? "Matikan mode gelap" : "Aktifkan mode gelap"}
                  size="small"
                >
                  {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </IconButton>
              </Tooltip>
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  width: 28,
                  height: 28,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {identity?.name?.[0] ?? "P"}
              </Avatar>
            </Stack>
          </Toolbar>
        </AppBar>
      )}

      {/* Main layout */}
      <Box sx={{ display: "flex", minHeight: `calc(100vh - ${HEADER_HEIGHT}px)` }}>
        {/* Sidebar - desktop fixed, mobile drawer */}
        {isMdUp ? (
          <Box
            component="aside"
            sx={{
              width: sidebarCollapsed ? 68 : 250,
              borderRight: "1px solid",
              borderColor: "divider",
              backgroundColor: theme.palette.background.paper,
              transition: "width 0.2s ease",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              position: "sticky",
              top: HEADER_HEIGHT,
              height: `calc(100vh - ${HEADER_HEIGHT}px)`,
            }}
          >
            {sidebarContent}
          </Box>
        ) : (
          <Drawer
            anchor="left"
            open={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
            ModalProps={{ keepMounted: true }}
            PaperProps={{
              sx: {
                width: "85%",
                maxWidth: 320,
                backgroundColor: theme.palette.background.paper,
              },
            }}
          >
            <Box sx={{ px: 2.5, py: 2.5 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: "6px",
                    bgcolor: themeTokens.primary,
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  HN
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: 14 }}>
                    SMA Harapan Nusantara
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Admin Panel
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
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
                    variant="outlined"
                    sx={{ fontWeight: 600, height: 22, fontSize: 11 }}
                  />
                )}
              </Stack>
              <Divider sx={{ my: 1.5 }} />
            </Box>

            <Box sx={{ flex: 1, overflowY: "auto", px: 1.5 }}>
              <List disablePadding>{renderNavItems(navItems)}</List>
            </Box>

            <Box
              sx={{
                px: 2.5,
                py: 2,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    width: 32,
                    height: 32,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {identity?.name?.[0] ?? "P"}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 13 }}>
                    {identity?.name ?? "Pengguna"}
                  </Typography>
                  {identity?.email ? (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
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
            pb: isMdUp ? 0 : 7,
          }}
        >
          <Box
            sx={{
              width: "100%",
              px: { xs: 1.5, sm: 2, md: 2.5 },
              py: { xs: 2, md: 2.5 },
            }}
          >
            <Box
              id={SKIP_LINK_ID}
              sx={{
                bgcolor: theme.palette.background.paper,
                borderRadius: `${themeTokens.cardBorderRadius}px`,
                border: "1px solid",
                borderColor: "divider",
                boxShadow: mode === "dark" ? "none" : themeTokens.cardShadow,
                p: { xs: 2, sm: 2.5, md: 3.5 },
                minHeight: "calc(100vh - 120px)",
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
            borderTop: "1px solid",
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
