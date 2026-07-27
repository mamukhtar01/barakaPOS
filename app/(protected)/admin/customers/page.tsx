"use client";

import { useState, useEffect, useCallback } from "react";
import {
  App,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Typography,
  Popconfirm,
  Card,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from "@ant-design/icons";
import type { Customer } from "@/lib/types";

const { Title } = Typography;

export default function CustomersPage() {
  const { message } = App.useApp();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form] = Form.useForm();
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`);
    if (res.ok) setCustomers((await res.json()).customers);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    void (async () => {
      await fetchData();
    })();
  }, [fetchData]);

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    form.setFieldsValue(c);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/customers/${id}`, { method: "DELETE" });
    message.success("Customer deleted");
    fetchData();
  };

  const onSubmit = async (values: { name: string; phone?: string }) => {
    setSaving(true);
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/customers/${editing.id}` : "/api/customers";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      message.success(editing ? "Customer updated" : "Customer added");
      setModalOpen(false);
      fetchData();
    } else {
      const data = await res.json();
      message.error(data.error ?? "Failed to save");
    }
    setSaving(false);
  };

  const columns = [
    { title: "Name", dataIndex: "name" },
    { title: "Phone", dataIndex: "phone", render: (v: string | null) => v ?? "—" },
    { title: "Joined", dataIndex: "created_at", render: (v: string) => new Date(v).toLocaleDateString() },
    {
      title: "Actions",
      render: (_: unknown, r: Customer) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Delete this customer?" onConfirm={() => handleDelete(r.id)} okText="Yes" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Title level={4} className="mb-0">Customers</Title>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Customer</Button>
        </Space>
      </div>

      <Card>
        <Table dataSource={customers} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />
      </Card>

      <Modal
        title={editing ? "Edit Customer" : "Add Customer"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} onFinish={onSubmit} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Customer name" />
          </Form.Item>
          <Form.Item name="phone" label="Phone Number" rules={[{ required: true }]}>
            <Input placeholder="+252..." type="number" />
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
