import { useList } from "../hooks/use-refine-list";
import React, { useMemo } from "react";
import { Card, Select, Space, Table, Typography, Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { httpClient } from "../providers/dataProvider";
import { resolveActiveTerm } from "../utils/terms";

type Term = { id: string; name: string; active?: boolean; isActive?: boolean };

const fetchGradesAnalytics = async (termId: string) => {
  const { data } = await httpClient.get("/analytics/grades", { params: { term_id: termId } });
  return data?.data ?? data ?? [];
};

export const GradesAnalyticsPage: React.FC = () => {
  const migratedTermsQuery = useList<Term>({
    resource: "terms",
    pagination: { currentPage: 1, pageSize: 100 },
  });

  const termsQuery = {
    ...migratedTermsQuery.result,
    ...migratedTermsQuery.query,
    ...migratedTermsQuery,
  };

  const terms = termsQuery.data?.data ?? [];
  const [termId, setTermId] = React.useState<string>();
  React.useEffect(() => {
    if (!termId) setTermId(resolveActiveTerm(terms)?.id);
  }, [termId, terms]);
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-grades", termId],
    queryFn: () => fetchGradesAnalytics(termId ?? ""),
    enabled: Boolean(termId),
  });

  const normalizedData = Array.isArray(data) ? data : data?.items || data?.rows || [];

  const columns = useMemo(() => {
    if (!normalizedData || normalizedData.length === 0) return [];
    const firstRow = normalizedData[0];
    return Object.keys(firstRow).map((key) => ({
      title:
        key.charAt(0).toUpperCase() +
        key
          .slice(1)
          .replace(/([A-Z])/g, " $1")
          .trim(),
      dataIndex: key,
      key: key,
      render: (val: any) => (typeof val === "object" ? JSON.stringify(val) : String(val)),
    }));
  }, [normalizedData]);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%", padding: 24 }}>
      <Typography.Title level={3}>Analitik Nilai (Grades Analytics)</Typography.Title>
      <Typography.Text type="secondary">Laporan dan Analitik Nilai Akademik</Typography.Text>
      <Select
        aria-label="Term analitik nilai"
        value={termId}
        loading={termsQuery.isLoading}
        placeholder="Pilih term"
        style={{ minWidth: 240 }}
        options={terms.map((term) => ({ value: term.id, label: term.name }))}
        onChange={setTermId}
      />
      <Card>
        <Spin spinning={isLoading}>
          <Table
            dataSource={normalizedData}
            columns={columns}
            rowKey={(record: any, idx) => record?.id ?? String(idx)}
            pagination={{ pageSize: 10 }}
            scroll={{ x: true }}
          />
        </Spin>
      </Card>
    </Space>
  );
};
