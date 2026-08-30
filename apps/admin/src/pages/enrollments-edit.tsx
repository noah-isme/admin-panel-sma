import { useList } from "../hooks/use-refine-list";
import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Card, Form, Select } from "antd";
import { ResourceActionGuard } from "../components/resource-action-guard";

type ClassRecord = { id: string; name?: string; code?: string };

export const EnrollmentsEdit: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();
  const migratedClassesQuery = useList<ClassRecord>({
    resource: "classes",
    pagination: { currentPage: 1, pageSize: 200 },
  });

  const classesQuery = {
    ...migratedClassesQuery.result,
    ...migratedClassesQuery.query,
    ...migratedClassesQuery,
  };

  return (
    <ResourceActionGuard action="edit">
      <Edit saveButtonProps={saveButtonProps} title="Ubah Enrol Siswa">
        <Card>
          <Form {...formProps} layout="vertical">
            <Form.Item
              label="Kelas tujuan"
              name="classId"
              rules={[{ required: true, message: "Kelas tujuan wajib dipilih" }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                loading={classesQuery.isLoading}
                placeholder="Pilih kelas tujuan"
                options={classesQuery.data?.data.map((item) => ({
                  value: item.id,
                  label: item.name ?? item.code ?? item.id,
                }))}
              />
            </Form.Item>
          </Form>
        </Card>
      </Edit>
    </ResourceActionGuard>
  );
};
