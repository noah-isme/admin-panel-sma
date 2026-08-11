import React, { useMemo } from "react";
import { Card, Space, Table, Typography, Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { httpClient } from "../providers/dataProvider";

const fetchBehaviorAnalytics = async () => {
  const { data } = await httpClient.get("/analytics/behavior");
  return data?.data ?? data ?? [];
};

export const BehaviorAnalyticsPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-behavior"],
    queryFn: fetchBehaviorAnalytics,
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
      <Typography.Title level={3}>Analitik Perilaku (Behavior Analytics)</Typography.Title>
      <Typography.Text type="secondary">Laporan dan Analitik Perilaku Siswa</Typography.Text>
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
