import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { useAppNotification } from "../hooks/use-app-notification";
import { Form, Input, Card, Select } from "antd";
import { ResourceActionGuard } from "../components/resource-action-guard";

export const StudentsCreate: React.FC = () => {
  const { open: notify } = useAppNotification();
  const { formProps, saveButtonProps } = useForm({
    onMutationSuccess: () =>
      notify?.({ type: "success", message: "Berhasil", description: "Siswa berhasil dibuat." }),
    onMutationError: (err: any) =>
      notify?.({
        type: "error",
        message: "Gagal",
        description: err?.message ?? "Gagal membuat siswa.",
      }),
  });

  return (
    <ResourceActionGuard action="create">
      <Create
        saveButtonProps={{
          ...saveButtonProps,
        }}
        title="Buat Siswa"
      >
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
      </Create>
    </ResourceActionGuard>
  );
};
