"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Switch,
  Space, Typography, Popconfirm, message, Upload, Tag, Image, Card
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from "@ant-design/icons";
import type { Product, Category } from "@/lib/types";

const { Title } = Typography;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form] = Form.useForm();
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [pRes, cRes] = await Promise.all([
      fetch("/api/products?status=all"),
      fetch("/api/categories"),
    ]);
    if (pRes.ok) setProducts((await pRes.json()).products);
    if (cRes.ok) setCategories((await cRes.json()).categories);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: "active", cost_price_usd: 0 });
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    form.setFieldsValue(p);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    message.success("Product deleted");
    fetchData();
  };

  const onSubmit = async (values: Partial<Product>) => {
    setSaving(true);
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/products/${editing.id}` : "/api/products";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      message.success(editing ? "Product updated" : "Product created");
      setModalOpen(false);
      fetchData();
    } else {
      const data = await res.json();
      message.error(data.error ?? "Failed to save");
    }
    setSaving(false);
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: "Image",
      dataIndex: "image_url",
      width: 60,
      render: (url: string | null) =>
        url ? <Image src={url} width={40} height={40} className="rounded object-cover" alt="" /> : <span>—</span>,
    },
    { title: "Name", dataIndex: "name", sorter: (a: Product, b: Product) => a.name.localeCompare(b.name) },
    {
      title: "Category",
      dataIndex: "category_name",
      render: (v: string | null, r: Product) => {
        const cat = categories.find((c) => c.id === r.category_id);
        return cat ? <Tag color={cat.color}>{v ?? "—"}</Tag> : v ?? "—";
      },
    },
    {
      title: "Sale Price",
      dataIndex: "sale_price_usd",
      render: (v: number) => `$${v.toFixed(2)}`,
      sorter: (a: Product, b: Product) => a.sale_price_usd - b.sale_price_usd,
    },
    {
      title: "Cost Price",
      dataIndex: "cost_price_usd",
      render: (v: number) => `$${v.toFixed(2)}`,
    },
    {
      title: "Profit",
      render: (_: unknown, r: Product) => {
        const profit = r.sale_price_usd - r.cost_price_usd;
        return <span className={profit >= 0 ? "text-green-600" : "text-red-500"}>${profit.toFixed(2)}</span>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (v: string) => <Tag color={v === "active" ? "green" : "default"}>{v}</Tag>,
    },
    {
      title: "Actions",
      render: (_: unknown, r: Product) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Delete this product?" onConfirm={() => handleDelete(r.id)} okText="Yes" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Title level={4} className="!mb-0">Products</Title>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            Add Product
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 700 }}
        />
      </Card>

      <Modal
        title={editing ? "Edit Product" : "Add Product"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={520}
      >
        <Form form={form} onFinish={onSubmit} layout="vertical">
          <Form.Item name="name" label="Product Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Chicken Sandwich" />
          </Form.Item>
          <Form.Item name="category_id" label="Category">
            <Select
              placeholder="Select category"
              allowClear
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item name="image_url" label="Image URL">
            <Input placeholder="https://..." />
          </Form.Item>
          <div className="flex gap-3">
            <Form.Item name="sale_price_usd" label="Sale Price (USD)" className="flex-1" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.5} className="w-full" prefix="$" />
            </Form.Item>
            <Form.Item name="cost_price_usd" label="Cost Price (USD)" className="flex-1">
              <InputNumber min={0} step={0.5} className="w-full" prefix="$" />
            </Form.Item>
          </div>
          <Form.Item name="status" label="Status" valuePropName="checked"
            getValueFromEvent={(v) => (v ? "active" : "inactive")}
            getValueProps={(v) => ({ checked: v === "active" })}
          >
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
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
