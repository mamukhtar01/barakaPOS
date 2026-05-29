"use client";

import { useState, useEffect, useCallback } from "react";
import {
  App,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Typography,
  Popconfirm,
  Tag,
  Card,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface User {
  id: number;
  username: string;
  role: string;
  active: number | boolean;
  created_at: string;
}

export default function UsersPage() {
  const { message } = App.useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) setUsers((await res.json()).users);
    setLoading(false);
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchData();
    })();
  }, [fetchData]);

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ role: "cashier", active: true });
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    form.setFieldsValue({ ...u, active: Boolean(u.active), pin: "" });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) { message.success("User deleted"); fetchData(); }
    else { const d = await res.json(); message.error(d.error ?? "Failed"); }
  };

  const onSubmit = async (values: { username: string; pin?: string; role: string; active: boolean }) => {
    setSaving(true);
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/users/${editing.id}` : "/api/users";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      message.success(editing ? "User updated" : "User created");
      setModalOpen(false);
      fetchData();
    } else {
      const data = await res.json();
      message.error(data.error ?? "Failed");
    }
    setSaving(false);
  };

  const columns = [
    { title: "Username", dataIndex: "username" },
    {
      title: "Role",
      dataIndex: "role",
      render: (v: string) => <Tag color={v === "admin" ? "red" : "blue"}>{v}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "active",
      render: (v: number | boolean) => (
        <Tag color={v ? "green" : "default"}>{v ? "Active" : "Disabled"}</Tag>
      ),
    },
    { title: "Created", dataIndex: "created_at", render: (v: string) => new Date(v).toLocaleDateString() },
    {
      title: "Actions",
      render: (_: unknown, r: User) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Delete this user?" onConfirm={() => handleDelete(r.id)} okText="Yes" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Title level={4} className="mb-0!">Users</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add User</Button>
      </div>

      <Card>
        <Table dataSource={users} columns={columns} rowKey="id" loading={loading} pagination={false} />
      </Card>

      <Modal
        title={editing ? "Edit User" : "Add User"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} onFinish={onSubmit} layout="vertical">
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input placeholder="username" />
          </Form.Item>
          <Form.Item
            name="pin"
            label={editing ? "New PIN (leave blank to keep)" : "PIN"}
            rules={editing ? [] : [{ required: true, len: 4, message: "PIN must be 4 digits" }]}
          >
            <Input.Password placeholder="4-digit PIN" maxLength={4} />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={[{ value: "admin", label: "Admin" }, { value: "cashier", label: "Cashier" }]} />
          </Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Disabled" />
          </Form.Item>
          <div className="flex gap-2">
            <Button block onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button block type="primary" htmlType="submit" loading={saving}>Save</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
