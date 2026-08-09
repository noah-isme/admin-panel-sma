import React from "react";
import { List, useTable, EditButton, DeleteButton, DateField } from "@refinedev/antd";
import { Table, Space, Tag } from "antd";

export const AnnouncementsList: React.FC = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="title" title="Judul" />
        <Table.Column
          dataIndex="audience"
          title="Audiens"
          render={(value: string) => <Tag>{value}</Tag>}
        />
        <Table.Column
          dataIndex={["publishAt"]}
          title="Tgl Publish"
          render={(value: any) => <DateField value={value} />}
        />
        <Table.Column
          title="Aksi"
          dataIndex="actions"
          render={(_, record: any) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
