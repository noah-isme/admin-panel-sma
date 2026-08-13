import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Card, Select } from "antd";
import { ResourceActionGuard } from "../components/resource-action-guard";

export const SubjectsCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();

  return (
    <ResourceActionGuard action="create">
      <Create saveButtonProps={saveButtonProps} title="Buat Mata Pelajaran">
        <Card>
          <Form {...formProps} layout="vertical">
            <Form.Item
              label="Kode"
              name="code"
              rules={[{ required: true, message: "Kode wajib diisi" }]}
            >
              <Input placeholder="Masukkan kode mata pelajaran" />
            </Form.Item>
            <Form.Item label="Nama" name="name" rules={[{ required: true }]}>
              <Input placeholder="Masukkan nama mata pelajaran" />
            </Form.Item>
            <Form.Item
              label="Jalur"
              name="track"
              rules={[{ required: true, message: "Jalur wajib dipilih" }]}
            >
              <Select
                options={[
                  { value: "ALL", label: "Semua jalur" },
                  { value: "IPA", label: "IPA" },
                  { value: "IPS", label: "IPS" },
                ]}
              />
            </Form.Item>
            <Form.Item
              label="Kelompok"
              name="subjectGroup"
              rules={[{ required: true, message: "Kelompok wajib dipilih" }]}
            >
              <Select
                options={[
                  { value: "CORE", label: "Wajib" },
                  { value: "DIFFERENTIATED", label: "Peminatan" },
                  { value: "ELECTIVE", label: "Pilihan" },
                ]}
              />
            </Form.Item>
          </Form>
        </Card>
      </Create>
    </ResourceActionGuard>
  );
};
