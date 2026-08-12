import { useEffect, useState } from "react";
import {
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  FileTextOutlined,
  LogoutOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App as AntApp,
  Avatar,
  Button,
  Card,
  ConfigProvider,
  Descriptions,
  Empty,
  Form,
  Input,
  Layout,
  List,
  Menu,
  Result,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { MenuProps } from "antd";
import type {
  PortalAnnouncementsResponse,
  PortalAttendanceResponse,
  PortalBehaviorResponse,
  PortalCalendarResponse,
  PortalGradesResponse,
} from "@portal-types";
import { portalClient, type PortalHomeroom, type PortalReportCard } from "@/api/portal-client";
import { useSession } from "@/session/session-context";

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
type View =
  | "grades"
  | "report-card"
  | "attendance"
  | "announcements"
  | "behavior"
  | "calendar"
  | "homeroom";

const menuItems: MenuProps["items"] = [
  { key: "grades", icon: <BookOutlined />, label: "Nilai" },
  { key: "report-card", icon: <FileTextOutlined />, label: "Rapor" },
  { key: "attendance", icon: <SafetyCertificateOutlined />, label: "Kehadiran" },
  { key: "announcements", icon: <BellOutlined />, label: "Pengumuman" },
  { key: "behavior", icon: <UserOutlined />, label: "Perilaku" },
  { key: "calendar", icon: <CalendarOutlined />, label: "Kalender" },
  { key: "homeroom", icon: <TeamOutlined />, label: "Wali Kelas" },
];

const viewTitles: Record<View, string> = {
  grades: "Nilai Akademik",
  "report-card": "Rapor Siswa",
  attendance: "Kehadiran",
  announcements: "Pengumuman Sekolah",
  behavior: "Catatan Perilaku",
  calendar: "Kalender Akademik",
  homeroom: "Informasi Wali Kelas",
};

export function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#2563eb",
          borderRadius: 8,
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        },
      }}
    >
      <AntApp>
        <PortalRouter />
      </AntApp>
    </ConfigProvider>
  );
}

function PortalRouter() {
  const { session, isRestoring } = useSession();
  if (isRestoring)
    return (
      <div className="centered">
        <Spin size="large" tip="Memulihkan sesi..." />
      </div>
    );
  return session ? <PortalShell /> : <AuthPage />;
}

function AuthPage() {
  const { login } = useSession();
  const [mode, setMode] = useState<"login" | "forgot" | "reset">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const submit = async (values: Record<string, string>) => {
    setBusy(true);
    setMessage(undefined);
    setError(undefined);
    try {
      if (mode === "login") await login({ email: values.email, password: values.password });
      if (mode === "forgot") {
        await portalClient.forgotPassword(values.email);
        setMessage("Jika email terdaftar, instruksi pemulihan akan dikirim.");
      }
      if (mode === "reset") {
        await portalClient.resetPassword(values.token, values.password);
        setMessage("Kata sandi telah diperbarui. Silakan masuk.");
        setMode("login");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Terjadi kesalahan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "login"
      ? "Masuk ke Portal"
      : mode === "forgot"
        ? "Lupa kata sandi"
        : "Atur ulang kata sandi";
  return (
    <main className="auth-page">
      <Card className="auth-card">
        <Space direction="vertical" size="small" className="auth-heading">
          <Avatar size={48} icon={<ReadOutlined />} className="brand-avatar" />
          <Title level={2}>{title}</Title>
          <Text type="secondary">Portal informasi orang tua dan siswa SMA</Text>
        </Space>
        {message && <Alert type="success" showIcon message={message} className="form-alert" />}
        {error && <Alert type="error" showIcon message={error} className="form-alert" />}
        <Form layout="vertical" onFinish={submit} requiredMark={false}>
          {mode !== "reset" && (
            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, type: "email", message: "Masukkan email yang valid." }]}
            >
              <Input autoComplete="email" />
            </Form.Item>
          )}
          {mode === "reset" && (
            <Form.Item
              name="token"
              label="Token pemulihan"
              rules={[{ required: true, message: "Masukkan token pemulihan." }]}
            >
              <Input />
            </Form.Item>
          )}
          {mode !== "forgot" && (
            <Form.Item
              name="password"
              label="Kata sandi"
              rules={[{ required: true, min: 8, message: "Kata sandi minimal 8 karakter." }]}
            >
              <Input.Password
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </Form.Item>
          )}
          <Button type="primary" htmlType="submit" loading={busy} block>
            {mode === "login"
              ? "Masuk"
              : mode === "forgot"
                ? "Kirim instruksi"
                : "Simpan kata sandi"}
          </Button>
        </Form>
        <Space direction="vertical" size={4} className="auth-links">
          {mode === "login" ? (
            <Button type="link" onClick={() => setMode("forgot")}>
              Lupa kata sandi?
            </Button>
          ) : (
            <Button type="link" onClick={() => setMode("login")}>
              Kembali ke halaman masuk
            </Button>
          )}
          {mode === "forgot" && (
            <Button type="link" onClick={() => setMode("reset")}>
              Sudah memiliki token pemulihan?
            </Button>
          )}
        </Space>
      </Card>
    </main>
  );
}

function PortalShell() {
  const { session, selectedStudent, selectStudent, logout } = useSession();
  const [view, setView] = useState<View>("grades");
  const students = session!.user.linkedStudents ?? [];
  const activeStudentId = selectedStudent?.id ?? session!.user.studentId;

  return (
    <Layout className="portal-layout">
      <Sider breakpoint="lg" collapsedWidth="0" className="portal-sider">
        <div className="brand">
          <ReadOutlined /> <span>Portal SMA</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[view]}
          items={menuItems}
          onClick={({ key }) => setView(key as View)}
        />
      </Sider>
      <Layout>
        <Header className="portal-header">
          <Space size="middle">
            <Avatar icon={<UserOutlined />} />
            <span>
              <strong>{session!.user.fullName}</strong>
              <br />
              <Text type="secondary">
                {session!.user.role === "PARENT" ? "Orang tua" : "Siswa"}
              </Text>
            </span>
          </Space>
          <Space>
            {students.length > 0 && (
              <Select
                aria-label="Pilih siswa"
                value={activeStudentId}
                onChange={selectStudent}
                options={students.map((student) => ({
                  value: student.id,
                  label: `${student.fullName} · ${student.className ?? ""}`,
                }))}
              />
            )}
            <Button type="text" icon={<LogoutOutlined />} onClick={() => void logout()}>
              Keluar
            </Button>
          </Space>
        </Header>
        <Content className="portal-content">
          <Title level={2}>{viewTitles[view]}</Title>
          {selectedStudent && (
            <Text type="secondary">
              Menampilkan data {selectedStudent.fullName}
              {selectedStudent.className ? ` · ${selectedStudent.className}` : ""}
            </Text>
          )}
          <PortalView view={view} studentId={activeStudentId} />
        </Content>
      </Layout>
    </Layout>
  );
}

function PortalView({ view, studentId }: { view: View; studentId?: string }) {
  const { session } = useSession();
  const [data, setData] = useState<unknown>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    const token = session!.accessToken;
    const query = { studentId };
    const calls: Record<View, () => Promise<unknown>> = {
      grades: () => portalClient.grades(query, token),
      "report-card": () => portalClient.reportCard(query, token),
      attendance: () => portalClient.attendance(query, token),
      announcements: () =>
        portalClient.announcements({ ...query, page: 1, limit: 20, active: true }, token),
      behavior: () => portalClient.behavior(query, token),
      calendar: () => portalClient.calendar(query, token),
      homeroom: () => portalClient.homeroom(query, token),
    };
    calls[view]()
      .then((result) => active && setData(result))
      .catch(
        (reason) =>
          active && setError(reason instanceof Error ? reason.message : "Data tidak dapat dimuat.")
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [session, studentId, view]);
  if (loading)
    return (
      <div className="view-state">
        <Spin tip="Memuat data..." />
      </div>
    );
  if (error) return <Result status="warning" title="Data belum tersedia" subTitle={error} />;
  return <ViewContent view={view} data={data} />;
}

function ViewContent({ view, data }: { view: View; data: unknown }) {
  if (view === "grades") return <GradesView data={data as PortalGradesResponse} />;
  if (view === "report-card") return <ReportCardView data={data as PortalReportCard} />;
  if (view === "attendance") return <AttendanceView data={data as PortalAttendanceResponse} />;
  if (view === "announcements")
    return <AnnouncementsView data={data as PortalAnnouncementsResponse} />;
  if (view === "behavior") return <BehaviorView data={data as PortalBehaviorResponse} />;
  if (view === "calendar") return <CalendarView data={data as PortalCalendarResponse} />;
  return <HomeroomView data={data as PortalHomeroom} />;
}

function GradesView({ data }: { data: PortalGradesResponse }) {
  return (
    <>
      <div className="stats">
        <Statistic title="Rata-rata nilai" value={data.summary?.gpa ?? 0} precision={2} />
        <Statistic title="Mata pelajaran lulus" value={data.summary?.passedSubjects ?? 0} />
        <Statistic title="Belum tuntas" value={data.summary?.failedSubjects ?? 0} />
      </div>
      <Table
        rowKey="subjectId"
        pagination={false}
        dataSource={data.grades}
        columns={[
          { title: "Mata pelajaran", dataIndex: "subjectName" },
          { title: "Guru", dataIndex: "teacherName", responsive: ["md"] },
          { title: "Nilai akhir", dataIndex: "finalGrade" },
          {
            title: "Predikat",
            dataIndex: "letterGrade",
            render: (grade) => <Tag color="blue">{grade}</Tag>,
          },
          {
            title: "Status",
            dataIndex: "isPassed",
            render: (passed) => (
              <Tag color={passed ? "green" : "red"}>{passed ? "Tuntas" : "Belum tuntas"}</Tag>
            ),
          },
        ]}
      />
    </>
  );
}
function ReportCardView({ data }: { data: PortalReportCard }) {
  return (
    <>
      <Card title={`${data.studentName} · ${data.termName}`}>
        <Descriptions column={{ xs: 1, sm: 3 }}>
          <Descriptions.Item label="NIS">{data.nis}</Descriptions.Item>
          <Descriptions.Item label="Kelas">{data.className}</Descriptions.Item>
          <Descriptions.Item label="Rata-rata">{data.summary.gpa.toFixed(2)}</Descriptions.Item>
        </Descriptions>
      </Card>
      <Table
        className="section-card"
        rowKey="subjectId"
        pagination={false}
        dataSource={data.grades}
        columns={[
          { title: "Mata pelajaran", dataIndex: "subjectName" },
          { title: "Nilai", dataIndex: "finalGrade" },
          { title: "Predikat", dataIndex: "letterGrade" },
          { title: "Guru", dataIndex: "teacherName", responsive: ["md"] },
        ]}
      />
    </>
  );
}
function AttendanceView({ data }: { data: PortalAttendanceResponse }) {
  return (
    <>
      <div className="stats">
        <Statistic title="Kehadiran" value={data.summary.percentage} suffix="%" precision={2} />
        <Statistic title="Hadir" value={data.summary.present} />
        <Statistic title="Tidak hadir" value={data.summary.absent} />
      </div>
      <Table
        rowKey="id"
        pagination={{ pageSize: 10 }}
        dataSource={data.daily}
        columns={[
          { title: "Tanggal", dataIndex: "date" },
          {
            title: "Status",
            dataIndex: "status",
            render: (status) => <AttendanceTag status={status} />,
          },
          { title: "Catatan", dataIndex: "notes" },
        ]}
      />
    </>
  );
}
function AttendanceTag({ status }: { status: string }) {
  const labels: Record<string, [string, string]> = {
    H: ["green", "Hadir"],
    S: ["orange", "Sakit"],
    I: ["gold", "Izin"],
    A: ["red", "Alpa"],
  };
  const [color, label] = labels[status] ?? ["default", status];
  return <Tag color={color}>{label}</Tag>;
}
function AnnouncementsView({ data }: { data: PortalAnnouncementsResponse }) {
  return (
    <List
      locale={{ emptyText: <Empty description="Belum ada pengumuman" /> }}
      dataSource={data.data}
      renderItem={(item) => (
        <List.Item>
          <Card
            size="small"
            className="full-card"
            title={
              <Space>
                {item.isPinned && <Tag color="gold">Disematkan</Tag>}
                {item.title}
              </Space>
            }
            extra={
              <Tag
                color={
                  item.priority === "URGENT" ? "red" : item.priority === "HIGH" ? "orange" : "blue"
                }
              >
                {item.priority}
              </Tag>
            }
          >
            <Paragraph>{item.content}</Paragraph>
            <Text type="secondary">
              {item.publisherName ?? "Sekolah"}
              {item.publishedAt
                ? ` · ${new Date(item.publishedAt).toLocaleDateString("id-ID")}`
                : ""}
            </Text>
          </Card>
        </List.Item>
      )}
    />
  );
}
function BehaviorView({ data }: { data: PortalBehaviorResponse }) {
  return (
    <>
      <div className="stats">
        <Statistic title="Poin total" value={data.summary.totalPoints} />
        <Statistic title="Catatan positif" value={data.summary.positiveNotes} />
        <Statistic title="Catatan negatif" value={data.summary.negativeNotes} />
      </div>
      <List
        locale={{ emptyText: <Empty description="Belum ada catatan perilaku" /> }}
        dataSource={data.notes}
        renderItem={(note) => (
          <List.Item>
            <List.Item.Meta
              title={
                <Space>
                  {note.title}
                  <Tag
                    color={
                      note.category === "POSITIVE"
                        ? "green"
                        : note.category === "NEGATIVE"
                          ? "red"
                          : "blue"
                    }
                  >
                    {note.category}
                  </Tag>
                </Space>
              }
              description={`${note.date} · ${note.reporterName ?? "Sekolah"}`}
            />
            <Text>{note.points > 0 ? `+${note.points}` : note.points} poin</Text>
          </List.Item>
        )}
      />
    </>
  );
}
function CalendarView({ data }: { data: PortalCalendarResponse }) {
  return (
    <List
      locale={{ emptyText: <Empty description="Belum ada agenda" /> }}
      dataSource={data.events}
      renderItem={(event) => (
        <List.Item>
          <List.Item.Meta
            avatar={<Avatar icon={<CalendarOutlined />} />}
            title={event.title}
            description={
              <>
                {event.startDate}
                {event.endDate !== event.startDate ? ` s.d. ${event.endDate}` : ""}
                {event.location ? ` · ${event.location}` : ""}
                <br />
                {event.description}
              </>
            }
          />
          <Tag color="blue">{event.eventType}</Tag>
        </List.Item>
      )}
    />
  );
}
function HomeroomView({ data }: { data: PortalHomeroom }) {
  return (
    <Card>
      <Descriptions title={data.studentName} column={{ xs: 1, sm: 2 }}>
        <Descriptions.Item label="Kelas">{data.className}</Descriptions.Item>
        <Descriptions.Item label="Semester">{data.termName}</Descriptions.Item>
        <Descriptions.Item label="Wali kelas">
          {data.homeroomTeacher?.name ?? "Belum ditetapkan"}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
