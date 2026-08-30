import { useList } from "../hooks/use-refine-list";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Result,
  Row,
  Select,
  Space,
  Spin,
  Steps,
  Switch,
  Table,
  Tag,
  TimePicker,
  Typography,
  Upload,
} from "antd";
import type { RcFile } from "antd/es/upload";
import type { UploadProps } from "antd";
import { InboxOutlined, CheckCircleOutlined, SwapLeftOutlined } from "@ant-design/icons";
import { useCreate, useDelete, useUpdate } from "@refinedev/core";
import { useAppNotification } from "../hooks/use-app-notification";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router";
import { getSafeInternalRoute } from "../utils/navigation.js";
import { ResourceActionGuard } from "../components/resource-action-guard";
import { DEFAULT_TERM_TYPE, TERM_TYPES, buildTermPayload, isTermActive } from "../utils/terms";

type TermRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type?: string;
  academicYear?: string;
  active?: boolean;
  isActive?: boolean;
};

export const parseTimeToMinutes = (time: string) => {
  const [hoursStr, minutesStr] = time.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
};

export const timesOverlap = (startA: number, endA: number, startB: number, endB: number) =>
  startA < endB && startB < endA;

export const calculateScheduleConflicts = (entries: ScheduleRow[], mappings: ClassSubjectRow[]) => {
  if (!entries || entries.length === 0) {
    return 0;
  }

  const mappingDict = new Map<string, ClassSubjectRow>();
  mappings.forEach((item) => mappingDict.set(item.id, item));

  let conflicts = 0;

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const a = entries[i];
      const b = entries[j];
      if (a.dayOfWeek !== b.dayOfWeek) {
        continue;
      }

      const mappingA = mappingDict.get(a.classSubjectId);
      const mappingB = mappingDict.get(b.classSubjectId);
      const sameClass = mappingA && mappingB && mappingA.classroomId === mappingB.classroomId;
      const sameTeacher =
        mappingA && mappingB && mappingA.teacherId && mappingA.teacherId === mappingB.teacherId;
      const sameRoom = a.room && b.room && a.room === b.room;

      if (!sameClass && !sameTeacher && !sameRoom) {
        continue;
      }

      const startA = parseTimeToMinutes(a.startTime);
      const endA = parseTimeToMinutes(a.endTime);
      const startB = parseTimeToMinutes(b.startTime);
      const endB = parseTimeToMinutes(b.endTime);

      if (timesOverlap(startA, endA, startB, endB)) {
        conflicts += 1;
      }
    }
  }

  return conflicts;
};

type TermFormValues = {
  name: string;
  startDate: Dayjs;
  endDate: Dayjs;
  type: string;
  academicYear?: string;
  active: boolean;
};

type StudentRowData = {
  nis: string;
  fullName: string;
  gender: string;
  birthDate: string;
  guardianName: string;
  guardianPhone: string;
};

type TeacherRowData = {
  nip: string;
  fullName: string;
  email: string;
  phone: string;
};

export type ClassSubjectRow = {
  id: string;
  classroomId: string;
  subjectId: string;
  teacherId?: string;
  termId?: string;
};

export type ScheduleRow = {
  id: string;
  classSubjectId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
};

type ImportRow<T> = {
  key: string;
  index: number;
  data: T;
  errors: string[];
  status: "pending" | "ready" | "error" | "saving" | "saved";
};

type StudentImportResult = {
  imported: number;
  totalReady: number;
  totalRows: number;
  failed: number;
};

type TeacherImportResult = {
  imported: number;
  totalReady: number;
  totalRows: number;
  failed: number;
};

type ClassSetupResult = {
  created: number;
  total: number;
};

type SubjectMappingResult = {
  mappingsCreated: number;
  totalMappings: number;
};

type ScheduleSetupResult = {
  sessionsCreated: number;
  totalSessions: number;
  conflicts: number;
};

const DATE_FORMAT = "YYYY-MM-DD";
const TIME_FORMAT = "HH:mm";

const DAY_OPTIONS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
];

const expectedStudentHeaders = [
  "nis",
  "full_name",
  "gender",
  "birth_date",
  "guardian_name",
  "guardian_phone",
] as const;

const expectedTeacherHeaders = ["nip", "full_name", "email", "phone"] as const;

const toCsvBlobUrl = (rows: string[][], filename: string) => {
  const csvContent = rows.map((cols) => cols.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const extractErrorMessage = (error: unknown): string => {
  if (!error) return "Terjadi kesalahan yang tidak diketahui.";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Permintaan gagal diproses.");
  }
  return "Permintaan gagal diproses.";
};

const splitCsvLine = (line: string) => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
};

const readCsvRecords = async (file: RcFile) => {
  const text = await file.text();
  const lines = text.replace(/\r\n/g, "\n").split(/\n/);
  let headers: string[] = [];
  const records: { line: number; values: Record<string, string> }[] = [];

  let lineNumber = 0;
  for (const rawLine of lines) {
    lineNumber += 1;
    const trimmed = rawLine.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const cells = splitCsvLine(rawLine).map((cell) => cell.replace(/^"|"$/g, ""));
    if (headers.length === 0) {
      headers = cells.map((cell) => cell.trim().toLowerCase());
      continue;
    }
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] ?? "").trim();
    });
    records.push({ line: lineNumber, values: row });
  }

  return { headers, records };
};

const TermSetupStep: React.FC<{
  existingTerm: TermRecord | null;
  onSuccess: (term: TermRecord) => void;
}> = ({ existingTerm, onSuccess }) => {
  const [form] = Form.useForm<TermFormValues>();
  const { mutateAsync: createTerm } = useCreate();
  const { mutateAsync: updateTerm } = useUpdate();
  const { open: notify } = useAppNotification();
  const [submitting, setSubmitting] = useState(false);

  const initialValues = useMemo<TermFormValues>(
    () => ({
      name: existingTerm?.name ?? "",
      startDate: existingTerm?.startDate ? dayjs(existingTerm.startDate) : dayjs(),
      endDate: existingTerm?.endDate ? dayjs(existingTerm.endDate) : dayjs().add(5, "month"),
      type: existingTerm?.type ?? DEFAULT_TERM_TYPE,
      academicYear: existingTerm?.academicYear,
      active: isTermActive(existingTerm ?? {}) || !existingTerm,
    }),
    [existingTerm]
  );

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [form, initialValues]);

  const handleFinish = async (values: TermFormValues) => {
    // The API requires type, academicYear, RFC3339 dates, and `is_active`;
    // buildTermPayload fills the gaps this form does not collect directly.
    const payload = buildTermPayload({
      name: values.name,
      type: values.type,
      academicYear: values.academicYear,
      startDate: values.startDate?.format(DATE_FORMAT),
      endDate: values.endDate?.format(DATE_FORMAT),
      isActive: values.active,
    });

    setSubmitting(true);
    try {
      let result: TermRecord | null = null;
      if (existingTerm?.id) {
        const response = await updateTerm({
          resource: "terms",
          id: existingTerm.id,
          values: payload,
        });
        result = {
          id: existingTerm.id,
          ...(response?.data ?? payload),
        } as TermRecord;
        notify?.({
          type: "success",
          message: "Semester diperbarui",
          description: "Data semester berhasil diperbarui.",
        });
      } else {
        const response = await createTerm({
          resource: "terms",
          values: payload,
        });
        const created = response?.data ?? payload;
        result = {
          id: (created as { id?: string }).id ?? `term_${Date.now().toString(36)}`,
          ...created,
        } as TermRecord;
        notify?.({
          type: "success",
          message: "Semester dibuat",
          description: "Semester aktif berhasil disimpan.",
        });
      }
      onSuccess(result);
    } catch (error) {
      notify?.({
        type: "error",
        message: "Gagal menyimpan semester",
        description: extractErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="Langkah 1 · Konfigurasi Semester" bordered={false}>
      <Typography.Paragraph>
        Tentukan semester aktif sebelum melanjutkan proses pra-semester. Data ini akan digunakan
        untuk mengaitkan kelas, jadwal, dan nilai selama tahun ajaran berjalan.
      </Typography.Paragraph>
      <Form<TermFormValues>
        layout="vertical"
        form={form}
        initialValues={initialValues}
        onFinish={handleFinish}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Nama Semester"
              name="name"
              rules={[{ required: true, message: "Nama semester wajib diisi." }]}
            >
              <Input placeholder="Misal: TP 2024/2025 - Semester Ganjil" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Status Aktif" name="active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Jenis"
              name="type"
              rules={[{ required: true, message: "Jenis semester wajib dipilih." }]}
            >
              <Select options={TERM_TYPES.map((type) => ({ label: type, value: type }))} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Tahun Ajaran"
              name="academicYear"
              tooltip="Kosongkan untuk mengikuti tanggal mulai, misal 2025/2026."
            >
              <Input placeholder="2025/2026" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Tanggal Mulai"
              name="startDate"
              rules={[{ required: true, message: "Tanggal mulai wajib diisi." }]}
            >
              <DatePicker format={DATE_FORMAT} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Tanggal Selesai"
              name="endDate"
              rules={[{ required: true, message: "Tanggal selesai wajib diisi." }]}
            >
              <DatePicker format={DATE_FORMAT} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            icon={<CheckCircleOutlined />}
          >
            Simpan &amp; Lanjutkan
          </Button>
          {existingTerm ? (
            <Typography.Text type="secondary">
              Terakhir diubah term ID <code>{existingTerm.id}</code>
            </Typography.Text>
          ) : null}
        </Space>
      </Form>
    </Card>
  );
};

const normalizeGender = (value: string): { gender: string; warnings: string[] } => {
  const trimmed = value.trim().toLowerCase();
  const warnings: string[] = [];
  if (!trimmed) {
    return { gender: "", warnings };
  }

  if (["m", "male", "l", "laki-laki", "laki"].includes(trimmed)) {
    if (trimmed !== "m") warnings.push("Gender dikonversi ke 'M'.");
    return { gender: "M", warnings };
  }
  if (["f", "female", "p", "perempuan"].includes(trimmed)) {
    if (trimmed !== "F") warnings.push("Gender dikonversi ke 'F'.");
    return { gender: "F", warnings };
  }

  warnings.push(`Nilai gender "${value}" tidak dikenali.`);
  return { gender: trimmed.toUpperCase(), warnings };
};

const parseStudentCsv = async (
  file: RcFile,
  existingStudents: { nis?: string }[]
): Promise<{
  rows: ImportRow<StudentRowData>[];
  globalErrors: string[];
}> => {
  const existingNis = new Set(
    (existingStudents ?? []).map((student) => (student?.nis ?? "").trim().toLowerCase())
  );

  const { headers, records } = await readCsvRecords(file);
  const globalErrors: string[] = [];
  const parsedRows: ImportRow<StudentRowData>[] = [];
  const fileNisSet = new Map<string, number>();

  const missingHeaders = expectedStudentHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    globalErrors.push(`Kolom berikut wajib ada: ${missingHeaders.join(", ")}.`);
  }

  records.forEach((record) => {
    const index = record.line;
    const raw = record.values;
    const errors: string[] = [];
    const warnings: string[] = [];

    const nis = (raw.nis ?? "").trim();
    const fullName = (raw.full_name ?? "").trim();
    const genderRaw = raw.gender ?? "";
    const birthDateRaw = (raw.birth_date ?? "").trim();
    const guardianName = (raw.guardian_name ?? "").trim();
    const guardianPhone = (raw.guardian_phone ?? "").trim();

    if (!nis) errors.push("NIS wajib diisi.");
    if (!fullName) errors.push("Nama lengkap wajib diisi.");
    if (!genderRaw) errors.push("Gender wajib diisi.");
    if (!birthDateRaw) errors.push("Tanggal lahir wajib diisi.");
    if (!guardianName) errors.push("Nama wali wajib diisi.");
    if (!guardianPhone) errors.push("Nomor kontak wali wajib diisi.");

    const normalizedNis = nis.toLowerCase();
    if (fileNisSet.has(normalizedNis)) {
      const firstRow = fileNisSet.get(normalizedNis)!;
      errors.push(`NIS duplikat dengan baris ${firstRow}.`);
    } else {
      fileNisSet.set(normalizedNis, index);
    }

    if (existingNis.has(normalizedNis)) {
      errors.push("NIS sudah terdaftar di sistem.");
    }

    const { gender, warnings: genderWarnings } = normalizeGender(genderRaw);
    warnings.push(...genderWarnings);
    if (!["M", "F"].includes(gender)) {
      errors.push("Gender harus M atau F.");
    }

    if (!dayjs(birthDateRaw, DATE_FORMAT, true).isValid()) {
      errors.push("Tanggal lahir harus berformat YYYY-MM-DD.");
    }

    if (guardianPhone && guardianPhone.length < 8) {
      warnings.push("Nomor wali kurang dari 8 digit. Mohon periksa kembali.");
    }

    parsedRows.push({
      key: `student_${index}`,
      index,
      data: {
        nis,
        fullName,
        gender,
        birthDate: birthDateRaw,
        guardianName,
        guardianPhone,
      },
      errors: [...errors, ...warnings.map((warning) => `Catatan: ${warning}`)],
      status: errors.length === 0 ? "ready" : "error",
    });
  });

  return { rows: parsedRows, globalErrors };
};

const parseTeacherCsv = async (
  file: RcFile,
  existingTeachers: { nip?: string }[]
): Promise<{
  rows: ImportRow<TeacherRowData>[];
  globalErrors: string[];
}> => {
  const existingNip = new Set(
    (existingTeachers ?? []).map((teacher) => (teacher?.nip ?? "").trim().toLowerCase())
  );

  const { headers, records } = await readCsvRecords(file);
  const globalErrors: string[] = [];
  const parsedRows: ImportRow<TeacherRowData>[] = [];
  const fileNipSet = new Map<string, number>();

  const missingHeaders = expectedTeacherHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    globalErrors.push(`Kolom berikut wajib ada: ${missingHeaders.join(", ")}.`);
  }

  records.forEach((record) => {
    const index = record.line;
    const raw = record.values;
    const errors: string[] = [];

    const nip = (raw.nip ?? "").trim();
    const fullName = (raw.full_name ?? "").trim();
    const email = (raw.email ?? "").trim();
    const phone = (raw.phone ?? "").trim();

    if (!nip) errors.push("NIP wajib diisi.");
    if (!fullName) errors.push("Nama guru wajib diisi.");
    if (!email) errors.push("Email guru wajib diisi.");
    if (!phone) errors.push("Nomor telepon guru wajib diisi.");

    const normalizedNip = nip.toLowerCase();
    if (fileNipSet.has(normalizedNip)) {
      const firstRow = fileNipSet.get(normalizedNip)!;
      errors.push(`NIP duplikat dengan baris ${firstRow}.`);
    } else {
      fileNipSet.set(normalizedNip, index);
    }

    if (existingNip.has(normalizedNip)) {
      errors.push("NIP sudah terdaftar di sistem.");
    }

    parsedRows.push({
      key: `teacher_${index}`,
      index,
      data: {
        nip,
        fullName,
        email,
        phone,
      },
      errors,
      status: errors.length === 0 ? "ready" : "error",
    });
  });

  return { rows: parsedRows, globalErrors };
};

const StudentImportStep: React.FC<{
  existingStudents: Record<string, any>[];
  onComplete: (result: StudentImportResult) => void;
  onSkip: () => void;
}> = ({ existingStudents, onComplete, onSkip }) => {
  const { mutateAsync: createStudent } = useCreate();
  const { open: notify } = useAppNotification();

  const [rows, setRows] = useState<ImportRow<StudentRowData>[]>([]);
  const [parsing, setParsing] = useState(false);
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const readyRows = useMemo(() => rows.filter((row) => row.status === "ready"), [rows]);
  const errorRows = useMemo(() => rows.filter((row) => row.status === "error"), [rows]);

  const handleBeforeUpload: UploadProps["beforeUpload"] = async (file) => {
    setParsing(true);
    setGlobalErrors([]);
    try {
      const { rows: parsedRows, globalErrors: newGlobalErrors } = await parseStudentCsv(
        file,
        existingStudents
      );
      setRows(parsedRows);
      setGlobalErrors(newGlobalErrors);
      if (parsedRows.length === 0) {
        notify?.({
          type: "warning",
          message: "File kosong",
          description: "Tidak ada data siswa yang ditemukan di file yang diunggah.",
        });
      } else {
        notify?.({
          type: "info",
          message: "Pratinjau siswa siap",
          description: `Total ${parsedRows.length} baris dibaca. ${
            parsedRows.filter((row) => row.status === "ready").length
          } baris siap diimpor.`,
        });
      }
    } catch (error) {
      notify?.({
        type: "error",
        message: "Gagal membaca CSV",
        description: extractErrorMessage(error),
      });
    } finally {
      setParsing(false);
    }
    return false;
  };

  const handleImport = async () => {
    if (readyRows.length === 0) {
      notify?.({
        type: "warning",
        message: "Tidak ada data valid",
        description: "Perbaiki data CSV hingga tidak ada error sebelum melanjutkan.",
      });
      return;
    }

    setImporting(true);
    let successCount = 0;
    const updatedRows: ImportRow<StudentRowData>[] = [];

    for (const row of rows) {
      if (row.status !== "ready") {
        updatedRows.push(row);
        continue;
      }

      const payload = {
        nis: row.data.nis,
        fullName: row.data.fullName,
        gender: row.data.gender,
        birthDate: row.data.birthDate,
        guardian: row.data.guardianName,
        guardianPhone: row.data.guardianPhone,
      };

      try {
        await createStudent({
          resource: "students",
          values: payload,
        });
        successCount += 1;
        updatedRows.push({
          ...row,
          status: "saved",
        });
      } catch (error) {
        updatedRows.push({
          ...row,
          status: "error",
          errors: [...row.errors, extractErrorMessage(error)],
        });
      }
    }

    setRows(updatedRows);
    setImporting(false);
    notify?.({
      type: "success",
      message: "Impor siswa selesai",
      description: `${successCount} dari ${readyRows.length} baris berhasil disimpan.`,
    });
    onComplete({
      imported: successCount,
      totalReady: readyRows.length,
      totalRows: rows.length,
      failed: readyRows.length - successCount + errorRows.length,
    });
  };

  const columns = [
    {
      title: "#",
      dataIndex: "index",
      width: 64,
      render: (value: number) => <Typography.Text>{value}</Typography.Text>,
    },
    {
      title: "NIS",
      dataIndex: ["data", "nis"],
    },
    {
      title: "Nama Lengkap",
      dataIndex: ["data", "fullName"],
    },
    {
      title: "Gender",
      dataIndex: ["data", "gender"],
    },
    {
      title: "Tanggal Lahir",
      dataIndex: ["data", "birthDate"],
    },
    {
      title: "Wali",
      dataIndex: ["data", "guardianName"],
      render: (_: unknown, record: ImportRow<StudentRowData>) => (
        <span>
          {record.data.guardianName}
          <br />
          <Typography.Text type="secondary">{record.data.guardianPhone}</Typography.Text>
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: ImportRow<StudentRowData>["status"]) => {
        if (status === "saved") {
          return <Tag color="green">Tersimpan</Tag>;
        }
        if (status === "ready") {
          return <Tag color="blue">Siap</Tag>;
        }
        if (status === "saving") {
          return <Tag color="cyan">Menyimpan...</Tag>;
        }
        if (status === "error") {
          return <Tag color="red">Perlu perbaikan</Tag>;
        }
        return <Tag>Belum divalidasi</Tag>;
      },
    },
    {
      title: "Catatan",
      dataIndex: "errors",
      render: (errors: string[]) =>
        errors.length > 0 ? (
          <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
            {errors.map((error) => (
              <li key={error}>
                <Typography.Text type={error.startsWith("Catatan:") ? "secondary" : "danger"}>
                  {error}
                </Typography.Text>
              </li>
            ))}
          </ul>
        ) : (
          <Typography.Text type="secondary">Tidak ada</Typography.Text>
        ),
    },
  ];

  return (
    <Card title="Langkah 2 · Impor Siswa" bordered={false}>
      <Typography.Paragraph>
        Unggah CSV siswa untuk tahun ajaran baru. Sistem akan memeriksa duplikasi NIS dan format
        kolom secara otomatis. Gunakan template resmi agar struktur kolom sesuai.
      </Typography.Paragraph>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<InboxOutlined />}
          onClick={() =>
            toCsvBlobUrl(
              [
                expectedStudentHeaders.map((header) => header),
                ["2024-010", "Aditya Wijaya", "M", "2008-11-20", "Bambang Wijaya", "081234567890"],
              ],
              "students_template.csv"
            )
          }
        >
          Unduh Template CSV
        </Button>
        <Upload.Dragger
          accept=".csv"
          maxCount={1}
          beforeUpload={handleBeforeUpload}
          showUploadList={false}
          disabled={parsing || importing}
          style={{ width: 320 }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Klik atau seret CSV siswa ke area ini</p>
        </Upload.Dragger>
      </Space>
      {parsing ? (
        <div style={{ padding: 32, textAlign: "center" }}>
          <Spin size="large" />
          <Typography.Paragraph style={{ marginTop: 8 }}>
            Memproses file CSV, mohon tunggu...
          </Typography.Paragraph>
        </div>
      ) : null}
      {globalErrors.length > 0 ? (
        <Alert
          style={{ marginBottom: 16 }}
          type="error"
          showIcon
          message="Struktur CSV tidak valid"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {globalErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          }
        />
      ) : null}
      <Table
        size="small"
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 5 }}
        rowKey="key"
        style={{ marginBottom: 16 }}
        locale={{
          emptyText: parsing ? "Memuat data..." : "Belum ada data siswa yang dipratinjau.",
        }}
      />
      <Space>
        <Button
          type="primary"
          disabled={readyRows.length === 0 || importing}
          onClick={handleImport}
          loading={importing}
        >
          Simpan Siswa Siap ({readyRows.length})
        </Button>
        <Button type="link" onClick={onSkip} disabled={importing}>
          Lewati langkah ini
        </Button>
        {rows.length > 0 ? (
          <Typography.Text type="secondary">
            {readyRows.length} baris siap simpan · {errorRows.length} baris perlu diperbaiki.
          </Typography.Text>
        ) : null}
      </Space>
    </Card>
  );
};

const TeacherImportStep: React.FC<{
  existingTeachers: Record<string, any>[];
  onComplete: (result: TeacherImportResult) => void;
  onSkip: () => void;
}> = ({ existingTeachers, onComplete, onSkip }) => {
  const { mutateAsync: createTeacher } = useCreate();
  const { open: notify } = useAppNotification();

  const [rows, setRows] = useState<ImportRow<TeacherRowData>[]>([]);
  const [parsing, setParsing] = useState(false);
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const readyRows = useMemo(() => rows.filter((row) => row.status === "ready"), [rows]);
  const errorRows = useMemo(() => rows.filter((row) => row.status === "error"), [rows]);

  const handleBeforeUpload: UploadProps["beforeUpload"] = async (file) => {
    setParsing(true);
    setGlobalErrors([]);
    try {
      const { rows: parsedRows, globalErrors: newGlobalErrors } = await parseTeacherCsv(
        file,
        existingTeachers
      );
      setRows(parsedRows);
      setGlobalErrors(newGlobalErrors);
      if (parsedRows.length === 0) {
        notify?.({
          type: "warning",
          message: "File kosong",
          description: "Tidak ada data guru yang ditemukan di file yang diunggah.",
        });
      } else {
        notify?.({
          type: "info",
          message: "Pratinjau guru siap",
          description: `${parsedRows.filter((row) => row.status === "ready").length} baris siap diimpor.`,
        });
      }
    } catch (error) {
      notify?.({
        type: "error",
        message: "Gagal membaca CSV",
        description: extractErrorMessage(error),
      });
    } finally {
      setParsing(false);
    }
    return false;
  };

  const handleImport = async () => {
    if (readyRows.length === 0) {
      notify?.({
        type: "warning",
        message: "Tidak ada data valid",
        description: "Perbaiki data CSV hingga tidak ada error sebelum melanjutkan.",
      });
      return;
    }

    setImporting(true);
    let successCount = 0;
    const updatedRows: ImportRow<TeacherRowData>[] = [];

    for (const row of rows) {
      if (row.status !== "ready") {
        updatedRows.push(row);
        continue;
      }

      const payload = {
        nip: row.data.nip,
        fullName: row.data.fullName,
        email: row.data.email,
        phone: row.data.phone,
      };

      try {
        await createTeacher({
          resource: "teachers",
          values: payload,
        });
        successCount += 1;
        updatedRows.push({
          ...row,
          status: "saved",
        });
      } catch (error) {
        updatedRows.push({
          ...row,
          status: "error",
          errors: [...row.errors, extractErrorMessage(error)],
        });
      }
    }

    setRows(updatedRows);
    setImporting(false);
    notify?.({
      type: "success",
      message: "Impor guru selesai",
      description: `${successCount} dari ${readyRows.length} baris berhasil disimpan.`,
    });
    onComplete({
      imported: successCount,
      totalReady: readyRows.length,
      totalRows: rows.length,
      failed: readyRows.length - successCount + errorRows.length,
    });
  };

  const columns = [
    {
      title: "#",
      dataIndex: "index",
      width: 64,
    },
    {
      title: "NIP",
      dataIndex: ["data", "nip"],
    },
    {
      title: "Nama Guru",
      dataIndex: ["data", "fullName"],
    },
    {
      title: "Email",
      dataIndex: ["data", "email"],
    },
    {
      title: "Telepon",
      dataIndex: ["data", "phone"],
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: ImportRow<TeacherRowData>["status"]) => {
        if (status === "saved") {
          return <Tag color="green">Tersimpan</Tag>;
        }
        if (status === "ready") {
          return <Tag color="blue">Siap</Tag>;
        }
        if (status === "saving") {
          return <Tag color="cyan">Menyimpan...</Tag>;
        }
        if (status === "error") {
          return <Tag color="red">Perlu perbaikan</Tag>;
        }
        return <Tag>Belum divalidasi</Tag>;
      },
    },
    {
      title: "Catatan",
      dataIndex: "errors",
      render: (errors: string[]) =>
        errors.length > 0 ? (
          <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
            {errors.map((error) => (
              <li key={error}>
                <Typography.Text type="danger">{error}</Typography.Text>
              </li>
            ))}
          </ul>
        ) : (
          <Typography.Text type="secondary">Tidak ada</Typography.Text>
        ),
    },
  ];

  return (
    <Card title="Langkah 3 · Impor Guru" bordered={false}>
      <Typography.Paragraph>
        Unggah CSV guru untuk memastikan seluruh pengampu pelajaran tersedia. Sistem mengecek
        keunikan NIP serta kelengkapan kontak untuk pemberian kredensial awal.
      </Typography.Paragraph>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<InboxOutlined />}
          onClick={() =>
            toCsvBlobUrl(
              [
                expectedTeacherHeaders.map((header) => header),
                [
                  "197812122005012001",
                  "Ibu Marta Siregar",
                  "marta.siregar@harapannusantara.sch.id",
                  "081234567890",
                ],
              ],
              "teachers_template.csv"
            )
          }
        >
          Unduh Template CSV
        </Button>
        <Upload.Dragger
          accept=".csv"
          maxCount={1}
          beforeUpload={handleBeforeUpload}
          showUploadList={false}
          disabled={parsing || importing}
          style={{ width: 320 }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Klik atau seret CSV guru ke area ini</p>
        </Upload.Dragger>
      </Space>
      {parsing ? (
        <div style={{ padding: 32, textAlign: "center" }}>
          <Spin size="large" />
          <Typography.Paragraph style={{ marginTop: 8 }}>
            Memproses file CSV, mohon tunggu...
          </Typography.Paragraph>
        </div>
      ) : null}
      {globalErrors.length > 0 ? (
        <Alert
          style={{ marginBottom: 16 }}
          type="error"
          showIcon
          message="Struktur CSV tidak valid"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {globalErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          }
        />
      ) : null}
      <Table
        size="small"
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 5 }}
        rowKey="key"
        style={{ marginBottom: 16 }}
        locale={{
          emptyText: parsing ? "Memuat data..." : "Belum ada data guru yang dipratinjau.",
        }}
      />
      <Space>
        <Button
          type="primary"
          disabled={readyRows.length === 0 || importing}
          onClick={handleImport}
          loading={importing}
        >
          Simpan Guru Siap ({readyRows.length})
        </Button>
        <Button type="link" onClick={onSkip} disabled={importing}>
          Lewati langkah ini
        </Button>
        {rows.length > 0 ? (
          <Typography.Text type="secondary">
            {readyRows.length} baris siap simpan · {errorRows.length} baris perlu perbaikan.
          </Typography.Text>
        ) : null}
      </Space>
    </Card>
  );
};

type ClassSetupFormValues = {
  name: string;
  level: number;
  homeroomId?: string;
};

const ClassSetupStep: React.FC<{
  term: TermRecord | null;
  classes: Record<string, any>[];
  teachers: Record<string, any>[];
  onComplete: (result: ClassSetupResult) => void;
  onSkip: () => void;
  onRefresh: () => void;
}> = ({ term, classes, teachers, onComplete, onSkip, onRefresh }) => {
  const [form] = Form.useForm<ClassSetupFormValues>();
  const { mutateAsync: createClass } = useCreate();
  const { open: notify } = useAppNotification();
  const [saving, setSaving] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      if (!term?.id) {
        notify?.({
          type: "warning",
          message: "Setel semester terlebih dahulu",
          description: "Semester aktif diperlukan untuk mengaitkan kelas baru.",
        });
        return;
      }
      setSaving(true);
      await createClass({
        resource: "classes",
        values: {
          name: values.name.trim(),
          level: Number(values.level),
          homeroomId: values.homeroomId ?? null,
          termId: term.id,
        },
      });
      setCreatedCount((prev) => prev + 1);
      notify?.({
        type: "success",
        message: "Kelas ditambahkan",
        description: `Kelas ${values.name} berhasil disimpan.`,
      });
      form.resetFields();
      await onRefresh();
    } catch (error) {
      if (error) {
        notify?.({
          type: "error",
          message: "Gagal menambah kelas",
          description: extractErrorMessage(error),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Nama Kelas",
        dataIndex: "name",
      },
      {
        title: "Tingkat",
        dataIndex: "level",
      },
      {
        title: "Wali Kelas",
        dataIndex: "homeroomId",
        render: (homeroomId: string | undefined) => {
          const teacher = teachers.find((item) => item.id === homeroomId);
          return teacher ? (
            teacher.fullName
          ) : (
            <Typography.Text type="secondary">Belum ditetapkan</Typography.Text>
          );
        },
      },
    ],
    [teachers]
  );

  return (
    <Card title="Langkah 4 · Bentuk Kelas & Wali" bordered={false}>
      <Typography.Paragraph>
        Tambahkan kelas dan tetapkan wali kelas. Tahap ini memastikan struktur rombongan belajar
        siap sebelum mapel dan jadwal dibuat.
      </Typography.Paragraph>
      <Form<ClassSetupFormValues> layout="inline" form={form} style={{ marginBottom: 16 }}>
        <Form.Item
          label="Nama Kelas"
          name="name"
          rules={[{ required: true, message: "Nama kelas wajib diisi." }]}
        >
          <Input placeholder="Misal: Kelas X IPA 2" style={{ minWidth: 160 }} />
        </Form.Item>
        <Form.Item
          label="Tingkat"
          name="level"
          initialValue={10}
          rules={[{ required: true, message: "Tingkat wajib diisi." }]}
        >
          <InputNumber min={7} max={12} style={{ width: 100 }} />
        </Form.Item>
        <Form.Item label="Wali Kelas" name="homeroomId">
          <Select
            allowClear
            placeholder="Pilih wali kelas"
            style={{ minWidth: 200 }}
            options={teachers.map((teacher) => ({
              value: teacher.id,
              label: teacher.fullName,
            }))}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" onClick={handleCreate} loading={saving} disabled={!term?.id}>
            Tambah Kelas
          </Button>
        </Form.Item>
      </Form>
      {!term?.id ? (
        <Alert
          type="warning"
          showIcon
          message="Semester belum ditentukan"
          description="Selesaikan langkah semester sebelum menambahkan kelas baru."
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Table
        size="small"
        dataSource={classes}
        columns={columns}
        pagination={{ pageSize: 5 }}
        rowKey={(record) => record.id ?? record.name}
        locale={{
          emptyText: "Belum ada data kelas. Tambahkan kelas untuk mulai mengatur mapel.",
        }}
        style={{ marginBottom: 16 }}
      />
      <Space>
        <Button
          type="primary"
          onClick={() =>
            onComplete({
              created: createdCount,
              total: classes.length,
            })
          }
        >
          Lanjut ke Mapping Mapel
        </Button>
        <Button type="link" onClick={onSkip}>
          Lewati langkah ini
        </Button>
        <Typography.Text type="secondary">
          Total kelas saat ini: <strong>{classes.length}</strong>
        </Typography.Text>
      </Space>
    </Card>
  );
};

type SubjectMappingFormValues = {
  classroomId: string;
  subjectId: string;
  teacherId?: string;
};

const SubjectMappingStep: React.FC<{
  classes: Record<string, any>[];
  subjects: Record<string, any>[];
  teachers: Record<string, any>[];
  mappings: ClassSubjectRow[];
  onComplete: (result: SubjectMappingResult) => void;
  onSkip: () => void;
  onRefresh: () => void;
}> = ({ classes, subjects, teachers, mappings, onComplete, onSkip, onRefresh }) => {
  const [form] = Form.useForm<SubjectMappingFormValues>();
  const { mutateAsync: createMapping } = useCreate();
  const { mutateAsync: updateMapping } = useUpdate();
  const { mutateAsync: deleteMapping } = useDelete();
  const { open: notify } = useAppNotification();
  const [createdCount, setCreatedCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (editingId) {
      const target = mappings.find((item) => item.id === editingId);
      if (target) {
        form.setFieldsValue({
          classroomId: target.classroomId,
          subjectId: target.subjectId,
          teacherId: target.teacherId,
        });
      }
    } else {
      form.resetFields();
    }
  }, [editingId, form, mappings]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editingId) {
        await updateMapping({
          resource: "class-subjects",
          id: editingId,
          values: {
            classroomId: values.classroomId,
            subjectId: values.subjectId,
            teacherId: values.teacherId ?? null,
          },
        });
        notify?.({
          type: "success",
          message: "Mapping diperbarui",
          description: "Data mapping berhasil disimpan.",
        });
      } else {
        await createMapping({
          resource: "class-subjects",
          values: {
            classroomId: values.classroomId,
            subjectId: values.subjectId,
            teacherId: values.teacherId ?? null,
          },
        });
        setCreatedCount((prev) => prev + 1);
        notify?.({
          type: "success",
          message: "Mapping mapel tersimpan",
          description: "Kombinasi kelas, mapel, dan guru berhasil ditambahkan.",
        });
      }
      setEditingId(null);
      await onRefresh();
    } catch (error) {
      notify?.({
        type: "error",
        message: "Gagal menyimpan mapping",
        description: extractErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Kelas",
        dataIndex: "classroomId",
        render: (id: string) => classes.find((cls) => cls.id === id)?.name ?? id,
      },
      {
        title: "Mapel",
        dataIndex: "subjectId",
        render: (id: string) => subjects.find((sub) => sub.id === id)?.name ?? id,
      },
      {
        title: "Guru",
        dataIndex: "teacherId",
        render: (id: string | undefined) => {
          if (!id) return <Typography.Text type="secondary">Belum ditetapkan</Typography.Text>;
          const teacher = teachers.find((t) => t.id === id);
          return teacher ? teacher.fullName : id;
        },
      },
    ],
    [classes, subjects, teachers]
  );

  return (
    <Card title="Langkah 5 · Mapping Mapel ke Kelas" bordered={false}>
      <Typography.Paragraph>
        Hubungkan mata pelajaran ke kelas dan tentukan guru pengampu. Langkah ini diperlukan sebelum
        menyusun jadwal.
      </Typography.Paragraph>
      <Form<SubjectMappingFormValues> layout="inline" form={form} style={{ marginBottom: 16 }}>
        <Form.Item
          label="Kelas"
          name="classroomId"
          rules={[{ required: true, message: "Kelas wajib dipilih." }]}
        >
          <Select
            placeholder="Pilih kelas"
            style={{ minWidth: 180 }}
            options={classes.map((cls) => ({
              value: cls.id,
              label: cls.name,
            }))}
          />
        </Form.Item>
        <Form.Item
          label="Mapel"
          name="subjectId"
          rules={[{ required: true, message: "Mapel wajib dipilih." }]}
        >
          <Select
            placeholder="Pilih mapel"
            style={{ minWidth: 180 }}
            options={subjects.map((subject) => ({
              value: subject.id,
              label: subject.name,
            }))}
          />
        </Form.Item>
        <Form.Item label="Guru" name="teacherId">
          <Select
            allowClear
            placeholder="Pilih guru pengampu"
            style={{ minWidth: 180 }}
            options={teachers.map((teacher) => ({
              value: teacher.id,
              label: teacher.fullName,
            }))}
          />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            onClick={handleCreate}
            loading={saving}
            disabled={classes.length === 0}
          >
            {editingId ? "Simpan Perubahan" : "Tambah Mapping"}
          </Button>
        </Form.Item>
        {editingId ? (
          <Form.Item>
            <Button
              onClick={() => {
                setEditingId(null);
                form.resetFields();
              }}
            >
              Batalkan
            </Button>
          </Form.Item>
        ) : null}
      </Form>
      {classes.length === 0 || subjects.length === 0 ? (
        <Alert
          type="warning"
          showIcon
          message="Data kelas atau mapel belum tersedia"
          description="Pastikan sudah menambahkan kelas dan mata pelajaran sebelum membuat mapping."
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Table
        size="small"
        dataSource={mappings}
        columns={[
          ...columns,
          {
            title: "Aksi",
            dataIndex: "id",
            width: 160,
            render: (id: string) => (
              <Space>
                <Button
                  size="small"
                  onClick={() => {
                    setEditingId(id);
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  danger
                  onClick={async () => {
                    try {
                      await deleteMapping({ resource: "class-subjects", id });
                      notify?.({
                        type: "success",
                        message: "Mapping dihapus",
                        description: "Mapping mapel berhasil dihapus.",
                      });
                      if (editingId === id) {
                        setEditingId(null);
                        form.resetFields();
                      }
                      await onRefresh();
                    } catch (error) {
                      notify?.({
                        type: "error",
                        message: "Gagal menghapus mapping",
                        description: extractErrorMessage(error),
                      });
                    }
                  }}
                >
                  Hapus
                </Button>
              </Space>
            ),
          },
        ]}
        pagination={{ pageSize: 5 }}
        rowKey={(record) => record.id}
        locale={{
          emptyText: "Belum ada mapping mapel. Tambahkan untuk melanjutkan penjadwalan.",
        }}
        style={{ marginBottom: 16 }}
      />
      <Space>
        <Button
          type="primary"
          onClick={() =>
            onComplete({
              mappingsCreated: createdCount,
              totalMappings: mappings.length,
            })
          }
        >
          Lanjut ke Jadwal
        </Button>
        <Button type="link" onClick={onSkip}>
          Lewati langkah ini
        </Button>
        <Typography.Text type="secondary">
          Total mapping aktif: <strong>{mappings.length}</strong>
        </Typography.Text>
      </Space>
    </Card>
  );
};

type ScheduleFormValues = {
  classSubjectId: string;
  dayOfWeek: number;
  startTime: Dayjs;
  endTime: Dayjs;
  room?: string;
};

const ScheduleSetupStep: React.FC<{
  classSubjects: ClassSubjectRow[];
  classes: Record<string, any>[];
  subjects: Record<string, any>[];
  teachers: Record<string, any>[];
  schedules: ScheduleRow[];
  onComplete: (result: ScheduleSetupResult) => void;
  onSkip: () => void;
  onRefresh: () => void;
}> = ({ classSubjects, classes, subjects, teachers, schedules, onComplete, onSkip, onRefresh }) => {
  const [form] = Form.useForm<ScheduleFormValues>();
  const { mutateAsync: createSchedule } = useCreate();
  const { mutateAsync: updateSchedule } = useUpdate();
  const { mutateAsync: deleteSchedule } = useDelete();
  const { open: notify } = useAppNotification();
  const [createdCount, setCreatedCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (editingId) {
      const target = schedules.find((item) => item.id === editingId);
      if (target) {
        form.setFieldsValue({
          classSubjectId: target.classSubjectId,
          dayOfWeek: target.dayOfWeek,
          startTime: dayjs(target.startTime, TIME_FORMAT),
          endTime: dayjs(target.endTime, TIME_FORMAT),
          room: target.room,
        });
      }
    } else {
      form.resetFields();
    }
  }, [editingId, form, schedules]);

  const mappingDictionary = useMemo(() => {
    const map = new Map<string, ClassSubjectRow>();
    classSubjects.forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [classSubjects]);

  const conflictCount = useMemo(
    () => calculateScheduleConflicts(schedules, classSubjects),
    [schedules, classSubjects]
  );

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const start = values.startTime.format(TIME_FORMAT);
      const end = values.endTime.format(TIME_FORMAT);
      const startMinutes = parseTimeToMinutes(start);
      const endMinutes = parseTimeToMinutes(end);
      if (endMinutes <= startMinutes) {
        notify?.({
          type: "warning",
          message: "Jam tidak valid",
          description: "Jam selesai harus lebih besar daripada jam mulai.",
        });
        return;
      }

      setSaving(true);
      if (editingId) {
        await updateSchedule({
          resource: "schedules",
          id: editingId,
          values: {
            classSubjectId: values.classSubjectId,
            dayOfWeek: values.dayOfWeek,
            startTime: start,
            endTime: end,
            room: values.room ?? null,
          },
        });
        notify?.({
          type: "success",
          message: "Jadwal diperbarui",
          description: "Perubahan jadwal berhasil disimpan.",
        });
      } else {
        await createSchedule({
          resource: "schedules",
          values: {
            classSubjectId: values.classSubjectId,
            dayOfWeek: values.dayOfWeek,
            startTime: start,
            endTime: end,
            room: values.room ?? null,
          },
        });
        setCreatedCount((prev) => prev + 1);
        notify?.({
          type: "success",
          message: "Jadwal ditambahkan",
          description: "Sesi pembelajaran berhasil dijadwalkan.",
        });
      }
      setEditingId(null);
      form.resetFields();
      await onRefresh();
    } catch (error) {
      notify?.({
        type: "error",
        message: "Gagal menyimpan jadwal",
        description: extractErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Hari",
        dataIndex: "dayOfWeek",
        render: (dayOfWeek: number) =>
          DAY_OPTIONS.find((opt) => opt.value === dayOfWeek)?.label ?? dayOfWeek,
      },
      {
        title: "Waktu",
        dataIndex: "startTime",
        render: (_: string, record: ScheduleRow) => `${record.startTime} - ${record.endTime}`,
      },
      {
        title: "Kelas",
        dataIndex: "classSubjectId",
        render: (id: string) => {
          const mapping = mappingDictionary.get(id);
          const classroom = classes.find((cls) => cls.id === mapping?.classroomId);
          return classroom?.name ?? id;
        },
      },
      {
        title: "Mapel",
        dataIndex: "classSubjectId",
        render: (id: string) => {
          const mapping = mappingDictionary.get(id);
          const subject = subjects.find((sub) => sub.id === mapping?.subjectId);
          return subject?.name ?? id;
        },
      },
      {
        title: "Guru",
        dataIndex: "classSubjectId",
        render: (id: string) => {
          const mapping = mappingDictionary.get(id);
          const teacher = teachers.find((t) => t.id === mapping?.teacherId);
          return teacher ? (
            teacher.fullName
          ) : (
            <Typography.Text type="secondary">Belum ditetapkan</Typography.Text>
          );
        },
      },
      {
        title: "Ruang",
        dataIndex: "room",
        render: (room: string | undefined) =>
          room ? room : <Typography.Text type="secondary">Tidak ditentukan</Typography.Text>,
      },
    ],
    [classes, mappingDictionary, subjects, teachers]
  );

  return (
    <Card title="Langkah 6 · Susun Jadwal" bordered={false}>
      <Typography.Paragraph>
        Tentukan jadwal belajar setiap kelas. Sistem akan menandai jika ada potensi bentrok pada
        kelas, guru, atau ruangan yang sama.
      </Typography.Paragraph>
      <Form<ScheduleFormValues> layout="inline" form={form} style={{ marginBottom: 16 }}>
        <Form.Item
          label="Mapping Mapel"
          name="classSubjectId"
          rules={[{ required: true, message: "Mapping mapel wajib dipilih." }]}
        >
          <Select
            placeholder="Pilih mapping"
            style={{ minWidth: 220 }}
            options={classSubjects.map((item) => {
              const classroom = classes.find((cls) => cls.id === item.classroomId);
              const subject = subjects.find((sub) => sub.id === item.subjectId);
              const teacher = teachers.find((t) => t.id === item.teacherId);
              return {
                value: item.id,
                label: `${classroom?.name ?? "Kelas"} · ${subject?.name ?? "Mapel"}${
                  teacher ? ` · ${teacher.fullName}` : ""
                }`,
              };
            })}
          />
        </Form.Item>
        <Form.Item
          label="Hari"
          name="dayOfWeek"
          rules={[{ required: true, message: "Hari wajib dipilih." }]}
        >
          <Select placeholder="Pilih hari" style={{ width: 140 }} options={DAY_OPTIONS} />
        </Form.Item>
        <Form.Item
          label="Mulai"
          name="startTime"
          rules={[{ required: true, message: "Jam mulai wajib diisi." }]}
        >
          <TimePicker format={TIME_FORMAT} minuteStep={5} />
        </Form.Item>
        <Form.Item
          label="Selesai"
          name="endTime"
          rules={[{ required: true, message: "Jam selesai wajib diisi." }]}
        >
          <TimePicker format={TIME_FORMAT} minuteStep={5} />
        </Form.Item>
        <Form.Item label="Ruang" name="room">
          <Input placeholder="Misal: Ruang 101" style={{ width: 160 }} />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            onClick={handleCreate}
            loading={saving}
            disabled={classSubjects.length === 0}
          >
            {editingId ? "Simpan Jadwal" : "Tambah Jadwal"}
          </Button>
        </Form.Item>
        {editingId ? (
          <Form.Item>
            <Button
              onClick={() => {
                setEditingId(null);
                form.resetFields();
              }}
            >
              Batalkan
            </Button>
          </Form.Item>
        ) : null}
      </Form>
      {classSubjects.length === 0 ? (
        <Alert
          type="warning"
          showIcon
          message="Mapping mapel kosong"
          description="Tambahkan mapping mapel sebelum menyusun jadwal."
          style={{ marginBottom: 16 }}
        />
      ) : null}
      {conflictCount > 0 ? (
        <Alert
          type="warning"
          showIcon
          message="Potensi bentrok jadwal"
          description={`${conflictCount} potensi bentrok terdeteksi berdasarkan jadwal yang ada. Periksa kembali kombinasi hari dan jam.`}
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Table
        size="small"
        dataSource={schedules}
        columns={[
          ...columns,
          {
            title: "Aksi",
            dataIndex: "id",
            width: 200,
            render: (id: string) => (
              <Space>
                <Button size="small" onClick={() => setEditingId(id)}>
                  Edit
                </Button>
                <Button
                  size="small"
                  danger
                  onClick={async () => {
                    try {
                      await deleteSchedule({ resource: "schedules", id });
                      notify?.({
                        type: "success",
                        message: "Jadwal dihapus",
                        description: "Sesi berhasil dihapus dari jadwal.",
                      });
                      if (editingId === id) {
                        setEditingId(null);
                        form.resetFields();
                      }
                      await onRefresh();
                    } catch (error) {
                      notify?.({
                        type: "error",
                        message: "Gagal menghapus jadwal",
                        description: extractErrorMessage(error),
                      });
                    }
                  }}
                >
                  Hapus
                </Button>
              </Space>
            ),
          },
        ]}
        pagination={{ pageSize: 5 }}
        rowKey={(record) => record.id}
        locale={{
          emptyText: "Belum ada jadwal tersimpan.",
        }}
        style={{ marginBottom: 16 }}
      />
      <Space>
        <Button
          type="primary"
          onClick={() =>
            onComplete({
              sessionsCreated: createdCount,
              totalSessions: schedules.length,
              conflicts: conflictCount,
            })
          }
        >
          Lanjut ke Ringkasan
        </Button>
        <Button type="link" onClick={onSkip}>
          Lewati langkah ini
        </Button>
        <Typography.Text type="secondary">
          Total sesi jadwal: <strong>{schedules.length}</strong>
        </Typography.Text>
      </Space>
    </Card>
  );
};

const SummaryStep: React.FC<{
  term: TermRecord | null;
  studentResult: StudentImportResult | null;
  teacherResult: TeacherImportResult | null;
  classResult: ClassSetupResult | null;
  mappingResult: SubjectMappingResult | null;
  scheduleResult: ScheduleSetupResult | null;
  students: Record<string, any>[];
  teachers: Record<string, any>[];
  classes: Record<string, any>[];
  mappings: ClassSubjectRow[];
  schedules: ScheduleRow[];
  onFinish: (target?: string) => void;
  onOpenStatus: () => void;
}> = ({
  term,
  studentResult,
  teacherResult,
  classResult,
  mappingResult,
  scheduleResult,
  students,
  teachers,
  classes,
  mappings,
  schedules,
  onFinish,
  onOpenStatus,
}) => {
  return (
    <Card bordered={false}>
      <Result
        status="success"
        title="Wizard pra-semester selesai"
        subTitle="Langkah awal tahun ajaran telah dipersiapkan. Silakan lanjutkan ke pengelolaan kelas, jadwal, dan penugasan guru."
        extra={
          <Space>
            <Button type="primary" onClick={() => onFinish("/terms")}>
              Buka Data Semester
            </Button>
            <Button onClick={() => onFinish("/students")}>Kelola Data Siswa</Button>
            <Button onClick={onOpenStatus}>Lihat Snapshot Pra-Semester</Button>
          </Space>
        }
      />
      <Divider />
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Typography.Title level={4}>Ringkasan Semester</Typography.Title>
          {term ? (
            <ul>
              <li>
                Nama: <strong>{term.name}</strong>
              </li>
              <li>
                Periode: {dayjs(term.startDate).format("DD MMM YYYY")} –{" "}
                {dayjs(term.endDate).format("DD MMM YYYY")}
              </li>
              <li>Status: {isTermActive(term) ? "Aktif" : "Draft"}</li>
            </ul>
          ) : (
            <Typography.Text type="secondary">
              Belum ada data semester yang tersimpan dalam sesi ini.
            </Typography.Text>
          )}
        </Col>
        <Col xs={24} md={12}>
          <Typography.Title level={4}>Ringkasan Import</Typography.Title>
          <ul>
            <li>
              Siswa baru: <strong>{studentResult ? studentResult.imported : 0}</strong>{" "}
              {studentResult ? `/ ${studentResult.totalReady} baris siap` : null}
            </li>
            <li>
              Guru baru: <strong>{teacherResult ? teacherResult.imported : 0}</strong>{" "}
              {teacherResult ? `/ ${teacherResult.totalReady} baris siap` : null}
            </li>
            <li>
              Kelas aktif: <strong>{classResult ? classResult.total : classes.length}</strong>{" "}
              {classResult ? `(ditambah ${classResult.created} baru)` : null}
            </li>
            <li>
              Mapping mapel:{" "}
              <strong>{mappingResult ? mappingResult.totalMappings : mappings.length}</strong>{" "}
              {mappingResult ? `(ditambah ${mappingResult.mappingsCreated} baru)` : null}
            </li>
            <li>
              Jadwal tersimpan:{" "}
              <strong>{scheduleResult ? scheduleResult.totalSessions : schedules.length}</strong>{" "}
              {scheduleResult && scheduleResult.conflicts > 0
                ? `(potensi bentrok ${scheduleResult.conflicts})`
                : null}
            </li>
          </ul>
        </Col>
      </Row>
      <Divider />
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Typography.Title level={5}>Siswa Terbaru</Typography.Title>
          <Table
            size="small"
            dataSource={students.slice(0, 5)}
            columns={[
              { title: "NIS", dataIndex: "nis", width: 100 },
              { title: "Nama", dataIndex: "fullName" },
            ]}
            pagination={false}
            rowKey={(record) => record.id ?? record.nis}
            locale={{ emptyText: "Belum ada data siswa." }}
          />
        </Col>
        <Col xs={24} md={12}>
          <Typography.Title level={5}>Guru Terbaru</Typography.Title>
          <Table
            size="small"
            dataSource={teachers.slice(0, 5)}
            columns={[
              { title: "NIP", dataIndex: "nip", width: 120 },
              { title: "Nama", dataIndex: "fullName" },
            ]}
            pagination={false}
            rowKey={(record) => record.id ?? record.nip}
            locale={{ emptyText: "Belum ada data guru." }}
          />
        </Col>
      </Row>
    </Card>
  );
};

export const SetupWizard: React.FC = () => {
  const navigate = useNavigate();
  const { open: notify } = useAppNotification();

  const migratedStudentsQuery = useList({
    resource: "students",
    pagination: { currentPage: 1, pageSize: 1000 },
  });

  const studentsQuery = {
    ...migratedStudentsQuery.result,
    ...migratedStudentsQuery.query,
    ...migratedStudentsQuery,
  };

  const migratedTeachersQuery = useList({
    resource: "teachers",
    pagination: { currentPage: 1, pageSize: 1000 },
  });

  const teachersQuery = {
    ...migratedTeachersQuery.result,
    ...migratedTeachersQuery.query,
    ...migratedTeachersQuery,
  };

  const migratedClassesQuery = useList({
    resource: "classes",
    pagination: { currentPage: 1, pageSize: 1000 },
  });

  const classesQuery = {
    ...migratedClassesQuery.result,
    ...migratedClassesQuery.query,
    ...migratedClassesQuery,
  };

  const migratedSubjectsQuery = useList({
    resource: "subjects",
    pagination: { currentPage: 1, pageSize: 1000 },
  });

  const subjectsQuery = {
    ...migratedSubjectsQuery.result,
    ...migratedSubjectsQuery.query,
    ...migratedSubjectsQuery,
  };

  const migratedClassSubjectsQuery = useList({
    resource: "class-subjects",
    pagination: { currentPage: 1, pageSize: 1000 },
  });

  const classSubjectsQuery = {
    ...migratedClassSubjectsQuery.result,
    ...migratedClassSubjectsQuery.query,
    ...migratedClassSubjectsQuery,
  };

  const migratedSchedulesQuery = useList({
    resource: "schedules",
    pagination: { currentPage: 1, pageSize: 1000 },
  });

  const schedulesQuery = {
    ...migratedSchedulesQuery.result,
    ...migratedSchedulesQuery.query,
    ...migratedSchedulesQuery,
  };

  const [currentStep, setCurrentStep] = useState(0);
  const [termRecord, setTermRecord] = useState<TermRecord | null>(null);
  const [studentResult, setStudentResult] = useState<StudentImportResult | null>(null);
  const [teacherResult, setTeacherResult] = useState<TeacherImportResult | null>(null);
  const [classResult, setClassResult] = useState<ClassSetupResult | null>(null);
  const [mappingResult, setMappingResult] = useState<SubjectMappingResult | null>(null);
  const [scheduleResult, setScheduleResult] = useState<ScheduleSetupResult | null>(null);

  const [termCompleted, setTermCompleted] = useState(false);
  const [studentCompleted, setStudentCompleted] = useState(false);
  const [teacherCompleted, setTeacherCompleted] = useState(false);
  const [classCompleted, setClassCompleted] = useState(false);
  const [mappingCompleted, setMappingCompleted] = useState(false);
  const [scheduleCompleted, setScheduleCompleted] = useState(false);

  const handleTermSuccess = (term: TermRecord) => {
    setTermRecord(term);
    setTermCompleted(true);
    setCurrentStep((prev) => Math.max(prev, 1));
  };

  const handleStudentComplete = (result: StudentImportResult) => {
    setStudentResult(result);
    setStudentCompleted(true);
    setCurrentStep((prev) => Math.max(prev, 2));
    void studentsQuery.refetch?.();
  };

  const handleTeacherComplete = (result: TeacherImportResult) => {
    setTeacherResult(result);
    setTeacherCompleted(true);
    setCurrentStep((prev) => Math.max(prev, 3));
    void teachersQuery.refetch?.();
  };

  const handleClassComplete = async (result: ClassSetupResult) => {
    setClassResult(result);
    setClassCompleted(true);
    setCurrentStep((prev) => Math.max(prev, 4));
    await classesQuery.refetch?.();
  };

  const handleMappingComplete = async (result: SubjectMappingResult) => {
    setMappingResult(result);
    setMappingCompleted(true);
    setCurrentStep((prev) => Math.max(prev, 5));
    await classSubjectsQuery.refetch?.();
  };

  const handleScheduleComplete = async (result: ScheduleSetupResult) => {
    setScheduleResult(result);
    setScheduleCompleted(true);
    setCurrentStep((prev) => Math.max(prev, 6));
    await schedulesQuery.refetch?.();
  };

  const handleSummaryNavigate = (target?: string) => {
    navigate(getSafeInternalRoute(target));
  };

  const maxStepAvailable = scheduleCompleted
    ? 6
    : mappingCompleted
      ? 5
      : classCompleted
        ? 4
        : teacherCompleted
          ? 3
          : studentCompleted
            ? 2
            : termCompleted
              ? 1
              : 0;

  const handleStepChange = (value: number) => {
    if (value <= maxStepAvailable) {
      setCurrentStep(value);
    } else {
      notify?.({
        type: "warning",
        message: "Selesaikan langkah sebelumnya",
        description: "Ikuti urutan wizard untuk memastikan semua prasyarat terpenuhi.",
      });
    }
  };

  const computeStatus = useCallback(
    (index: number, completed: boolean) => {
      if (completed) return "finish" as const;
      if (currentStep === index) return "process" as const;
      if (currentStep > index) return "finish" as const;
      return "wait" as const;
    },
    [currentStep]
  );

  const steps = [
    {
      title: "Semester",
      status: computeStatus(0, termCompleted),
    },
    {
      title: "Impor Siswa",
      status: computeStatus(1, studentCompleted),
    },
    {
      title: "Impor Guru",
      status: computeStatus(2, teacherCompleted),
    },
    {
      title: "Kelas & Wali",
      status: computeStatus(3, classCompleted),
    },
    {
      title: "Mapping Mapel",
      status: computeStatus(4, mappingCompleted),
    },
    {
      title: "Jadwal",
      status: computeStatus(5, scheduleCompleted),
    },
    {
      title: "Ringkasan",
      status:
        currentStep === 6
          ? ("process" as const)
          : scheduleCompleted
            ? ("process" as const)
            : ("wait" as const),
    },
  ];

  const renderContent = () => {
    if (currentStep === 0) {
      return <TermSetupStep existingTerm={termRecord} onSuccess={handleTermSuccess} />;
    }
    if (currentStep === 1) {
      return (
        <StudentImportStep
          existingStudents={(studentsQuery.data?.data as Record<string, any>[]) ?? []}
          onComplete={handleStudentComplete}
          onSkip={() => {
            setStudentCompleted(true);
            setCurrentStep(2);
          }}
        />
      );
    }
    if (currentStep === 2) {
      return (
        <TeacherImportStep
          existingTeachers={(teachersQuery.data?.data as Record<string, any>[]) ?? []}
          onComplete={handleTeacherComplete}
          onSkip={() => {
            setTeacherCompleted(true);
            setCurrentStep(3);
          }}
        />
      );
    }
    if (currentStep === 3) {
      return (
        <ClassSetupStep
          term={termRecord}
          classes={(classesQuery.data?.data as Record<string, any>[]) ?? []}
          teachers={(teachersQuery.data?.data as Record<string, any>[]) ?? []}
          onComplete={handleClassComplete}
          onSkip={() => {
            setClassCompleted(true);
            setCurrentStep(4);
          }}
          onRefresh={async () => {
            await classesQuery.refetch?.();
          }}
        />
      );
    }
    if (currentStep === 4) {
      return (
        <SubjectMappingStep
          classes={(classesQuery.data?.data as Record<string, any>[]) ?? []}
          subjects={(subjectsQuery.data?.data as Record<string, any>[]) ?? []}
          teachers={(teachersQuery.data?.data as Record<string, any>[]) ?? []}
          mappings={(classSubjectsQuery.data?.data as ClassSubjectRow[]) ?? []}
          onComplete={handleMappingComplete}
          onSkip={() => {
            setMappingCompleted(true);
            setCurrentStep(5);
          }}
          onRefresh={async () => {
            await classSubjectsQuery.refetch?.();
          }}
        />
      );
    }
    if (currentStep === 5) {
      return (
        <ScheduleSetupStep
          classSubjects={(classSubjectsQuery.data?.data as ClassSubjectRow[]) ?? []}
          classes={(classesQuery.data?.data as Record<string, any>[]) ?? []}
          subjects={(subjectsQuery.data?.data as Record<string, any>[]) ?? []}
          teachers={(teachersQuery.data?.data as Record<string, any>[]) ?? []}
          schedules={(schedulesQuery.data?.data as ScheduleRow[]) ?? []}
          onComplete={handleScheduleComplete}
          onSkip={() => {
            setScheduleCompleted(true);
            setCurrentStep(6);
          }}
          onRefresh={async () => {
            await schedulesQuery.refetch?.();
          }}
        />
      );
    }
    return (
      <SummaryStep
        term={termRecord}
        studentResult={studentResult}
        teacherResult={teacherResult}
        classResult={classResult}
        mappingResult={mappingResult}
        scheduleResult={scheduleResult}
        students={(studentsQuery.data?.data as Record<string, any>[]) ?? []}
        teachers={(teachersQuery.data?.data as Record<string, any>[]) ?? []}
        classes={(classesQuery.data?.data as Record<string, any>[]) ?? []}
        mappings={(classSubjectsQuery.data?.data as ClassSubjectRow[]) ?? []}
        schedules={(schedulesQuery.data?.data as ScheduleRow[]) ?? []}
        onFinish={handleSummaryNavigate}
        onOpenStatus={() => navigate("/setup/pre-semester-snapshot")}
      />
    );
  };

  return (
    <ResourceActionGuard action="create" resourceName="terms">
      <div style={{ padding: 24 }}>
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <Button icon={<SwapLeftOutlined />} onClick={() => navigate(-1)}>
            Kembali
          </Button>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>
            Wizard Pra-Semester
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
            Ikuti langkah-langkah berikut untuk menyiapkan tahun ajaran baru tanpa backend. Semua
            data disimpan melalui MSW sehingga aman untuk percobaan.
          </Typography.Paragraph>
          <Steps current={currentStep} items={steps} onChange={handleStepChange} responsive />
          {renderContent()}
        </Space>
      </div>
    </ResourceActionGuard>
  );
};
