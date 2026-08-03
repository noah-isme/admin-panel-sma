import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Card, Form, Input, Select, Switch } from "antd";
import dayjs from "dayjs";
import { ResourceActionGuard } from "../components/resource-action-guard";
import { TERM_TYPES, buildTermPayload } from "../utils/terms";

/** Renders an API instant as the `YYYY-MM-DD` an `<input type="date">` needs. */
const toDateInputValue = (value: unknown) => {
  if (!value) return { value: undefined };
  const parsed = dayjs(value as string);
  return { value: parsed.isValid() ? parsed.format("YYYY-MM-DD") : undefined };
};

export const TermsEdit: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();

  return (
    <ResourceActionGuard action="edit">
      <Edit saveButtonProps={saveButtonProps} title="Ubah Semester">
        <Card>
          <Form
            {...formProps}
            layout="vertical"
            // PUT /terms/{id} requires name, type, academicYear, and both dates
            // as RFC3339, so normalize before submitting.
            onFinish={(values) => formProps.onFinish?.(buildTermPayload(values))}
          >
            <Form.Item label="Nama" name="name" rules={[{ required: true }]}>
              <Input placeholder="Misal: Semester Genap 2025" />
            </Form.Item>
            <Form.Item label="Jenis" name="type" rules={[{ required: true }]}>
              <Select options={TERM_TYPES.map((type) => ({ label: type, value: type }))} />
            </Form.Item>
            <Form.Item label="Tahun Ajaran" name="academicYear" rules={[{ required: true }]}>
              <Input placeholder="2025/2026" />
            </Form.Item>
            <Form.Item
              label="Tanggal Mulai"
              name="startDate"
              rules={[{ required: true }]}
              getValueProps={toDateInputValue}
            >
              <Input type="date" />
            </Form.Item>
            <Form.Item
              label="Tanggal Selesai"
              name="endDate"
              rules={[{ required: true }]}
              getValueProps={toDateInputValue}
            >
              <Input type="date" />
            </Form.Item>
            <Form.Item label="Aktif" name="isActive" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        </Card>
      </Edit>
    </ResourceActionGuard>
  );
};
