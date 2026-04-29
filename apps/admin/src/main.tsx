import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Refine, Authenticated } from "@refinedev/core";
import { ResourceActionGuard } from "./components/resource-action-guard";
import routerProvider, {
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router-v6";
import { ErrorComponent, notificationProvider } from "@refinedev/antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// We'll start MSW in development and await the worker to be ready before
// mounting the React app so all initial requests are intercepted.

import { resolveDataProvider } from "./providers/dataProvider";
import { authProvider } from "./providers/authProvider";
import { accessControlProvider } from "./providers/accessControlProvider";
import { ResourceList } from "./pages/resource-list";
import { LoginPage } from "./pages/login";
import { RouteDebugger } from "./components/route-debugger";
import { StudentsCreate } from "./pages/students-create";
import { StudentsEdit } from "./pages/students-edit";
import { TeachersCreate } from "./pages/teachers-create";
import { TeachersEdit } from "./pages/teachers-edit";
import { ClassesCreate } from "./pages/classes-create";
import { ClassesEdit } from "./pages/classes-edit";
import { SubjectsCreate } from "./pages/subjects-create";
import { SubjectsEdit } from "./pages/subjects-edit";
import { TermsCreate } from "./pages/terms-create";
import { TermsEdit } from "./pages/terms-edit";
import { SchedulesCreate } from "./pages/schedules-create";
import { SchedulesEdit } from "./pages/schedules-edit";
import { EnrollmentsCreate } from "./pages/enrollments-create";
import { EnrollmentsEdit } from "./pages/enrollments-edit";
import { GradeComponentsCreate } from "./pages/grade-components-create";
import { GradeComponentsEdit } from "./pages/grade-components-edit";
import { GradesEdit } from "./pages/grades-edit";
import {
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ContainerOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  FileDoneOutlined,
  NotificationOutlined,
  ReadOutlined,
  ScheduleOutlined,
  SolutionOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { GradeConfigPage } from "./pages/grade-config";
import { GradesPage } from "./pages/grades";
import { DashboardPage } from "./pages/dashboard";
import { AttendanceCreate } from "./pages/attendance-create";
import { AttendanceEdit } from "./pages/attendance-edit";
import { AttendanceDailyPage } from "./pages/attendance-daily";
import { AttendanceLessonPage } from "./pages/attendance-lesson";
import { AttendanceAnalyticsPage } from "./pages/attendance-analytics";
import { SetupWizard } from "./pages/setup-wizard";
import { ImportStatusPage } from "./pages/import-status";
import { AnnouncementsPage } from "./pages/announcements";
import { BehaviorNotesPage } from "./pages/behavior-notes";
import { AppLayout } from "./components/layout/app-layout";
import { ClassesPage } from "./pages/classes";
import { ClassesShow } from "./pages/classes-show";
import { SchedulesPage } from "./pages/schedules";
import { ScheduleGeneratorPage } from "./pages/schedule-generator";
import { TeacherPreferencesPage } from "./pages/teacher-preferences";
import { CalendarPage } from "./pages/calendar";
import { UsersPage } from "./pages/users";
import { HomeroomAssignmentsPage } from "./pages/homeroom-assignments";
import ConfigurationPage from "./pages/configuration";
import { StudentsPage } from "./pages/students";
import { TeachersPage } from "./pages/teachers";

import "@refinedev/antd/dist/reset.css";
import "antd/dist/reset.css";

import { ThemeProvider } from "./theme/theme-provider";

// render app after optional mock bootstrap (below)

const queryClient = new QueryClient();

const resources = [
  {
    name: "dashboard",
    list: "/dashboard",
    meta: {
      label: "Dasbor",
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canShow: false,
      icon: <DashboardOutlined />,
    },
  },
  {
    name: "students",
    list: "/students",
    create: "/students/create",
    edit: "/students/edit/:id",
    meta: {
      label: "Siswa",
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canShow: false,
      showSetupWizardLink: true,
      showImportStatusLink: true,
      icon: <SolutionOutlined />,
    },
  },
  {
    name: "teachers",
    list: "/teachers",
    create: "/teachers/create",
    edit: "/teachers/edit/:id",
    meta: {
      label: "Guru",
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canShow: false,
      showImportStatusLink: true,
      icon: <TeamOutlined />,
    },
  },
  {
    name: "classes",
    list: "/classes",
    create: "/classes/create",
    edit: "/classes/edit/:id",
    show: "/classes/show/:id",
    meta: {
      label: "Kelas",
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canShow: true,
      icon: <ReadOutlined />,
    },
  },
  {
    name: "subjects",
    list: "/subjects",
    create: "/subjects/create",
    edit: "/subjects/edit/:id",
    meta: {
      label: "Mata Pelajaran",
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canShow: false,
      icon: <BookOutlined />,
    },
  },
  {
    name: "terms",
    list: "/terms",
    create: "/terms/create",
    edit: "/terms/edit/:id",
    meta: {
      label: "Tahun Ajaran",
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canShow: false,
      showSetupWizardLink: true,
      icon: <ContainerOutlined />,
    },
  },
  {
    name: "calendar",
    list: "/calendar",
    meta: {
      label: "Kalender Akademik",
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canShow: false,
      icon: <CalendarOutlined />,
    },
  },
  {
    name: "teacher-preferences",
    list: "/schedules/preferences",
    meta: {
      label: "Preferensi Guru",
      canCreate: false,
      canEdit: true,
      canDelete: false,
      canShow: false,
    },
  },
  {
    name: "settings",
    list: "/configuration",
    meta: {
      label: "Konfigurasi",
      canCreate: false,
      canEdit: true,
      canDelete: false,
      canShow: false,
    },
  },
  {
    name: "enrollments",
    list: "/enrollments",
    create: "/enrollments/create",
    edit: "/enrollments/edit/:id",
    meta: {
      label: "Penempatan",
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canShow: false,
      icon: <DeploymentUnitOutlined />,
    },
  },
  {
    name: "homerooms",
    list: "/homerooms",
    meta: {
      label: "Wali Kelas",
      canCreate: false,
      canEdit: true,
      canDelete: false,
      canShow: false,
      icon: <UserOutlined />,
    },
  },
  {
    name: "schedules",
    list: "/schedules",
    create: "/schedules/create",
    edit: "/schedules/edit/:id",
    meta: {
      label: "Jadwal",
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canShow: false,
      icon: <CalendarOutlined />,
    },
  },
  {
    name: "grade-components",
    list: "/grade-components",
    create: "/grade-components/create",
    edit: "/grade-components/edit/:id",
    meta: {
      label: "Komponen Nilai",
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canShow: false,
      showGradeConfigLink: true,
      icon: <FileDoneOutlined />,
    },
  },
  {
    name: "grades",
    list: "/grades",
    edit: "/grades/edit/:id",
    meta: {
      label: "Nilai",
      canCreate: false,
      canEdit: true,
      canDelete: true,
      canShow: false,
      icon: <CheckCircleOutlined />,
    },
  },
  {
    name: "grade-configs",
    list: "/grade-configs",
    meta: {
      label: "Konfigurasi Penilaian",
      canCreate: false,
      canEdit: true,
      canDelete: true,
      canShow: false,
      icon: <FileDoneOutlined />,
    },
  },
  {
    name: "announcements",
    list: "/announcements",
    meta: {
      label: "Pengumuman",
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canShow: false,
      icon: <NotificationOutlined />,
    },
  },
  {
    name: "behavior-notes",
    list: "/behavior-notes",
    meta: {
      label: "Catatan Perilaku",
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canShow: false,
      icon: <FileDoneOutlined />,
    },
  },
  {
    name: "attendance",
    list: "/attendance",
    create: "/attendance/create",
    edit: "/attendance/edit/:id",
    meta: {
      label: "Absensi",
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canShow: false,
      icon: <ScheduleOutlined />,
    },
  },
  {
    name: "users",
    list: "/users",
    meta: {
      label: "Users & Roles",
      canCreate: false,
      canEdit: true,
      canDelete: true,
      canShow: false,
      icon: <TeamOutlined />,
    },
  },
  {
    name: "enrollments",
    list: "/enrollments",
    create: "/enrollments/create",
    edit: "/enrollments/edit/:id",
    meta: {
      label: "Penempatan",
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canShow: false,
      icon: <DeploymentUnitOutlined />,
    },
  },
] as const;

const resourceRouteConfig: Record<
  (typeof resources)[number]["name"],
  {
    create?: React.ReactNode;
    edit?: React.ReactNode;
  }
> = {
  students: {
    create: <StudentsCreate />,
    edit: <StudentsEdit />,
  },
  teachers: {
    create: <TeachersCreate />,
    edit: <TeachersEdit />,
  },
  classes: {
    create: <ClassesCreate />,
    edit: <ClassesEdit />,
  },
  subjects: {
    create: <SubjectsCreate />,
    edit: <SubjectsEdit />,
  },
  terms: {
    create: <TermsCreate />,
    edit: <TermsEdit />,
  },
  calendar: {},
  enrollments: {
    create: <EnrollmentsCreate />,
    edit: <EnrollmentsEdit />,
  },
  schedules: {
    create: <SchedulesCreate />,
    edit: <SchedulesEdit />,
  },
  "grade-components": {
    create: <GradeComponentsCreate />,
    edit: <GradeComponentsEdit />,
  },
  "grade-configs": {},
  announcements: {},
  "behavior-notes": {},
  grades: {
    edit: <GradesEdit />,
  },
  attendance: {
    create: <AttendanceCreate />,
    edit: <AttendanceEdit />,
  },
  homerooms: {},
  users: {},
};

const dataProvider = resolveDataProvider();
const ENABLE_MSW = (import.meta.env.VITE_USE_MSW ?? import.meta.env.VITE_ENABLE_MSW) === "true";
const shouldStartMSW = import.meta.env.DEV || ENABLE_MSW;

// Feature flag untuk mematikan layout kustom via env
const disableCustomLayout = import.meta.env.VITE_DISABLE_CUSTOM_LAYOUT === "true";
if (disableCustomLayout) {
  console.info("[Layout] Custom layout disabled. Using plain router outlet.");
}

// Pastikan Outlet selalu dirender baik saat pakai ThemedLayoutV2 maupun plain
const LayoutWrapper: React.FC = () => (disableCustomLayout ? <Outlet /> : <AppLayout />);

async function bootstrap() {
  if (shouldStartMSW) {
    try {
      // prefer a start helper if present, otherwise call worker.start()
      // @ts-ignore
      const mswMod = await import("./mocks/browser");
      if (typeof (mswMod as any).startWorker === "function") {
        await (mswMod as any).startWorker({ onUnhandledRequest: "bypass" });
      } else if ((mswMod as any).worker && typeof (mswMod as any).worker.start === "function") {
        await (mswMod as any).worker.start({ onUnhandledRequest: "bypass" });
      } else if (
        (mswMod as any).default?.worker &&
        typeof (mswMod as any).default.worker.start === "function"
      ) {
        await (mswMod as any).default.worker.start({ onUnhandledRequest: "bypass" });
      } else {
        // eslint-disable-next-line no-console
        console.warn("MSW: couldn't find a start entry on ./mocks/browser", Object.keys(mswMod));
      }
      // eslint-disable-next-line no-console
      console.info(`MSW bootstrap complete (${import.meta.env.DEV ? "dev" : "env flag"})`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("MSW failed to start:", err instanceof Error ? err.message : String(err));
    }
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <BrowserRouter basename="/admin">
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <Refine
              dataProvider={dataProvider}
              authProvider={authProvider}
              accessControlProvider={accessControlProvider}
              notificationProvider={notificationProvider}
              routerProvider={routerProvider}
              resources={resources.map(({ name, list, create, edit, show, meta }) => ({
                name,
                list,
                create,
                edit,
                show,
                meta,
              }))}
              options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: false,
              }}
            >
              <Routes>
                <Route
                  element={
                    <Authenticated key="authenticated-routes" fallback={<LoginPage />}>
                      <LayoutWrapper />
                    </Authenticated>
                  }
                >
                  <Route index element={<NavigateToResource resource={resources[0].name} />} />
                  {resources.map((resource) => (
                    <Route key={resource.name} path={resource.name}>
                      <Route
                        index
                        element={
                          resource.name === "dashboard" ? (
                            <DashboardPage />
                          ) : resource.name === "students" ? (
                            <StudentsPage />
                          ) : resource.name === "teachers" ? (
                            <TeachersPage />
                          ) : resource.name === "users" ? (
                            <UsersPage />
                          ) : resource.name === "homerooms" ? (
                            <HomeroomAssignmentsPage />
                          ) : resource.name === "grade-configs" ? (
                            <GradeConfigPage />
                          ) : resource.name === "announcements" ? (
                            <AnnouncementsPage />
                          ) : resource.name === "behavior-notes" ? (
                            <BehaviorNotesPage />
                          ) : resource.name === "calendar" ? (
                            <CalendarPage />
                          ) : resource.name === "attendance" ? (
                            <AttendanceAnalyticsPage />
                          ) : resource.name === "schedules" ? (
                            <SchedulesPage />
                          ) : resource.name === "grades" ? (
                            <GradesPage />
                          ) : resource.name === "classes" ? (
                            <ClassesPage />
                          ) : (
                            <ResourceList />
                          )
                        }
                      />
                      {resourceRouteConfig[resource.name]?.create ? (
                        <Route path="create" element={resourceRouteConfig[resource.name]!.create} />
                      ) : null}
                      {resourceRouteConfig[resource.name]?.edit ? (
                        <Route path="edit/:id" element={resourceRouteConfig[resource.name]!.edit} />
                      ) : null}
                      {resource.name === "classes" ? (
                        <Route path="show/:id" element={<ClassesShow />} />
                      ) : null}
                      {resource.name === "attendance" ? (
                        <>
                          <Route
                            path="daily"
                            element={
                              <ResourceActionGuard action="create" resourceName="attendance">
                                <AttendanceDailyPage />
                              </ResourceActionGuard>
                            }
                          />
                          <Route
                            path="lesson"
                            element={
                              <ResourceActionGuard action="create" resourceName="attendance">
                                <AttendanceLessonPage />
                              </ResourceActionGuard>
                            }
                          />
                        </>
                      ) : resource.name === "schedules" ? (
                        <>
                          <Route
                            path="generator"
                            element={
                              <ResourceActionGuard action="edit" resourceName="schedules">
                                <ScheduleGeneratorPage />
                              </ResourceActionGuard>
                            }
                          />

                          <Route
                            path="preferences"
                            element={
                              <ResourceActionGuard action="edit" resourceName="teacher-preferences">
                                <TeacherPreferencesPage />
                              </ResourceActionGuard>
                            }
                          />
                        </>
                      ) : null}
                    </Route>
                  ))}
                  <Route
                    path="setup"
                    element={
                      <ResourceActionGuard action="create" resourceName="terms">
                        <SetupWizard />
                      </ResourceActionGuard>
                    }
                  />
                  <Route
                    path="setup/import-status"
                    element={
                      <ResourceActionGuard action="list" resourceName="students">
                        <ImportStatusPage />
                      </ResourceActionGuard>
                    }
                  />
                  <Route
                    path="configuration"
                    element={
                      <ResourceActionGuard action="edit" resourceName="settings">
                        <ConfigurationPage />
                      </ResourceActionGuard>
                    }
                  />
                </Route>
                <Route path="/login" element={<LoginPage />} />
                <Route path="*" element={<ErrorComponent />} />
              </Routes>

              <DocumentTitleHandler />
              <UnsavedChangesNotifier />
              <RouteDebugger />
            </Refine>
          </ThemeProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}

void bootstrap();
