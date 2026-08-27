import { useList } from "../hooks/use-refine-list";
import React, { useMemo } from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Alert, Card, Form, Input, InputNumber, Select, Space, Tag, Typography } from "antd";
import { ResourceActionGuard } from "../components/resource-action-guard";

export const GradesEdit: React.FC = () => {
  const { formProps, saveButtonProps, form } = useForm();

  const migratedGradeComponentsQuery = useList({
    resource: "grade-components",
    pagination: { currentPage: 1, pageSize: 200 },
  });

  const gradeComponentsQuery = {
    ...migratedGradeComponentsQuery.result,
    ...migratedGradeComponentsQuery.query,
    ...migratedGradeComponentsQuery,
  };

  const migratedGradeConfigsQuery = useList({
    resource: "grade-configs",
    pagination: { currentPage: 1, pageSize: 200 },
  });

  const gradeConfigsQuery = {
    ...migratedGradeConfigsQuery.result,
    ...migratedGradeConfigsQuery.query,
    ...migratedGradeConfigsQuery,
  };

  const gradeComponents = (gradeComponentsQuery.data?.data as Record<string, any>[]) ?? [];
  const gradeConfigs = (gradeConfigsQuery.data?.data as Record<string, any>[]) ?? [];

  const componentId = Form.useWatch("componentId", form);

  const selectedComponent = useMemo(
    () => gradeComponents.find((component) => String(component.id) === String(componentId)),
    [componentId, gradeComponents]
  );

  const relatedConfig = useMemo(() => {
    if (!selectedComponent) return undefined;
    return gradeConfigs.find(
      (config) => config.classSubjectId === selectedComponent.classSubjectId
    );
  }, [gradeConfigs, selectedComponent]);

  const schemeTagColor = relatedConfig?.scheme === "AVERAGE" ? "blue" : "purple";

  return (
    <ResourceActionGuard action="edit">
      <Edit saveButtonProps={saveButtonProps} title="Ubah Nilai">
        <Card>
          <Form {...formProps} layout="vertical">
            <Form.Item label="ID Enrollment" name="enrollmentId" rules={[{ required: true }]}>
              <Input placeholder="Masukkan ID enrollment" />
            </Form.Item>
            <Form.Item label="ID Mata Pelajaran" name="subjectId" rules={[{ required: true }]}>
              <Input placeholder="Masukkan ID mata pelajaran" />
            </Form.Item>
            <Form.Item label="Komponen" name="componentId" rules={[{ required: true }]}>
              <Select
                showSearch
                placeholder="Pilih komponen"
                allowClear
                options={gradeComponents.map((component) => ({
                  value: component.id,
                  label: `${component.name} (${component.classSubjectId})`,
                }))}
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
            <Form.Item
              label="Nilai"
              name="score"
              rules={[{ required: true, type: "number", min: 0, max: 100 }]}
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
                placeholder="Masukkan nilai (0-100)"
              />
            </Form.Item>
          </Form>
          {selectedComponent ? (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Alert
                type="info"
                showIcon
                message="Ringkasan Komponen"
                description={
                  <Space direction="vertical" size={4} style={{ width: "100%" }}>
                    <Typography.Text>
                      <strong>Bobot:</strong> {selectedComponent.weight}%
                    </Typography.Text>
                    <Typography.Text>
                      <strong>KKM Komponen:</strong> {selectedComponent.kkm ?? "-"}
                    </Typography.Text>
                    {relatedConfig ? (
                      <Typography.Text>
                        <strong>Skema:</strong>{" "}
                        <Tag color={schemeTagColor}>{relatedConfig.scheme}</Tag> · KKM Final:{" "}
                        {relatedConfig.kkm}
                      </Typography.Text>
                    ) : (
                      <Typography.Text type="secondary">
                        Belum ada konfigurasi penilaian untuk mapel ini. Lengkapi melalui halaman
                        Konfigurasi Nilai.
                      </Typography.Text>
                    )}
                  </Space>
                }
              />
            </Space>
          ) : null}
        </Card>
      </Edit>
    </ResourceActionGuard>
  );
};
