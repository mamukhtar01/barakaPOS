"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table, Button, Modal, Form, Input, ColorPicker, Space, Typography,
  Popconfirm, message, Tag, Card
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { Category } from "@/lib/types";

const { Title } = Typography;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/categories");
    if (res.ok) setCategories((await res.json()).categories);
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
    form.setFieldsValue({ color: "#1677ff" });
    setModalOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    form.setFieldsValue(c);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    message.success("Category deleted");
    fetchData();
  };

  const onSubmit = async (values: { name: string; color: string | { toHexString: () => string } }) => {
    setSaving(true);
    const color = typeof values.color === "string" ? values.color : values.color.toHexString();
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: values.name, color }),
    });
    if (res.ok) {
      message.success(editing ? "Category updated" : "Category created");
      setModalOpen(false);
      fetchData();
    } else {
      const data = await res.json();
      message.error(data.error ?? "Failed to save");
    }
    setSaving(false);
  };

  const columns = [
    {
      title: "Color",
      dataIndex: "color",
      width: 80,
      render: (color: string) => (
        <div className="w-6 h-6 rounded-full border" style={{ background: color }} />
      ),
    },
    { title: "Name", dataIndex: "name", render: (name: string, r: Category) => <Tag color={r.color}>{name}</Tag> },
    {
      title: "Actions",
      width: 100,
      render: (_: unknown, r: Category) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Delete this category? Products will be unassigned." onConfirm={() => handleDelete(r.id)} okText="Yes" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Title level={4} className="mb-0">Categories</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Category</Button>
      </div>

      <Card>
        <Table
          dataSource={categories}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editing ? "Edit Category" : "Add Category"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} onFinish={onSubmit} layout="vertical">
          <Form.Item name="name" label="Category Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Sandwiches" />
          </Form.Item>
          <Form.Item name="color" label="Color" rules={[{ required: true }]}>
            <ColorPicker showText />
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
