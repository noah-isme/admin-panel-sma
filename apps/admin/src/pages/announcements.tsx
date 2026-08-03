import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  List,
  Radio,
  Segmented,
  Space,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useCreate, useDelete, useList, useUpdate } from "@refinedev/core";
import { useAppNotification } from "../hooks/use-app-notification";
import { ResourceActionGuard } from "../components/resource-action-guard";

const AUDIENCE_LABEL: Record<string, string> = {
  ALL: "Semua",
  TEACHERS: "Guru",
  STUDENTS: "Siswa",
};

const COLOR_BY_AUDIENCE: Record<string, string> = {
  ALL: "blue",
  TEACHERS: "purple",
  STUDENTS: "green",
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return dayjs(value).format("DD MMM YYYY HH:mm");
};

export const AnnouncementsPage: React.FC = () => {
  const [audienceFilter, setAudienceFilter] = useState<string | undefined>(undefined);
  const { open: notify } = useAppNotification();
  const { mutateAsync: createAnnouncement } = useCreate();
  const { mutateAsync: updateAnnouncement } = useUpdate();
  const { mutateAsync: deleteAnnouncement } = useDelete();

  const announcementsQuery = useList({
    resource: "announcements",
    pagination: { current: 1, pageSize: 200 },
  });

  const announcements = useMemo(() => {
    const data = (announcementsQuery.data?.data as Record<string, any>[]) ?? [];
    if (!audienceFilter || audienceFilter === "ALL") {
      return data;
    }
    return data.filter((item) => item.audience === audienceFilter);
  }, [announcementsQuery.data?.data, audienceFilter]);

  const handleSubmit = async (values: { title: string; body: string; audience: string }) => {
    try {
      await createAnnouncement({
        resource: "announcements",
        values: {
          ...values,
          publishAt: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
        },
      });
      notify?.({ type: "success", message: "Pengumuman dibuat" });
      await announcementsQuery.refetch?.();
    } catch (error) {
      notify?.({ type: "error", message: "Gagal membuat pengumuman", description: String(error) });
    }
  };

  const handleToggleAudience = async (announcement: Record<string, any>, audience: string) => {
    try {
      await updateAnnouncement({
        resource: "announcements",
        id: announcement.id,
        values: { audience },
      });
      notify?.({ type: "success", message: "Audience diperbarui" });
      await announcementsQuery.refetch?.();
    } catch (error) {
      notify?.({
        type: "error",
        message: "Gagal memperbarui audience",
        description: String(error),
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement({ resource: "announcements", id });
      notify?.({ type: "success", message: "Pengumuman dihapus" });
      await announcementsQuery.refetch?.();
    } catch (error) {
      notify?.({
        type: "error",
        message: "Gagal menghapus pengumuman",
        description: String(error),
      });
    }
  };

  return (
    <ResourceActionGuard action="list" resourceName="announcements">
      <div style={{ padding: 24 }}>
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>
            Pengumuman Sekolah
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
            Buat dan kelola pengumuman berdasarkan audiens (Semua, Guru, Siswa). Pengumuman yang
            diterbitkan akan tampil di dashboard masing-masing persona.
          </Typography.Paragraph>

          <Card title="Buat Pengumuman">
            <Form layout="vertical" onFinish={handleSubmit} requiredMark="optional">
              <Form.Item
                label="Judul"
                name="title"
                rules={[{ required: true, message: "Judul wajib diisi" }]}
              >
                <Input placeholder="Judul pengumuman" maxLength={120} />
              </Form.Item>
              <Form.Item
                label="Isi Pengumuman"
                name="body"
                rules={[{ required: true, message: "Isi pengumuman wajib diisi" }]}
              >
                <Input.TextArea
                  placeholder="Tuliskan isi pengumuman"
                  autoSize={{ minRows: 3, maxRows: 6 }}
                />
              </Form.Item>
              <Form.Item
                label="Audiens"
                name="audience"
                initialValue="ALL"
                rules={[{ required: true, message: "Pilih audiens" }]}
              >
                <Radio.Group>
                  <Radio.Button value="ALL">Semua</Radio.Button>
                  <Radio.Button value="TEACHERS">Guru</Radio.Button>
                  <Radio.Button value="STUDENTS">Siswa</Radio.Button>
                </Radio.Group>
              </Form.Item>
              <Button type="primary" htmlType="submit">
                Simpan Pengumuman
              </Button>
            </Form>
          </Card>

          <Card>
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Segmented
                value={audienceFilter ?? "ALL"}
                onChange={(value) =>
                  setAudienceFilter(value === "ALL" ? undefined : (value as string))
                }
                options={[
                  { label: "Semua", value: "ALL" },
                  { label: "Guru", value: "TEACHERS" },
                  { label: "Siswa", value: "STUDENTS" },
                ]}
              />
              {announcements.length === 0 ? (
                <Alert
                  type="info"
                  showIcon
                  message="Belum ada pengumuman"
                  description="Tambahkan pengumuman baru melalui form di atas."
                />
              ) : (
                <List
                  itemLayout="vertical"
                  dataSource={announcements}
                  renderItem={(item) => (
                    <List.Item
                      key={item.id}
                      actions={[
                        <Radio.Group
                          key="audience"
                          value={item.audience}
                          onChange={(event) => handleToggleAudience(item, event.target.value)}
                        >
                          <Radio.Button value="ALL">Semua</Radio.Button>
                          <Radio.Button value="TEACHERS">Guru</Radio.Button>
                          <Radio.Button value="STUDENTS">Siswa</Radio.Button>
                        </Radio.Group>,
                        <Button key="delete" danger onClick={() => handleDelete(item.id)}>
                          Hapus
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space>
                            <Typography.Text strong>{item.title}</Typography.Text>
                            <Tag color={COLOR_BY_AUDIENCE[item.audience] ?? "default"}>
                              {AUDIENCE_LABEL[item.audience] ?? item.audience}
                            </Tag>
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size={2}>
                            <Typography.Text type="secondary">
                              Publish: {formatDate(item.publishAt)}
                            </Typography.Text>
                            <Typography.Text type="secondary">
                              Tayang: {formatDate(item.publishedAt)}
                            </Typography.Text>
                          </Space>
                        }
                      />
                      <Typography.Paragraph>{item.body}</Typography.Paragraph>
                    </List.Item>
                  )}
                />
              )}
            </Space>
          </Card>
        </Space>
      </div>
    </ResourceActionGuard>
  );
};
