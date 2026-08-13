import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Card, Form, Input } from "antd";
import { ResourceActionGuard } from "../components/resource-action-guard";

/** Weight and KKM are configured per class/subject in the grade-config page. */
export const GradeComponentsEdit: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();

  return (
    <ResourceActionGuard action="edit">
      <Edit saveButtonProps={saveButtonProps} title="Ubah Komponen Nilai">
        <Card>
          <Form {...formProps} layout="vertical">
            <Form.Item label="Kode" name="code">
              <Input placeholder="Kode komponen (opsional saat mengubah)" maxLength={40} />
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
      </Edit>
    </ResourceActionGuard>
  );
};
