import { useList } from "../hooks/use-refine-list";
import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  List,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useCreate, useUpdate } from "@refinedev/core";
import { useAppNotification } from "../hooks/use-app-notification";
import type { BaseRecord } from "@refinedev/core";

const DAY_OPTIONS = [
  { label: "Senin", value: 1 },
  { label: "Selasa", value: 2 },
  { label: "Rabu", value: 3 },
  { label: "Kamis", value: 4 },
  { label: "Jumat", value: 5 },
  { label: "Sabtu", value: 6 },
];

const SLOT_OPTIONS = Array.from({ length: 8 }, (_, index) => ({
  label: `Jam ${index + 1}`,
  value: index + 1,
}));

const AVAILABILITY_OPTIONS = [
  { label: "Fleksibel", value: "HIGH" },
  { label: "Terbatas", value: "MEDIUM" },
  { label: "Sangat terbatas", value: "LOW" },
];

const availabilityColor = (level?: string) => {
  switch (level) {
    case "LOW":
      return "red";
    case "MEDIUM":
      return "gold";
    default:
      return "green";
  }
};

const toSummary = (days: number[], slots: number[]) => {
  const dayNames = days
    .sort()
    .map((value) => DAY_OPTIONS.find((day) => day.value === value)?.label ?? `Hari ${value}`)
    .join(", ");
  const slotNames = slots
    .sort()
    .map((value) => `Jam ${value}`)
    .join(", ");
  return `${dayNames || "Semua hari"} · ${slotNames || "Semua jam"}`;
};

export const TeacherPreferencesPage: React.FC = () => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState<string>("");
  const [form] = Form.useForm();
  const { open: notify } = useAppNotification();

  const migratedTeachersQuery = useList<{ id: string; fullName: string; email?: string }>({
    resource: "teachers",
    pagination: { currentPage: 1, pageSize: 200 },
  });

  const teachersQuery = {
    ...migratedTeachersQuery.result,
    ...migratedTeachersQuery.query,
    ...migratedTeachersQuery,
  };

  const migratedPreferencesQuery = useList({
    resource: "teacher-preferences",
    pagination: { currentPage: 1, pageSize: 200 },
  });

  const preferencesQuery = {
    ...migratedPreferencesQuery.result,
    ...migratedPreferencesQuery.query,
    ...migratedPreferencesQuery,
  };

  const createPreference = useCreate();
  const updatePreference = useUpdate();

  const teachers = useMemo(() => teachersQuery.data?.data ?? [], [teachersQuery.data?.data]);
  const preferences = useMemo(
    () => preferencesQuery.data?.data ?? [],
    [preferencesQuery.data?.data]
  );

  useEffect(() => {
    if (!selectedTeacherId && teachers.length > 0) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [selectedTeacherId, teachers]);

  const preferenceMap = useMemo(() => {
    const map = new Map<string, BaseRecord>();
    preferences.forEach((pref) => {
      map.set(String(pref.teacherId), pref as BaseRecord);
    });
    return map;
  }, [preferences]);

  useEffect(() => {
    if (!selectedTeacherId) {
      form.resetFields();
      return;
    }
    const current = preferenceMap.get(selectedTeacherId);
    if (current) {
      form.setFieldsValue({
        preferredDays: current.preferredDays ?? [],
        blockedDays: current.blockedDays ?? [],
        preferredSlots: current.preferredSlots ?? [],
        maxDailySessions: current.maxDailySessions ?? 3,
        availabilityLevel: current.availabilityLevel ?? "MEDIUM",
        notes: current.notes ?? "",
      });
    } else {
      form.setFieldsValue({
        preferredDays: [1, 2, 3, 4, 5],
        blockedDays: [],
        preferredSlots: [1, 2, 3, 4],
        maxDailySessions: 3,
        availabilityLevel: "HIGH",
        notes: "",
      });
    }
  }, [form, preferenceMap, selectedTeacherId]);

  const filteredTeachers = useMemo(() => {
    const term = searchValue.trim().toLowerCase();
    if (!term) {
      return teachers;
    }
    return teachers.filter(
      (teacher) =>
        teacher.fullName.toLowerCase().includes(term) || teacher.email?.toLowerCase().includes(term)
    );
  }, [searchValue, teachers]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!selectedTeacherId) {
        notify({ type: "warning", message: "Pilih guru terlebih dahulu" });
        return;
      }
      const existing = preferenceMap.get(selectedTeacherId);
      const payload = {
        teacherId: selectedTeacherId,
        preferredDays: values.preferredDays ?? [],
        blockedDays: values.blockedDays ?? [],
        preferredSlots: values.preferredSlots ?? [],
        maxDailySessions: Number(values.maxDailySessions ?? 3),
        availabilityLevel: values.availabilityLevel ?? "MEDIUM",
        notes: values.notes ?? "",
      };
      if (existing) {
        await updatePreference.mutateAsync({
          resource: "teacher-preferences",
          id: existing.id,
          values: payload,
        });
      } else {
        await createPreference.mutateAsync({
          resource: "teacher-preferences",
          values: payload,
        });
      }
      await preferencesQuery.refetch?.();
      notify({
        type: "success",
        message: "Preferensi tersimpan",
        description: toSummary(payload.preferredDays, payload.preferredSlots),
      });
    } catch (error) {
      if (error instanceof Error) {
        notify({ type: "error", message: error.message });
      }
    }
  };

  const selectedTeacher = selectedTeacherId
    ? teachers.find((teacher) => teacher.id === selectedTeacherId)
    : undefined;
  const currentPreference = selectedTeacherId ? preferenceMap.get(selectedTeacherId) : undefined;

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Space direction="vertical" size={4} style={{ width: "100%" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Preferensi Mengajar Guru
        </Typography.Title>
        <Typography.Text type="secondary">
          Kelola preferensi hari, jam, dan catatan khusus untuk membantu generator jadwal otomatis.
        </Typography.Text>
      </Space>

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} md={9}>
          <Card
            title="Daftar Guru"
            extra={
              <Input.Search
                placeholder="Cari guru..."
                allowClear
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                style={{ width: 220 }}
              />
            }
            bodyStyle={{ padding: 16, display: "flex", flexDirection: "column", height: "100%" }}
          >
            <Spin spinning={teachersQuery.isLoading}>
              <div style={{ flex: 1, overflowY: "auto", paddingRight: 8 }}>
                <List
                  dataSource={filteredTeachers}
                  renderItem={(teacher) => {
                    const preference = preferenceMap.get(teacher.id);
                    const summary = preference
                      ? toSummary(preference.preferredDays ?? [], preference.preferredSlots ?? [])
                      : "Belum ada preferensi";
                    return (
                      <List.Item
                        key={teacher.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedTeacherId(teacher.id)}
                      >
                        <List.Item.Meta
                          title={
                            <Space>
                              <Typography.Text strong>{teacher.fullName}</Typography.Text>
                              <Tag color={availabilityColor(preference?.availabilityLevel)}>
                                {preference?.availabilityLevel ?? "HIGH"}
                              </Tag>
                            </Space>
                          }
                          description={
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              {summary}
                            </Typography.Text>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              </div>
            </Spin>
          </Card>
        </Col>

        <Col xs={24} md={15}>
          <Card
            title={selectedTeacher ? selectedTeacher.fullName : "Pilih guru"}
            bodyStyle={{ padding: 24, height: "100%" }}
          >
            {selectedTeacher ? (
              <Form layout="vertical" form={form} onFinish={handleSave}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Hari Preferensi"
                      name="preferredDays"
                      rules={[{ required: true, message: "Pilih minimal satu hari" }]}
                    >
                      <Select mode="multiple" options={DAY_OPTIONS} placeholder="Pilih hari" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Hari tidak tersedia" name="blockedDays">
                      <Select
                        mode="multiple"
                        options={DAY_OPTIONS}
                        placeholder="Pilih hari larangan"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Jam preferensi"
                      name="preferredSlots"
                      rules={[{ required: true, message: "Pilih minimal satu jam" }]}
                    >
                      <Select mode="multiple" options={SLOT_OPTIONS} placeholder="Pilih jam" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Maksimal sesi per hari"
                      name="maxDailySessions"
                      rules={[{ required: true, message: "Masukkan batas harian" }]}
                    >
                      <Input type="number" min={1} max={6} suffix="slot" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Form.Item label="Tingkat ketersediaan" name="availabilityLevel">
                      <Select options={AVAILABILITY_OPTIONS} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Catatan tambahan" name="notes">
                      <Input.TextArea
                        rows={3}
                        placeholder="Misal: Mengajar di kampus lain setiap Jumat"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Space>
                  <Button type="primary" htmlType="submit">
                    Simpan Preferensi
                  </Button>
                  <Button onClick={() => form.resetFields()}>Reset</Button>
                  {currentPreference ? (
                    <Tag color={availabilityColor(currentPreference.availabilityLevel)}>
                      Terakhir diatur
                    </Tag>
                  ) : null}
                </Space>
              </Form>
            ) : (
              <Typography.Text>Pilih guru dari daftar untuk mengatur preferensi.</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default TeacherPreferencesPage;
