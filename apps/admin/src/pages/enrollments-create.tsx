import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { Card, Form, Select } from "antd";
import { useList } from "@refinedev/core";
import { ResourceActionGuard } from "../components/resource-action-guard";

type LookupRecord = { id: string; name?: string; fullName?: string; nis?: string; code?: string };

export const EnrollmentsCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();
  const studentsQuery = useList<LookupRecord>({
    resource: "students",
    pagination: { current: 1, pageSize: 500 },
  });
  const classesQuery = useList<LookupRecord>({
    resource: "classes",
    pagination: { current: 1, pageSize: 200 },
  });
  const termsQuery = useList<LookupRecord>({
    resource: "terms",
    pagination: { current: 1, pageSize: 100 },
  });

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
