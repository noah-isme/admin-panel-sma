import React, { useMemo } from "react";
import { Show } from "@refinedev/antd";
import { useCan, useNavigation, useResourceParams, useShow } from "@refinedev/core";
import { Descriptions, Typography, Result, Spin, Space, Button } from "antd";
import { ResourceActionGuard } from "../components/resource-action-guard";

const formatLabel = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());

const renderValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return <Typography.Text type="secondary">—</Typography.Text>;
  }

  if (typeof value === "object") {
    return (
      <Typography.Paragraph
        code
        style={{ marginBottom: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
      >
        {JSON.stringify(value, null, 2)}
      </Typography.Paragraph>
    );
  }

  return <Typography.Text>{String(value)}</Typography.Text>;
};

export const ResourceShow: React.FC = () => {
  const { resource } = useResourceParams();
  const resourceName = resource?.name ?? resource?.identifier;
  const resourceLabel = resource?.meta?.label ?? resourceName ?? "Detail";

  const { data: editPermission } = useCan({
    resource: resourceName ?? "",
    action: "edit",
    queryOptions: { enabled: Boolean(resourceName) },
  });
  const canEdit =
    (resource?.meta?.canEdit ?? Boolean(resource?.edit)) && editPermission?.can !== false;

  const { query, result } = useShow();
  const { edit, list } = useNavigation();

  const isLoading = query.isLoading || query.isFetching || query.isInitialLoading || false;
  const error = query.error as { message?: string } | null;
  const data = result as Record<string, unknown> | undefined;

  const editButton =
    canEdit && resourceName && data?.id ? (
      <Button type="primary" onClick={() => edit(resourceName, String(data.id))}>
        Ubah
      </Button>
    ) : null;

  const backButton = resourceName ? (
    <Button onClick={() => list(resourceName)}>Kembali</Button>
  ) : null;

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <div
          style={{
            padding: 48,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Spin size="large" />
          <Typography.Text>Memuat detail data...</Typography.Text>
        </div>
      );
    }

    if (error) {
      return (
        <Result
          status="error"
          title="Gagal memuat data"
          subTitle={error.message ?? "Terjadi kesalahan saat mengambil detail data."}
        />
      );
    }

    if (!data) {
      return (
        <Result
          status="info"
          title="Data tidak tersedia"
          subTitle="Tidak ada detail yang bisa ditampilkan untuk resource ini."
        />
      );
    }

    return (
      <Descriptions column={1} bordered>
        {Object.entries(data).map(([key, value]) => (
          <Descriptions.Item label={formatLabel(key)} key={key}>
            {renderValue(value)}
          </Descriptions.Item>
        ))}
      </Descriptions>
    );
  }, [data, error, isLoading]);

  return (
    <ResourceActionGuard action="show" resourceName={resourceName}>
      <Show
        isLoading={isLoading}
        title={resourceLabel}
        headerButtons={
          editButton || backButton ? (
            <Space>
              {editButton}
              {backButton}
            </Space>
          ) : undefined
        }
      >
        {content}
      </Show>
    </ResourceActionGuard>
  );
};
