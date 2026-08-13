import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { Card, Form, Input } from "antd";
import { ResourceActionGuard } from "../components/resource-action-guard";

/** Grade components are reusable labels; class/subject weighting belongs to grade config. */
export const GradeComponentsCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();

  return (
    <ResourceActionGuard action="create">
      <Create saveButtonProps={saveButtonProps} title="Buat Komponen Nilai">
        <Card>
          <Form {...formProps} layout="vertical">
            <Form.Item
              label="Kode"
              name="code"
              rules={[{ required: true, message: "Kode wajib diisi" }]}
            >
              <Input placeholder="Misal: UTS" maxLength={40} />
            </Form.Item>
            <Form.Item
              label="Nama Komponen"
              name="name"
              rules={[{ required: true, message: "Nama wajib diisi" }]}
            >
              <Input placeholder="Misal: Ujian Tengah Semester" maxLength={120} />
            </Form.Item>
            <Form.Item label="Deskripsi" name="description">
              <Input.TextArea
                placeholder="Catatan tambahan (opsional)"
                autoSize={{ minRows: 3, maxRows: 6 }}
                maxLength={500}
                showCount
              />
            </Form.Item>
          </Form>
        </Card>
      </Create>
    </ResourceActionGuard>
  );
};
