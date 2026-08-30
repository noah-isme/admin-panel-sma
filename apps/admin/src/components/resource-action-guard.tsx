import type { PropsWithChildren, ReactNode } from "react";
import { Result, Spin, Typography } from "antd";
import { useCan, useResourceParams } from "@refinedev/core";

type GuardAction = "list" | "show" | "create" | "edit" | "delete" | "approve" | "view" | string;

interface ResourceActionGuardProps {
  action: GuardAction;
  resourceName?: string;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

export const ResourceActionGuard: React.FC<PropsWithChildren<ResourceActionGuardProps>> = ({
  action,
  resourceName,
  children,
  fallback,
  loadingFallback,
}) => {
  const { resource } = useResourceParams();
  const targetResource = resourceName ?? resource?.name ?? resource?.identifier ?? undefined;

  const { data, isLoading } = useCan({
    resource: targetResource ?? "",
    action,
    queryOptions: { enabled: Boolean(targetResource) },
  });

  if (!targetResource) {
    return <>{children}</>;
  }

  if (isLoading) {
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          padding: 48,
        }}
      >
        <Spin />
        <Typography.Text>Mengecek hak akses...</Typography.Text>
      </div>
    );
  }

  if (data?.can === false) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Result
        status="403"
        title="Akses ditolak"
        subTitle={data.reason ?? "Anda tidak memiliki izin untuk mengakses halaman ini."}
      />
    );
  }

  return <>{children}</>;
};
