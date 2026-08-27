import React from "react";
import { Breadcrumb, Typography } from "antd";
import type { ItemType } from "antd/es/breadcrumb/Breadcrumb";
import { useLocation, useNavigate } from "react-router";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  students: "Siswa",
  "students-create": "Tambah Siswa",
  "students-edit": "Edit Siswa",
  "students-show": "Detail Siswa",
  teachers: "Guru",
  "teachers-create": "Tambah Guru",
  "teachers-edit": "Edit Guru",
  "teachers-show": "Detail Guru",
  classes: "Kelas",
  "classes-edit": "Edit Kelas",
  "classes-show": "Detail Kelas",
  "classes-create": "Tambah Kelas",
  schedules: "Jadwal",
  "schedules-generator": "Generator Jadwal",
  "schedules-preferences": "Preferensi Guru",
  generator: "Generator Jadwal",
  preferences: "Preferensi Guru",
  "schedules-create": "Tambah Jadwal",
  "schedules-edit": "Edit Jadwal",
  "schedules-show": "Detail Jadwal",
  "grade-components": "Komponen Penilaian",
  "grade-components-create": "Tambah Komponen Penilaian",
  "grade-components-edit": "Edit Komponen Penilaian",
  "grade-configs": "Bobot / KKM",
  "grade-configs-create": "Tambah Bobot / KKM",
  "grade-configs-edit": "Edit Bobot / KKM",
  enrollments: "Pendaftaran",
  "enrollments-create": "Tambah Penempatan",
  "enrollments-edit": "Edit Penempatan",
  subjects: "Mapel",
  "subjects-create": "Tambah Mapel",
  "subjects-edit": "Edit Mapel",
  "subjects-show": "Detail Mapel",
  terms: "Tahun Ajar",
  "terms-create": "Tambah Tahun Ajar",
  "terms-edit": "Edit Tahun Ajar",
  attendance: "Kehadiran",
  "attendance-daily": "Absensi Harian",
  "attendance-lesson": "Absensi Per Jam",
  announcements: "Pengumuman",
  "behavior-notes": "Catatan Perilaku",
  notes: "Catatan",
  reports: "Laporan",
  settings: "Pengaturan",
  setup: "Setup",
  "import-status": "Snapshot Pra-Semester",
  "pre-semester-snapshot": "Snapshot Pra-Semester",
  "setup-pre-semester-snapshot": "Snapshot Pra-Semester",
  login: "Masuk",
  create: "Tambah",
  edit: "Edit",
  show: "Detail",
  new: "Baru",
};

const normalizeSegment = (segment: string) =>
  segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const resolveLabel = (accumulatedPath: string, segment: string) => {
  const pathKey = accumulatedPath.replace(/^\//, "").replace(/\//g, "-");
  return SEGMENT_LABELS[pathKey] ?? SEGMENT_LABELS[segment] ?? normalizeSegment(segment);
};

const isIdLike = (segment: string) => {
  if (!segment) return false;
  if (/^\d+$/.test(segment)) return true;
  if (/^[a-z0-9_-]{8,}$/i.test(segment)) return true;
  if (segment.length > 24) return true;
  return false;
};

const buildBreadcrumbItems = (pathname: string, navigateTo: (path: string) => void): ItemType[] => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return [
      {
        title: (
          <Typography.Text style={{ fontSize: 13, fontWeight: 600 }}>Dashboard</Typography.Text>
        ),
      },
    ];
  }

  const items: ItemType[] = [
    {
      title: (
        <Typography.Link onClick={() => navigateTo("/")} style={{ fontSize: 13 }}>
          Dashboard
        </Typography.Link>
      ),
    },
  ];

  const clickableUntil = segments.length - 1;
  let accumulatedPath = "";

  segments.forEach((segment, index) => {
    accumulatedPath += `/${segment}`;

    const isLast = index === segments.length - 1;
    const isButtonRoute =
      segment === "create" || segment === "edit" || segment === "show" || segment === "new";

    const isParam = isIdLike(segment);
    const label = resolveLabel(accumulatedPath, segment);

    if (isLast || isButtonRoute || isParam || index >= clickableUntil) {
      items.push({
        title: <Typography.Text style={{ fontSize: 13, fontWeight: 600 }}>{label}</Typography.Text>,
      });
    } else {
      const targetPath = accumulatedPath;
      items.push({
        title: (
          <Typography.Link onClick={() => navigateTo(targetPath)} style={{ fontSize: 13 }}>
            {label}
          </Typography.Link>
        ),
      });
    }
  });

  return items;
};

export const AppBreadcrumb: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path || "/");
  };

  const items = React.useMemo(
    () => buildBreadcrumbItems(location.pathname, handleNavigate),
    [location.pathname]
  );

  if (!items || items.length <= 1) {
    return null;
  }

  return <Breadcrumb style={{ marginBottom: 12 }} items={items} separator="/" />;
};
