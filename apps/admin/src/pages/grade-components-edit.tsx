import React, { useMemo } from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Alert, Card, Form, Input, InputNumber, Select, Space, Typography } from "antd";
import { useList } from "@refinedev/core";
import { useAppNotification } from "../hooks/use-app-notification";
import { ResourceActionGuard } from "../components/resource-action-guard";

export const GradeComponentsEdit: React.FC = () => {
  const { formProps, saveButtonProps, form } = useForm();
  const { open: notify } = useAppNotification();

  const classSubjectsQuery = useList({
    resource: "class-subjects",
    pagination: { current: 1, pageSize: 200 },
  });
  const classesQuery = useList({ resource: "classes", pagination: { current: 1, pageSize: 200 } });
  const subjectsQuery = useList({
    resource: "subjects",
    pagination: { current: 1, pageSize: 200 },
  });

  const classSubjects = (classSubjectsQuery.data?.data as Record<string, any>[]) ?? [];
  const classes = (classesQuery.data?.data as Record<string, any>[]) ?? [];
  const subjects = (subjectsQuery.data?.data as Record<string, any>[]) ?? [];

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

  const weight = Form.useWatch("weight", form);
  const kkm = Form.useWatch("kkm", form);

  const validationTips: string[] = [];
  if (typeof weight === "number" && weight > 100) {
    validationTips.push(
      "Bobot komponen biasanya ≤ 100. Pastikan total bobot seluruh komponen 100%."
    );
  }
  if (typeof weight === "number" && weight < 0) {
    validationTips.push("Bobot komponen tidak boleh bernilai negatif.");
  }
  if (typeof kkm === "number" && (kkm < 0 || kkm > 100)) {
    validationTips.push("KKM harus berada pada rentang 0-100.");
  }

  const handleFinishFailed = () => {
    notify?.({
      type: "warning",
      message: "Periksa kembali form",
      description: "Pastikan semua kolom wajib terisi dan nilai bobot/KKM valid.",
    });
  };

  return (
    <ResourceActionGuard action="edit">
      <Edit saveButtonProps={saveButtonProps} title="Ubah Komponen Nilai">
        <Card>
          <Form {...formProps} layout="vertical">
            <Form.Item label="Nama Komponen" name="name" rules={[{ required: true }]}>
              <Input placeholder="Misal: UTS" maxLength={120} />
            </Form.Item>
            <Form.Item
              label="Mapping Kelas & Mapel"
              name="classSubjectId"
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                placeholder="Pilih kelas & mapel"
                options={classSubjectOptions}
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
            <Form.Item
              label="Bobot (%)"
              name="weight"
              rules={[{ required: true, type: "number", min: 0 }]}
              getValueProps={(value: unknown) => {
                if (typeof value === "number") return { value };
                const parsed = Number(value);
                return { value: Number.isNaN(parsed) ? undefined : parsed };
              }}
            >
              <InputNumber
                min={0}
                max={100}
                style={{ width: "100%" }}
                placeholder="Masukkan bobot komponen"
              />
            </Form.Item>
            <Form.Item
              label="KKM"
              name="kkm"
              rules={[{ required: true, type: "number", min: 0, max: 100 }]}
              getValueProps={(value: unknown) => {
                if (typeof value === "number") return { value };
                const parsed = Number(value);
                return { value: Number.isNaN(parsed) ? undefined : parsed };
              }}
            >
              <InputNumber min={0} max={100} style={{ width: "100%" }} placeholder="Masukkan KKM" />
            </Form.Item>
            <Form.Item label="Deskripsi" name="description">
              <Input.TextArea
                placeholder="Catatan tambahan (opsional)"
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            </Form.Item>
            {validationTips.length > 0 ? (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="Periksa kembali data"
                description={
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {validationTips.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                }
              />
            ) : null}
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Typography.Text type="secondary">
                Bobot digunakan untuk skema penilaian weighted. Pastikan total bobot semua komponen
                mencapai 100%.
              </Typography.Text>
              <Typography.Text type="secondary">
                KKM menentukan batas ketuntasan minimal. Nilai akhir di bawah KKM akan ditandai
                untuk remedial.
              </Typography.Text>
            </Space>
          </Form>
        </Card>
      </Edit>
    </ResourceActionGuard>
  );
};
