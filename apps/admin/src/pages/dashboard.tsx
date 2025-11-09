import React from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Collapse,
  Grid,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { useList, useNavigation } from "@refinedev/core";
import { BarChart3, Users, AlertTriangle, ChevronUp, ChevronDown } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import type { Theme } from "@mui/material/styles";

import { SummaryCard } from "../components/dashboard/summary-card";
import { themeTokens } from "../theme/tokens";
import { formatWeekLabel, percent } from "../utils/format";

const EMPTY_MESSAGE = "Belum ada data. Tambahkan siswa/guru terlebih dulu.";

type DistributionBucket = {
  range: string;
  count: number;
};

type ClassSummary = {
  classId: string;
  className: string;
  average: number;
  highest: number;
  lowest: number;
};

type AttendanceByClass = {
  classId: string;
  className: string;
  percentage: number;
};

type AttendanceAlert = {
  classId: string;
  className: string;
  indicator: string;
  percentage: number;
  week: string;
  trend?: number[];
};

type PrincipalDashboard = {
  updatedAt: string;
  distribution: {
    overallAverage: number;
    totalStudents: number;
    byRange: DistributionBucket[];
    byClass: ClassSummary[];
  };
  remedial: { studentId: string }[];
  attendance: {
    overall: number;
    byClass: AttendanceByClass[];
    alerts: AttendanceAlert[];
  };
};

type Order = "asc" | "desc";

const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 4,
  columns = 3,
}) => (
  <Box role="status" aria-live="polite" sx={{ py: 2 }}>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <Stack direction="row" spacing={2} key={`skeleton-row-${rowIndex}`} sx={{ mb: 1 }}>
        {Array.from({ length: columns }).map((__, columnIndex) => (
          <Skeleton
            key={`skeleton-cell-${rowIndex}-${columnIndex}`}
            variant="rounded"
            height={24}
            width={`${80 + columnIndex * 30}px`}
            sx={{ flex: 1 }}
          />
        ))}
      </Stack>
    ))}
  </Box>
);

const EmptyState: React.FC<{ message?: string }> = ({ message = EMPTY_MESSAGE }) => (
  <Box py={6} textAlign="center">
    <Typography variant="body2" color="text.secondary">
      {message}
    </Typography>
  </Box>
);

const scoreColor = (score: number, palette: Theme["palette"]) => {
  if (score >= 90) return palette.success.main;
  if (score >= 80) return palette.primary.main;
  if (score >= 70) return palette.warning.main;
  return palette.error.main;
};

export const DashboardPage: React.FC = () => {
  const { list, push } = useNavigation();
  const dashboardQuery = useList<PrincipalDashboard>({
    resource: "dashboard",
    dataProviderName: "default",
  });

  const theme = useTheme();
  const loading = dashboardQuery.isLoading;
  const isError = dashboardQuery.isError;

  const dashboard = React.useMemo(() => {
    const records = (dashboardQuery.data?.data ?? []) as unknown as PrincipalDashboard[];
    return records[0];
  }, [dashboardQuery.data]);

  const distributionByRange = dashboard?.distribution.byRange ?? [];
  const classSummaryRaw = dashboard?.distribution.byClass ?? [];
  const attendanceByClass = dashboard?.attendance.byClass ?? [];
  const attendanceAlerts = dashboard?.attendance.alerts ?? [];

  const [sortConfig, setSortConfig] = React.useState<{ orderBy: keyof ClassSummary; order: Order }>(
    () => ({ orderBy: "average", order: "desc" })
  );

  const [isMinimized, setIsMinimized] = React.useState(false);

  const sortedClassSummary = React.useMemo(() => {
    if (!classSummaryRaw.length) {
      return [] as ClassSummary[];
    }
    const rows = [...classSummaryRaw];
    rows.sort((a, b) => {
      const valueA = a[sortConfig.orderBy];
      const valueB = b[sortConfig.orderBy];
      if (valueA < valueB) return sortConfig.order === "asc" ? -1 : 1;
      if (valueA > valueB) return sortConfig.order === "asc" ? 1 : -1;
      return a.className.localeCompare(b.className);
    });
    return rows;
  }, [classSummaryRaw, sortConfig]);

  const handleSort = (property: keyof ClassSummary) => () => {
    setSortConfig((prev) =>
      prev.orderBy === property
        ? { orderBy: property, order: prev.order === "asc" ? "desc" : "asc" }
        : { orderBy: property, order: "desc" }
    );
  };

  const totalStudents = distributionByRange.reduce((sum, item) => sum + item.count, 0);

  const isEmptyState =
    !loading &&
    !isError &&
    (!dashboard ||
      (distributionByRange.length === 0 &&
        sortedClassSummary.length === 0 &&
        attendanceByClass.length === 0 &&
        attendanceAlerts.length === 0));

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 92) return theme.palette.success.main;
    if (percentage >= 86) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getAttendanceStatus = (percentage: number) => {
    if (percentage >= 92) return { label: "Baik", color: "success" as const };
    if (percentage >= 86) return { label: "Waspada", color: "warning" as const };
    return { label: "Perlu Tindakan", color: "error" as const };
  };

  const goodClasses = attendanceByClass.filter((row) => row.percentage >= 92).length;
  const warningClasses = attendanceByClass.filter(
    (row) => row.percentage >= 86 && row.percentage < 92
  ).length;
  const dangerClasses = attendanceByClass.filter((row) => row.percentage < 86).length;

  return (
    <Stack spacing={5} sx={{ width: "100%", maxWidth: "100%", overflow: "hidden", pb: 4 }}>
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: -0.4 }}>
              Dashboard Akademik
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setIsMinimized(!isMinimized)}
            startIcon={isMinimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            sx={{
              minWidth: "auto",
              px: 2,
              borderRadius: 2,
              textTransform: "none",
            }}
            aria-label={isMinimized ? "Perluas dashboard" : "Minimalkan dashboard"}
          >
            {isMinimized ? "Perluas" : "Minimalkan"}
          </Button>
        </Stack>
      </Box>

      <Collapse in={!isMinimized} timeout={300}>
        {isError ? (
          <Alert
            severity="error"
            action={
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  onClick={() => dashboardQuery.refetch()}
                  aria-label="Coba lagi memuat dashboard"
                >
                  Coba lagi
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  onClick={() => push("/grade-configs")}
                  aria-label="Buka halaman pengaturan"
                >
                  Buka Pengaturan
                </Button>
              </Stack>
            }
            sx={{ borderRadius: 3 }}
          >
            <AlertTitle>Gagal memuat dashboard</AlertTitle>
            Periksa koneksi atau coba ulang beberapa saat lagi.
          </Alert>
        ) : null}

        <Grid container spacing={{ xs: 2, sm: 3 }} columns={12}>
          <Grid item xs={12} sm={6} lg={4}>
            <SummaryCard
              title="Rata-rata Nilai Sekolah"
              value={dashboard ? dashboard.distribution.overallAverage.toFixed(1) : "0.0"}
              subtitle={`Dari ${(dashboard?.distribution.totalStudents ?? 0).toLocaleString("id-ID")} siswa aktif`}
              icon={<BarChart3 aria-label="Ikon nilai" />}
              accentColor={themeTokens.accentBlue}
              loading={loading}
              onCta={() => list("grades")}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={4}>
            <SummaryCard
              title="Tingkat Kehadiran"
              value={dashboard ? percent(dashboard.attendance.overall) : percent(0)}
              subtitle="Rata-rata semua kelas"
              icon={<Users aria-label="Ikon kehadiran" />}
              accentColor={themeTokens.accentGreen}
              loading={loading}
              onCta={() => list("attendance")}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={4}>
            <SummaryCard
              title="Siswa Remedial"
              value={(dashboard?.remedial?.length ?? 0).toLocaleString("id-ID")}
              subtitle="Nilai di bawah KKM"
              icon={<AlertTriangle aria-label="Ikon remedial" />}
              accentColor={themeTokens.accentOrange}
              loading={loading}
              onCta={() => list("grades")}
            />
          </Grid>
        </Grid>

        {isEmptyState ? <EmptyState /> : null}

        <Grid container spacing={{ xs: 2, sm: 3 }} columns={12}>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderRadius: 2,
                overflow: "visible",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
              }}
            >
              <Stack spacing={0.5} sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Distribusi Nilai Siswa
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Jumlah siswa per rentang nilai ({totalStudents.toLocaleString("id-ID")} total)
                </Typography>
              </Stack>
              {loading ? (
                <TableSkeleton rows={4} columns={2} />
              ) : distributionByRange.length === 0 ? (
                <EmptyState message={EMPTY_MESSAGE} />
              ) : (
                <Box sx={{ width: "100%", height: 300, mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={distributionByRange}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={alpha(theme.palette.divider, 0.3)}
                      />
                      <XAxis
                        dataKey="range"
                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                      />
                      <YAxis
                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        label={{ value: "Jumlah Siswa", angle: -90, position: "insideLeft" }}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                        }}
                        formatter={(value: number) => [value.toLocaleString("id-ID"), "Siswa"]}
                      />
                      <Bar dataKey="count" fill={theme.palette.primary.main} radius={[8, 8, 0, 0]}>
                        {distributionByRange.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.range.includes("90-100")
                                ? theme.palette.success.main
                                : entry.range.includes("80-89")
                                  ? theme.palette.primary.main
                                  : entry.range.includes("70-79")
                                    ? theme.palette.warning.main
                                    : theme.palette.error.main
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderRadius: 2,
                overflow: "visible",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
              }}
            >
              <Stack spacing={0.5} sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Perbandingan Nilai Antar Kelas
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Rata-rata, tertinggi, dan terendah (8 kelas teratas)
                </Typography>
              </Stack>
              {loading ? (
                <TableSkeleton rows={5} columns={4} />
              ) : sortedClassSummary.length === 0 ? (
                <EmptyState />
              ) : (
                <Box sx={{ width: "100%", height: 300, mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={sortedClassSummary.slice(0, 8).map((row) => ({
                        className:
                          row.className.length > 15
                            ? `${row.className.slice(0, 12)}...`
                            : row.className,
                        "Rata-rata": row.average,
                        Tertinggi: row.highest,
                        Terendah: row.lowest,
                      }))}
                    >
                      <PolarGrid stroke={alpha(theme.palette.divider, 0.3)} />
                      <PolarAngleAxis
                        dataKey="className"
                        tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fill: theme.palette.text.secondary, fontSize: 10 }}
                      />
                      <Radar
                        name="Rata-rata"
                        dataKey="Rata-rata"
                        stroke={theme.palette.primary.main}
                        fill={theme.palette.primary.main}
                        fillOpacity={0.6}
                      />
                      <Radar
                        name="Tertinggi"
                        dataKey="Tertinggi"
                        stroke={theme.palette.success.main}
                        fill={theme.palette.success.main}
                        fillOpacity={0.3}
                      />
                      <Radar
                        name="Terendah"
                        dataKey="Terendah"
                        stroke={theme.palette.error.main}
                        fill={theme.palette.error.main}
                        fillOpacity={0.3}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} iconSize={10} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={{ xs: 2, sm: 3 }} columns={12}>
          <Grid item xs={12} lg={8}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderRadius: 2,
                overflow: "visible",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
              }}
            >
              <Stack spacing={0.5} sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Persentase Kehadiran per Kelas
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Rata-rata sekolah:{" "}
                  {dashboard ? percent(dashboard.attendance.overall) : percent(0)}
                </Typography>
              </Stack>
              {loading ? (
                <TableSkeleton rows={5} columns={3} />
              ) : attendanceByClass.length === 0 ? (
                <EmptyState />
              ) : (
                <Box sx={{ width: "100%", height: 320, mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={attendanceByClass.slice(0, 10)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={alpha(theme.palette.divider, 0.3)}
                      />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        label={{ value: "Persentase (%)", position: "insideBottom", offset: -5 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="className"
                        tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                        width={95}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, "Kehadiran"]}
                      />
                      <Bar dataKey="percentage" radius={[0, 8, 8, 0]}>
                        {attendanceByClass.slice(0, 10).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getAttendanceColor(entry.percentage)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderRadius: 2,
                overflow: "visible",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Kategori Kelas Berdasarkan Kehadiran
                </Typography>
              </Stack>
              {loading ? (
                <TableSkeleton rows={3} columns={2} />
              ) : attendanceByClass.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  <Box sx={{ px: 1, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Jumlah kelas berdasarkan tingkat kehadiran
                    </Typography>
                  </Box>
                  <Box sx={{ width: "100%", height: 280, mt: 1 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: `${goodClasses} kelas (≥92%)`,
                              shortName: "Baik",
                              value: goodClasses,
                              fill: theme.palette.success.main,
                            },
                            {
                              name: `${warningClasses} kelas (86-92%)`,
                              shortName: "Waspada",
                              value: warningClasses,
                              fill: theme.palette.warning.main,
                            },
                            {
                              name: `${dangerClasses} kelas (<86%)`,
                              shortName: "Perlu Tindakan",
                              value: dangerClasses,
                              fill: theme.palette.error.main,
                            },
                          ].filter((item) => item.value > 0)}
                          cx="50%"
                          cy="45%"
                          labelLine={false}
                          label={({ shortName, value }) => `${shortName}: ${value}`}
                          outerRadius={75}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            {
                              name: `${goodClasses} kelas (≥92%)`,
                              value: goodClasses,
                              fill: theme.palette.success.main,
                            },
                            {
                              name: `${warningClasses} kelas (86-92%)`,
                              value: warningClasses,
                              fill: theme.palette.warning.main,
                            },
                            {
                              name: `${dangerClasses} kelas (<86%)`,
                              value: dangerClasses,
                              fill: theme.palette.error.main,
                            },
                          ]
                            .filter((item) => item.value > 0)
                            .map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 8,
                          }}
                          formatter={(value: number, name: string, props: any) => [
                            `${value} dari ${attendanceByClass.length} kelas`,
                            props.payload.name,
                          ]}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          wrapperStyle={{ fontSize: "10px" }}
                          formatter={(value: string) => value}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </>
              )}
            </Paper>
          </Grid>
        </Grid>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 2,
            overflow: "visible",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
          }}
        >
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              🚨 Kelas yang Perlu Tindakan
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Prioritas tinggi: kehadiran kritikal (&lt;86%)
            </Typography>
          </Stack>
          {loading ? (
            <TableSkeleton rows={4} columns={4} />
          ) : attendanceAlerts.length === 0 ? (
            <EmptyState message="✅ Tidak ada kelas dengan kehadiran kritikal. Semua kelas di atas ambang 86%" />
          ) : (
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small" aria-label="Daftar alert kehadiran" sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        minWidth: 100,
                        maxWidth: 150,
                        position: "sticky",
                        top: 0,
                        bgcolor: "background.paper",
                        zIndex: 1,
                      }}
                    >
                      Kelas
                    </TableCell>
                    <TableCell
                      sx={{
                        whiteSpace: "nowrap",
                        position: "sticky",
                        top: 0,
                        bgcolor: "background.paper",
                        zIndex: 1,
                      }}
                    >
                      Indikator
                    </TableCell>
                    <TableCell
                      sx={{
                        whiteSpace: "nowrap",
                        position: "sticky",
                        top: 0,
                        bgcolor: "background.paper",
                        zIndex: 1,
                      }}
                    >
                      Kehadiran
                    </TableCell>
                    <TableCell
                      sx={{
                        whiteSpace: "nowrap",
                        position: "sticky",
                        top: 0,
                        bgcolor: "background.paper",
                        zIndex: 1,
                      }}
                    >
                      Pekan
                    </TableCell>
                    <TableCell
                      sx={{
                        minWidth: 140,
                        position: "sticky",
                        top: 0,
                        bgcolor: "background.paper",
                        zIndex: 1,
                      }}
                    >
                      Tren
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceAlerts.map((alert) => (
                    <TableRow
                      key={`${alert.classId}-${alert.week}`}
                      hover
                      tabIndex={0}
                      sx={{
                        "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.08) },
                        "&:focus-visible": {
                          outline: `2px solid ${theme.palette.primary.main}`,
                          outlineOffset: -2,
                        },
                      }}
                    >
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 150,
                        }}
                      >
                        {alert.className}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label="Lonjakan ketidakhadiran"
                          color="warning"
                          variant="filled"
                          size="small"
                          aria-label="Lonjakan ketidakhadiran"
                          sx={{
                            maxWidth: 180,
                            "& .MuiChip-label": {
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600, color: theme.palette.warning.main }}>
                          {percent(alert.percentage)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={alert.week} placement="top" arrow>
                          <Typography
                            sx={{
                              fontWeight: 500,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 100,
                            }}
                          >
                            {formatWeekLabel(alert.week)}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ minWidth: 140 }}>
                        <Box
                          sx={{ width: "100%", height: 46 }}
                          aria-label={`Tren kehadiran ${alert.className}`}
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={(alert.trend ?? [alert.percentage]).map((value, index) => ({
                                index,
                                value,
                              }))}
                            >
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke={theme.palette.warning.main}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Collapse>

      {!isMinimized && !loading && !isError && attendanceByClass.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Ringkasan performa siswa: nilai rata-rata, tingkat kehadiran, dan kelas yang perlu
                perhatian
              </Typography>
            </Box>

            <Box
              sx={{
                borderLeft: `3px solid ${theme.palette.primary.main}`,
                pl: 2,
              }}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: theme.palette.primary.main,
                    }}
                  />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    📊 Insight Minggu Ini
                  </Typography>
                </Stack>
                <Stack spacing={1.5} sx={{ pl: 1.5 }}>
                  {dangerClasses > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      • <strong>{dangerClasses} kelas</strong> memerlukan tindakan prioritas
                      (kehadiran &lt;86%)
                    </Typography>
                  )}
                  {warningClasses > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      • <strong>{warningClasses} kelas</strong> dalam kategori waspada (kehadiran
                      86-92%)
                    </Typography>
                  )}
                  {goodClasses > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      • <strong>{goodClasses} kelas</strong> menunjukkan kehadiran baik (&ge;92%)
                    </Typography>
                  )}
                  {attendanceAlerts.length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      • Kelas dengan kehadiran terendah:{" "}
                      <strong>
                        {attendanceAlerts[0].className} ({percent(attendanceAlerts[0].percentage)})
                      </strong>
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
};
