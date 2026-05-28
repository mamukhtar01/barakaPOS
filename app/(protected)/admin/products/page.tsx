"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Switch,
  Space, Typography, Popconfirm, App, Upload, Tag, Image, Card
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from "@ant-design/icons";
import type { Product, Category } from "@/lib/types";

const { Title } = Typography;
const MAX_IMAGE_BYTES = 350 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

function dataUrlSizeInBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  const padding = (base64.match(/=+$/)?.[0].length ?? 0);
  return Math.floor((base64.length * 3) / 4) - padding;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function compressImageToBase64(file: File): Promise<string> {
  const srcDataUrl = await fileToBase64(file);

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Failed to load image for compression"));
    el.src = srcDataUrl;
  });

  let targetWidth = img.width;
  let targetHeight = img.height;
  const maxDimension = 900;
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  targetWidth = Math.max(1, Math.round(img.width * scale));
  targetHeight = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return srcDataUrl;

  let best = srcDataUrl;
  const outputType = "image/jpeg";

  for (let pass = 0; pass < 4; pass += 1) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
      const candidate = canvas.toDataURL(outputType, quality);
      if (dataUrlSizeInBytes(candidate) < dataUrlSizeInBytes(best)) {
        best = candidate;
      }
      if (dataUrlSizeInBytes(candidate) <= MAX_IMAGE_BYTES) {
        return candidate;
      }
    }

    targetWidth = Math.max(1, Math.round(targetWidth * 0.82));
    targetHeight = Math.max(1, Math.round(targetHeight * 0.82));
  }

  return dataUrlSizeInBytes(best) < dataUrlSizeInBytes(srcDataUrl) ? best : srcDataUrl;
}

async function generateSquareThumbnail(base64Image: string, size = 120): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Failed to load image for thumbnail"));
    el.src = base64Image;
  });

  const srcW = img.width;
  const srcH = img.height;
  const side = Math.min(srcW, srcH);
  const sx = Math.max(0, Math.floor((srcW - side) / 2));
  const sy = Math.max(0, Math.floor((srcH - side) / 2));

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return base64Image;

  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export default function ProductsPage() {
  const { message } = App.useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form] = Form.useForm();
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [generateThumb, setGenerateThumb] = useState(true);
  const imageValue = Form.useWatch("img", form) as string | null | undefined;
  const thumbValue = Form.useWatch("thumbnail_url", form) as string | null | undefined;

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
    setGenerateThumb(true);
    form.resetFields();
    form.setFieldsValue({ status: "active", cost_price_usd: 0, img: null, thumbnail_url: null });
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setGenerateThumb(true);
    form.setFieldsValue(p);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    message.success("Product deleted");
    fetchData();
  };

  const onSubmit = async (values: Partial<Product>) => {
    if (imageUploading) {
      message.warning("Please wait for the image upload to finish");
      return;
    }

    setSaving(true);
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/products/${editing.id}` : "/api/products";
    const payload = {
      ...values,
      img: values.img?.trim() ? values.img : null,
      thumbnail_url: values.thumbnail_url?.trim() ? values.thumbnail_url : null,
    };
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
      render: (url: string | null, r: Product) => {
        const preview = r.img ?? r.thumbnail_url ?? url;
        return preview ? <Image src={preview} width={40} height={40} className="rounded object-cover" alt="" /> : <span>—</span>;
      },
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
        <Title level={4} className="mb-0!">Products</Title>
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
        onCancel={() => {
          if (imageUploading) return;
          setModalOpen(false);
        }}
        footer={null}
        width={520}
        forceRender
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
          <Form.Item name="img" label="Image (Base64)">
            <Input.TextArea rows={3} placeholder="Paste a base64 image data URL or upload below to auto-fill" />
          </Form.Item>

          <Form.Item name="thumbnail_url" hidden>
            <Input />
          </Form.Item>

          <Form.Item label="Upload Image (Base64)">
            <Space orientation="vertical" size="small" className="w-full">
              <div className="flex items-center gap-2">
                <Switch checked={generateThumb} onChange={setGenerateThumb} />
                <span className="text-sm text-gray-600">Generate square thumbnail for table (faster)</span>
              </div>
              <Upload
                accept="image/*"
                maxCount={1}
                showUploadList={false}
                beforeUpload={(file) => {
                  if (!file.type.startsWith("image/")) {
                    message.error("Please select an image file");
                    return Upload.LIST_IGNORE;
                  }
                  return false;
                }}
                onChange={async ({ file }) => {
                  if (!file.originFileObj) return;
                  try {
                    setImageUploading(true);
                    const original = await fileToBase64(file.originFileObj);
                    const base64 = await compressImageToBase64(file.originFileObj);
                    const thumbnail = generateThumb ? await generateSquareThumbnail(base64) : null;
                    const compressedBytes = dataUrlSizeInBytes(base64);
                    if (compressedBytes > MAX_IMAGE_BYTES) {
                      form.setFieldValue("img", null);
                      form.setFieldValue("thumbnail_url", null);
                      message.error(`Image is still too large after compression (${formatBytes(compressedBytes)}). Please use a smaller image.`);
                      return;
                    }
                    form.setFieldValue("img", base64);
                    form.setFieldValue("thumbnail_url", thumbnail);
                    const originalBytes = dataUrlSizeInBytes(original);
                    const reduced = Math.max(0, originalBytes - compressedBytes);
                    if (reduced > 0) {
                      message.success(
                        `Image compressed ${formatBytes(originalBytes)} to ${formatBytes(compressedBytes)}`
                      );
                    } else {
                      message.success("Image converted to Base64");
                    }
                  } catch {
                    message.error("Could not convert image");
                  } finally {
                    setImageUploading(false);
                  }
                }}
              >
                <Button loading={imageUploading}>Choose Image File</Button>
              </Upload>
              <div className="flex items-center gap-2">
                <Button
                  size="small"
                  onClick={() => {
                    form.setFieldValue("img", null);
                    form.setFieldValue("thumbnail_url", null);
                  }}
                  disabled={!imageValue && !thumbValue}
                >
                  Remove Image
                </Button>
                {imageValue ? <Tag color="green">Image ready</Tag> : <Tag>No image</Tag>}
                {thumbValue ? <Tag color="blue">Thumbnail ready</Tag> : null}
              </div>
              {imageValue ? (
                <Image src={imageValue} width={90} height={90} className="rounded object-cover" alt="preview" />
              ) : null}
            </Space>
          </Form.Item>
          <div className="flex gap-3">
            <Form.Item name="sale_price_usd" label="Sale Price (USD)" className="flex-1" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.5} className="w-full" addonBefore="$" />
            </Form.Item>
            <Form.Item name="cost_price_usd" label="Cost Price (USD)" className="flex-1">
              <InputNumber min={0} step={0.5} className="w-full" addonBefore="$" />
            </Form.Item>
          </div>
          <Form.Item name="status" label="Status" valuePropName="checked"
            getValueFromEvent={(v) => (v ? "active" : "inactive")}
            getValueProps={(v) => ({ checked: v === "active" })}
          >
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
          <div className="flex gap-2">
            <Button block onClick={() => setModalOpen(false)} disabled={imageUploading}>Cancel</Button>
            <Button block type="primary" htmlType="submit" loading={saving} disabled={imageUploading}>
              Save
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
