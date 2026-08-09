import React from "react";
import { List, useTable, EditButton, DeleteButton, DateField } from "@refinedev/antd";
import { Table, Space, Tag } from "antd";

export const BehaviorNotesList: React.FC = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="studentId" title="Siswa ID" />
        <Table.Column dataIndex="classroomId" title="Kelas ID" />
        <Table.Column
          dataIndex="category"
          title="Kategori"
          render={(value: string) => <Tag>{value}</Tag>}
        />
        <Table.Column dataIndex="note" title="Catatan" />
        <Table.Column
          dataIndex={["date"]}
          title="Tanggal"
          render={(value: any) => <DateField value={value} format="YYYY-MM-DD" />}
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
