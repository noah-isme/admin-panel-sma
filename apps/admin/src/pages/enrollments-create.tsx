import { useList } from "../hooks/use-refine-list";
import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { Card, Form, Select } from "antd";
import { ResourceActionGuard } from "../components/resource-action-guard";

type LookupRecord = { id: string; name?: string; fullName?: string; nis?: string; code?: string };

export const EnrollmentsCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();
  const migratedStudentsQuery = useList<LookupRecord>({
    resource: "students",
    pagination: { currentPage: 1, pageSize: 500 },
  });

  const studentsQuery = {
    ...migratedStudentsQuery.result,
    ...migratedStudentsQuery.query,
    ...migratedStudentsQuery,
  };

  const migratedClassesQuery = useList<LookupRecord>({
    resource: "classes",
    pagination: { currentPage: 1, pageSize: 200 },
  });

  const classesQuery = {
    ...migratedClassesQuery.result,
    ...migratedClassesQuery.query,
    ...migratedClassesQuery,
  };

  const migratedTermsQuery = useList<LookupRecord>({
    resource: "terms",
    pagination: { currentPage: 1, pageSize: 100 },
  });

  const termsQuery = {
    ...migratedTermsQuery.result,
    ...migratedTermsQuery.query,
    ...migratedTermsQuery,
  };

  return (
    <ResourceActionGuard action="create">
      <Create saveButtonProps={saveButtonProps} title="Buat Enrol Siswa">
        <Card>
          <Form {...formProps} layout="vertical">
            <Form.Item label="Siswa" name="studentId" rules={[{ required: true }]}>
              <Select
                showSearch
                optionFilterProp="label"
                loading={studentsQuery.isLoading}
                placeholder="Pilih siswa"
                options={studentsQuery.data?.data.map((item) => ({
                  value: item.id,
                  label: `${item.fullName ?? item.name ?? item.id}${item.nis ? ` · NIS ${item.nis}` : ""}`,
                }))}
              />
            </Form.Item>
            <Form.Item label="Kelas" name="classId" rules={[{ required: true }]}>
              <Select
                showSearch
                optionFilterProp="label"
                loading={classesQuery.isLoading}
                placeholder="Pilih kelas"
                options={classesQuery.data?.data.map((item) => ({
                  value: item.id,
                  label: item.name ?? item.code ?? item.id,
                }))}
              />
            </Form.Item>
            <Form.Item label="Tahun Ajaran" name="termId" rules={[{ required: true }]}>
              <Select
                showSearch
                optionFilterProp="label"
                loading={termsQuery.isLoading}
                placeholder="Pilih tahun ajaran"
                options={termsQuery.data?.data.map((item) => ({
                  value: item.id,
                  label: item.name ?? item.id,
                }))}
              />
            </Form.Item>
          </Form>
        </Card>
      </Create>
    </ResourceActionGuard>
  );
};
