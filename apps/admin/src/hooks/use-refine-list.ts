import { useList as useRefineList, type BaseRecord, type HttpError } from "@refinedev/core";

/**
 * Compatibility facade for the Refine v4 list shape while screens migrate to
 * the v5 `result`/`query` shape. It also accepts v4 pagination and query
 * options so the migration can be incremental without changing request
 * semantics.
 */
export type RefineListResult<T = BaseRecord> = {
  data: {
    data: T[];
    total: number | undefined;
  };
  result: {
    data: T[];
    total: number | undefined;
    [key: string]: unknown;
  };
  query: Record<string, any>;
  isLoading: boolean;
  isFetching: boolean;
  refetch: (...args: any[]) => any;
  [key: string]: any;
};

type LegacyListOptions = {
  pagination?: {
    current?: number;
    currentPage?: number;
    pageSize?: number;
    mode?: "server" | "client" | "off";
    [key: string]: unknown;
  };
  queryOptions?: {
    keepPreviousData?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export function useList<T extends BaseRecord = BaseRecord>(
  options?: LegacyListOptions
): RefineListResult<T> {
  const pagination = options?.pagination;
  const queryOptions = options?.queryOptions;

  const normalizedOptions = {
    ...options,
    ...(pagination
      ? {
          pagination: {
            ...pagination,
            currentPage: pagination.currentPage ?? pagination.current,
          },
        }
      : {}),
    ...(queryOptions
      ? {
          queryOptions: {
            ...queryOptions,
            ...(queryOptions.keepPreviousData
              ? { placeholderData: (previousData: unknown) => previousData }
              : {}),
          },
        }
      : {}),
  };

  const response = useRefineList<T, HttpError>(normalizedOptions as any);
  const data = response.result?.data ?? [];
  const total = response.result?.total;

  return {
    ...response,
    data: { data, total },
    isLoading: response.query.isLoading,
    isFetching: response.query.isFetching,
    refetch: response.query.refetch,
  } as RefineListResult<T>;
}
