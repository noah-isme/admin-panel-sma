import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  InputNumber,
  Radio,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { RadioChangeEvent } from "antd";
import { useCreate, useDelete, useList, useUpdate, type BaseRecord } from "@refinedev/core";
import { useAppNotification } from "../hooks/use-app-notification";
import { ResourceActionGuard } from "../components/resource-action-guard";
import { usePersistentSelection } from "../hooks/use-persistent-selection";

const SCHEME_OPTIONS = [
  { value: "WEIGHTED", label: "Weighted" },
  { value: "AVERAGE", label: "Average" },
] as const;

const GRADE_STATUS_TAGS: Record<string, { color: string; label: string }> = {
  draft: { color: "gold", label: "Draft" },
  finalized: { color: "cyan", label: "Finalized" },
  verified: { color: "green", label: "Verified" },
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const calculateWeightedAggregate = (
  components: Array<{ weight?: number | string }>,
  scores: Array<number | undefined>
) => {
  if (components.length === 0 || components.length !== scores.length) {
    return undefined;
  }

  if (scores.some((score) => typeof score !== "number")) {
    return undefined;
  }

  const total = components.reduce((acc, component, index) => {
    const weight = toNumber(component.weight) ?? 0;
    const score = scores[index] as number;
    return acc + (score * weight) / 100;
  }, 0);

  return Number.isFinite(total) ? Number(total.toFixed(2)) : undefined;
};

export const GradeConfigPage: React.FC = () => {
  const { open: notify } = useAppNotification();
  const { value: storedMapping, setValue: setStoredMapping } = usePersistentSelection<
    string | undefined
  >("grade-config:mapping");
  const [classSubjectId, setClassSubjectId] = useState<string | undefined>(storedMapping);

  const classSubjectsQuery = useList({
    resource: "class-subjects",
    pagination: { current: 1, pageSize: 200 },
  });
  const classesQuery = useList({ resource: "classes", pagination: { current: 1, pageSize: 200 } });
  const subjectsQuery = useList({
    resource: "subjects",
    pagination: { current: 1, pageSize: 200 },
  });
  const gradeComponentsQuery = useList({
    resource: "grade-components",
    pagination: { current: 1, pageSize: 200 },
  });
  const gradeConfigsQuery = useList({
    resource: "grade-configs",
    pagination: { current: 1, pageSize: 200 },
  });
  const gradeScoresQuery = useList({
    resource: "grades",
    pagination: { current: 1, pageSize: 200 },
  });
  const enrollmentsQuery = useList({
    resource: "enrollments",
    pagination: { current: 1, pageSize: 500 },
  });
  const studentsQuery = useList({
    resource: "students",
    pagination: { current: 1, pageSize: 500 },
  });

  const [saving, setSaving] = useState(false);
  const { mutateAsync: createConfig } = useCreate();
  const { mutateAsync: updateConfig } = useUpdate();
  const { mutateAsync: deleteConfig } = useDelete();

  useEffect(() => {
    if (classSubjectId !== storedMapping) {
      setStoredMapping(classSubjectId);
    }
  }, [classSubjectId, setStoredMapping, storedMapping]);

  useEffect(() => {
    if (!classSubjectId && storedMapping) {
      setClassSubjectId(storedMapping);
    }
  }, [classSubjectId, storedMapping]);

  const classSubjects = (classSubjectsQuery.data?.data as BaseRecord[]) ?? [];
  const classes = (classesQuery.data?.data as BaseRecord[]) ?? [];
  const subjects = (subjectsQuery.data?.data as BaseRecord[]) ?? [];
  const gradeComponents = (gradeComponentsQuery.data?.data as BaseRecord[]) ?? [];
  const gradeConfigs = (gradeConfigsQuery.data?.data as BaseRecord[]) ?? [];
  const gradeScores = (gradeScoresQuery.data?.data as BaseRecord[]) ?? [];
  const enrollments = (enrollmentsQuery.data?.data as BaseRecord[]) ?? [];
  const students = (studentsQuery.data?.data as BaseRecord[]) ?? [];

  const classSubjectOptions = useMemo(
    () =>
      classSubjects.map((mapping) => {
        const classroom = classes.find((cls) => cls.id === mapping.classroomId);
        const subject = subjects.find((sub) => sub.id === mapping.subjectId);
        return {
          value: mapping.id,
          label: `${subject?.name ?? "Mapel"} · ${classroom?.name ?? "Kelas"}`,
        };
      }),
    [classSubjects, classes, subjects]
  );

  const selectedMapping = useMemo(
    () => classSubjects.find((mapping) => String(mapping.id) === classSubjectId),
    [classSubjectId, classSubjects]
  );

  const relatedComponents = useMemo(
    () => gradeComponents.filter((component) => component.classSubjectId === classSubjectId),
    [gradeComponents, classSubjectId]
  );

  const classEnrollments = useMemo(() => {
    if (!selectedMapping) return [];
    return enrollments.filter((enrollment) => enrollment.classId === selectedMapping.classroomId);
  }, [enrollments, selectedMapping]);

  const studentDictionary = useMemo(() => {
    const map = new Map<string, BaseRecord>();
    students.forEach((student) => map.set(String(student.id), student));
    return map;
  }, [students]);

  const existingConfig = useMemo(
    () => gradeConfigs.find((config) => config.classSubjectId === classSubjectId),
    [gradeConfigs, classSubjectId]
  );

  const [scheme, setScheme] = useState<string | undefined>(existingConfig?.scheme ?? "WEIGHTED");
  const [kkm, setKkm] = useState<number | undefined>(existingConfig?.kkm ?? 70);
  const [status, setStatus] = useState<string>(existingConfig?.status ?? "draft");

  useEffect(() => {
    if (existingConfig) {
      setScheme(existingConfig.scheme ?? "WEIGHTED");
      setKkm(existingConfig.kkm ?? 70);
      setStatus(existingConfig.status ?? "draft");
    } else {
      setScheme("WEIGHTED");
      setKkm(70);
      setStatus("draft");
    }
  }, [existingConfig]);

  const totalWeight = useMemo(() => {
    return relatedComponents.reduce((sum, component) => sum + (toNumber(component.weight) ?? 0), 0);
  }, [relatedComponents]);

  const weightedWarning = scheme === "WEIGHTED" && totalWeight !== 100;

  const perStudentScores = useMemo(() => {
    if (!classSubjectId) return [];
    const scoresByStudentComponent = new Map<string, Map<string, number[]>>();
    gradeScores
      .filter((score) => String(score.subjectId) === selectedMapping?.subjectId)
      .forEach((score) => {
        const enrollmentId = String(score.enrollmentId);
        const componentId = String(score.componentId);
        const value = toNumber(score.score);
        if (typeof value !== "number") return;
        const componentMap =
          scoresByStudentComponent.get(enrollmentId) ?? new Map<string, number[]>();
        const list = componentMap.get(componentId) ?? [];
        list.push(value);
        componentMap.set(componentId, list);
        scoresByStudentComponent.set(enrollmentId, componentMap);
      });

    return classEnrollments.map((enrollment) => {
      const student = studentDictionary.get(String(enrollment.studentId));
      const componentScores = relatedComponents.map((component) => {
        const componentMap = scoresByStudentComponent.get(String(enrollment.id));
        const list = componentMap?.get(String(component.id)) ?? [];
        if (list.length === 0) return undefined;
        const average = list.reduce((acc, val) => acc + val, 0) / list.length;
        return Number(average.toFixed(2));
      });

      let finalScore: number | undefined;
      if (componentScores.every((value) => typeof value === "number")) {
        if (scheme === "WEIGHTED") {
          finalScore = calculateWeightedAggregate(relatedComponents, componentScores);
        } else {
          const sum = componentScores.reduce((acc, value) => acc + (value ?? 0), 0);
          finalScore = Number((sum / componentScores.length).toFixed(2));
        }
      }

      const meetsKkm =
        typeof finalScore === "number" && typeof kkm === "number" ? finalScore >= kkm : undefined;

      return {
        key: String(enrollment.id),
        studentName: student?.fullName ?? `Siswa ${enrollment.studentId}`,
        componentScores,
        finalScore,
        meetsKkm,
      };
    });
  }, [
    classEnrollments,
    gradeScores,
    kkm,
    relatedComponents,
    scheme,
    selectedMapping?.subjectId,
    studentDictionary,
  ]);

  const perStudentColumns = useMemo(() => {
    const componentColumns = relatedComponents.map((component, index) => ({
      title: component.name ?? `Komponen ${index + 1}`,
      dataIndex: ["componentScores", index],
      render: (_: unknown, row: (typeof perStudentScores)[number]) => {
        const score = row.componentScores[index];
        return typeof score === "number" ? (
          score.toFixed(2)
        ) : (
          <Typography.Text type="secondary">-</Typography.Text>
        );
      },
    }));

    return [
      {
        title: "Siswa",
        dataIndex: "studentName",
        render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
      },
      ...componentColumns,
      {
        title: "Nilai Akhir",
        dataIndex: "finalScore",
        render: (value: number | undefined) =>
          typeof value === "number" ? (
            value.toFixed(2)
          ) : (
            <Typography.Text type="secondary">-</Typography.Text>
          ),
      },
      {
        title: "Status",
        dataIndex: "meetsKkm",
        render: (value: boolean | undefined) =>
          typeof value === "boolean" ? (
            <Tag color={value ? "green" : "red"}>{value ? "Tuntas" : "Remedial"}</Tag>
          ) : (
            <Typography.Text type="secondary">-</Typography.Text>
          ),
      },
    ];
  }, [perStudentScores, relatedComponents]);

  const previewFinalScore = useMemo(() => {
    if (!classSubjectId) return undefined;
    const scoresByComponent = new Map<string, number[]>();
    gradeScores
      .filter(
        (score) =>
          score.componentId && relatedComponents.some((comp) => comp.id === score.componentId)
      )
      .forEach((score) => {
        const componentId = String(score.componentId);
        const existing = scoresByComponent.get(componentId) ?? [];
        const value = toNumber(score.score);
        if (typeof value === "number") {
          existing.push(value);
          scoresByComponent.set(componentId, existing);
        }
      });

    const componentAverages = relatedComponents.map((component) => {
      const scores = scoresByComponent.get(String(component.id)) ?? [];
      if (scores.length === 0) return 0;
      const sum = scores.reduce((acc, val) => acc + val, 0);
      return sum / scores.length;
    });

    if (componentAverages.length === 0) return undefined;

    if (scheme === "WEIGHTED") {
      return calculateWeightedAggregate(relatedComponents, componentAverages);
    }

    const average = componentAverages.reduce((acc, val) => acc + val, 0) / componentAverages.length;
    return Number.isFinite(average) ? Number(average.toFixed(2)) : undefined;
  }, [classSubjectId, gradeScores, relatedComponents, scheme]);

  const handleSave = async () => {
    if (!classSubjectId || !scheme || typeof kkm !== "number") {
      notify?.({
        type: "warning",
        message: "Lengkapi data",
        description: "Pilih kelas/mapel, skema, dan tentukan KKM.",
      });
      return;
    }

    if (scheme === "WEIGHTED" && relatedComponents.length > 0 && totalWeight !== 100) {
      notify?.({
        type: "warning",
        message: "Bobot belum 100%",
        description:
          "Pastikan total bobot seluruh komponen mencapai 100% sebelum menyimpan skema weighted.",
      });
      return;
    }

    try {
      setSaving(true);
      if (existingConfig) {
        await updateConfig({
          resource: "grade-configs",
          id: existingConfig.id,
          values: {
            scheme,
            kkm,
            status,
          },
        });
      } else {
        await createConfig({
          resource: "grade-configs",
          values: {
            classSubjectId,
            scheme,
            kkm,
            status,
          },
        });
      }
      notify?.({
        type: "success",
        message: "Konfigurasi tersimpan",
      });
      await gradeConfigsQuery.refetch?.();
    } catch (error) {
      notify?.({
        type: "error",
        message: "Gagal menyimpan konfigurasi",
        description: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!existingConfig) return;
    try {
      setSaving(true);
      await deleteConfig({ resource: "grade-configs", id: existingConfig.id });
      notify?.({ type: "success", message: "Konfigurasi direset" });
      setScheme("WEIGHTED");
      setKkm(70);
      setStatus("draft");
      await gradeConfigsQuery.refetch?.();
    } catch (error) {
      notify?.({ type: "error", message: "Gagal mereset", description: String(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async (nextStatus: string) => {
    if (!existingConfig) {
      notify?.({
        type: "warning",
        message: "Simpan konfigurasi terlebih dahulu",
      });
      return;
    }

    try {
      setSaving(true);
      await updateConfig({
        resource: "grade-configs",
        id: existingConfig.id,
        values: {
          status: nextStatus,
        },
      });
      setStatus(nextStatus);
      notify?.({ type: "success", message: `Status diperbarui menjadi ${nextStatus}` });
      await gradeConfigsQuery.refetch?.();
    } catch (error) {
      notify?.({
        type: "error",
        message: "Gagal memperbarui status",
        description: String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const componentColumns = [
    {
      title: "Komponen",
      dataIndex: "name",
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: "Bobot",
      dataIndex: "weight",
      render: (value: unknown) => `${toNumber(value) ?? 0}%`,
    },
    {
      title: "KKM",
      dataIndex: "kkm",
      render: (value: unknown) => toNumber(value) ?? "-",
    },
  ];

  return (
    <ResourceActionGuard action="create" resourceName="grade-configs">
      <div style={{ padding: 24 }}>
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>
            Konfigurasi Penilaian
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            Tetapkan skema penilaian, KKM, dan status finalisasi per kelas & mapel. Skema weighted
            membutuhkan total bobot komponen sebesar 100%.
          </Typography.Paragraph>
          <Card>
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Form layout="inline">
                <Form.Item label="Kelas & Mapel" required>
                  <Select
                    showSearch
                    placeholder="Pilih kelas & mapel"
                    value={classSubjectId}
                    onChange={setClassSubjectId}
                    options={classSubjectOptions}
                    filterOption={(input, option) =>
                      (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                    style={{ minWidth: 320 }}
                  />
                </Form.Item>
              </Form>
              {!classSubjectId ? (
                <Alert
                  type="info"
                  showIcon
                  message="Pilih kelas & mapel untuk melihat konfigurasi."
                />
              ) : classSubjectsQuery.isLoading || gradeComponentsQuery.isLoading ? (
                <Spin />
              ) : relatedComponents.length === 0 ? (
                <Alert
                  type="warning"
                  showIcon
                  message="Belum ada komponen nilai"
                  description="Tambahkan komponen nilai terlebih dahulu sebelum menyusun skema."
                />
              ) : (
                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                  <Card>
                    <Space direction="vertical" size={16} style={{ width: "100%" }}>
                      <Form layout="vertical">
                        <Form.Item label="Skema Penilaian">
                          <Radio.Group
                            onChange={(event: RadioChangeEvent) => setScheme(event.target.value)}
                            value={scheme}
                          >
                            {SCHEME_OPTIONS.map((option) => (
                              <Radio.Button key={option.value} value={option.value}>
                                {option.label}
                              </Radio.Button>
                            ))}
                          </Radio.Group>
                        </Form.Item>
                        <Form.Item label="KKM">
                          <InputNumber
                            min={0}
                            max={100}
                            value={kkm}
                            onChange={(value) => setKkm(toNumber(value) ?? 0)}
                            style={{ width: 120 }}
                          />
                        </Form.Item>
                        <Space>
                          <Button type="primary" onClick={handleSave} loading={saving}>
                            Simpan Konfigurasi
                          </Button>
                          {existingConfig ? (
                            <Button
                              onClick={() => handleFinalize("finalized")}
                              loading={saving}
                              disabled={weightedWarning}
                            >
                              Tandai Final
                            </Button>
                          ) : null}
                          {existingConfig && existingConfig.status === "finalized" ? (
                            <Button
                              type="primary"
                              ghost
                              onClick={() => handleFinalize("verified")}
                              loading={saving}
                            >
                              Verifikasi (Wali/KS)
                            </Button>
                          ) : null}
                          {existingConfig && existingConfig.status !== "draft" ? (
                            <Button onClick={() => handleFinalize("draft")} loading={saving}>
                              Kembalikan ke Draft
                            </Button>
                          ) : null}
                          {existingConfig ? (
                            <Button danger onClick={handleReset} loading={saving}>
                              Reset Konfigurasi
                            </Button>
                          ) : null}
                        </Space>
                      </Form>
                      {weightedWarning ? (
                        <Alert
                          type="warning"
                          showIcon
                          message="Total bobot belum 100%"
                          description={`Total bobot saat ini ${totalWeight}%. Sesuaikan bobot komponen agar total 100%.`}
                        />
                      ) : null}
                      <Table
                        size="small"
                        dataSource={relatedComponents}
                        columns={componentColumns}
                        rowKey={(record) => record.id as string}
                        pagination={false}
                      />
                      <Space>
                        <Statistic title="Total Bobot" value={`${totalWeight}%`} />
                        <Statistic title="KKM" value={kkm ?? "-"} />
                        <Statistic
                          title="Status"
                          valueRender={() => (
                            <Tag color={GRADE_STATUS_TAGS[status]?.color ?? "default"}>
                              {GRADE_STATUS_TAGS[status]?.label ?? status}
                            </Tag>
                          )}
                        />
                        <Statistic title="Preview Nilai Akhir" value={previewFinalScore ?? "-"} />
                      </Space>
                      <Card size="small" title="Rekap Nilai Siswa" style={{ marginTop: 16 }}>
                        {perStudentScores.length === 0 ? (
                          <Alert
                            type="info"
                            showIcon
                            message="Belum ada nilai yang tercatat"
                            description="Input nilai untuk setiap komponen agar perhitungan akhir tersedia."
                          />
                        ) : (
                          <Table
                            size="small"
                            dataSource={perStudentScores}
                            columns={perStudentColumns}
                            rowKey={(record) => record.key}
                            pagination={false}
                          />
                        )}
                      </Card>
                    </Space>
                  </Card>
                </Space>
              )}
            </Space>
          </Card>
        </Space>
      </div>
    </ResourceActionGuard>
  );
};
