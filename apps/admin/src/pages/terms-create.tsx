import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { Card, Form, Input, Select, Switch } from "antd";
import { ResourceActionGuard } from "../components/resource-action-guard";
import { DEFAULT_TERM_TYPE, TERM_TYPES, buildTermPayload } from "../utils/terms";

export const TermsCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();

  return (
    <ResourceActionGuard action="create">
      <Create saveButtonProps={saveButtonProps} title="Buat Semester">
        <Card>
          <Form
            {...formProps}
            layout="vertical"
            initialValues={{ isActive: false, type: DEFAULT_TERM_TYPE }}
            // The API needs RFC3339 dates, `is_active`, and a required
            // type/academic year the form does not collect verbatim.
            onFinish={(values) => formProps.onFinish?.(buildTermPayload(values))}
          >
            <Form.Item label="Nama" name="name" rules={[{ required: true }]}>
              <Input placeholder="Misal: Semester Genap 2025" />
            </Form.Item>
            <Form.Item label="Jenis" name="type" rules={[{ required: true }]}>
              <Select options={TERM_TYPES.map((type) => ({ label: type, value: type }))} />
            </Form.Item>
            <Form.Item
              label="Tahun Ajaran"
              name="academicYear"
              tooltip="Kosongkan untuk mengikuti tanggal mulai, misal 2025/2026."
            >
              <Input placeholder="2025/2026" />
            </Form.Item>
            <Form.Item label="Tanggal Mulai" name="startDate" rules={[{ required: true }]}>
              <Input type="date" />
            </Form.Item>
            <Form.Item label="Tanggal Selesai" name="endDate" rules={[{ required: true }]}>
              <Input type="date" />
            </Form.Item>
            <Form.Item label="Aktif" name="isActive" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        </Card>
      </Create>
    </ResourceActionGuard>
  );
};
