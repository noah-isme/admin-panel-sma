import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, Select, DatePicker } from "antd";
import dayjs from "dayjs";

export const BehaviorNotesEdit: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Siswa ID" name="studentId" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Kelas ID" name="classroomId" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Kategori" name="category" rules={[{ required: true }]}>
          <Select
            options={[
              { label: "Kedisiplinan", value: "Kedisiplinan" },
              { label: "Prestasi", value: "Prestasi" },
              { label: "BK", value: "BK" },
            ]}
          />
        </Form.Item>
        <Form.Item label="Catatan" name="note" rules={[{ required: true }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item
          label="Tanggal"
          name="date"
          getValueProps={(value) => ({ value: value ? dayjs(value) : undefined })}
          getValueFromEvent={(e) => (e ? e.format("YYYY-MM-DD") : undefined)}
        >
          <DatePicker />
        </Form.Item>
      </Form>
    </Edit>
  );
};
