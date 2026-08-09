import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, Select, DatePicker } from "antd";
import dayjs from "dayjs";

export const AnnouncementsEdit: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Judul" name="title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Isi Pengumuman" name="body" rules={[{ required: true }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item label="Audiens" name="audience" rules={[{ required: true }]}>
          <Select
            options={[
              { label: "Semua", value: "ALL" },
              { label: "Guru", value: "TEACHERS" },
              { label: "Siswa", value: "STUDENTS" },
            ]}
          />
        </Form.Item>
        <Form.Item
          label="Tgl Publish"
          name="publishAt"
          getValueProps={(value) => ({ value: value ? dayjs(value) : undefined })}
          getValueFromEvent={(e) => (e ? e.toISOString() : undefined)}
        >
          <DatePicker showTime />
        </Form.Item>
      </Form>
    </Edit>
  );
};
