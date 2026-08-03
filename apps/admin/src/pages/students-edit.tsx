import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Card, Form, Input, Select } from "antd";
import { ResourceActionGuard } from "../components/resource-action-guard";
import dayjs from "dayjs";

export const StudentsEdit: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();

  return (
    <ResourceActionGuard action="edit">
      <Edit saveButtonProps={saveButtonProps} title="Ubah Siswa">
        <Card>
          <Form {...formProps} layout="vertical">
            <Form.Item
              label="NIS"
              name="nis"
              rules={[{ required: true, message: "NIS wajib diisi" }]}
            >
              <Input placeholder="Masukkan NIS" />
            </Form.Item>
            <Form.Item label="Nama Lengkap" name="fullName" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item
              label="Tanggal Lahir"
              name="birthDate"
              rules={[{ required: true, message: "Tanggal lahir wajib diisi" }]}
              getValueProps={(value: unknown) => {
                if (!value) return { value: undefined };
                const formatted = dayjs(String(value));
                return { value: formatted.isValid() ? formatted.format("YYYY-MM-DD") : undefined };
              }}
            >
              <Input type="date" placeholder="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item
              label="Jenis Kelamin"
              name="gender"
              rules={[{ required: true, message: "Jenis kelamin wajib diisi" }]}
            >
              <Select
                options={[
                  { value: "M", label: "Laki-laki" },
                  { value: "F", label: "Perempuan" },
                ]}
                placeholder="Pilih jenis kelamin"
              />
            </Form.Item>
            <Form.Item label="Wali" name="guardian">
              <Input placeholder="Nama wali (opsional)" />
            </Form.Item>
          </Form>
        </Card>
      </Edit>
    </ResourceActionGuard>
  );
};
