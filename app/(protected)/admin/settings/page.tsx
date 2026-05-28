"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Form, Input, InputNumber, Button, Typography, message, Spin, Divider } from "antd";
import { SaveOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/settings");
    if (res.ok) {
      const data = await res.json();
      form.setFieldsValue({
        shop_name: data.settings.shop_name ?? "Baraka Café",
        exchange_rate: Number(data.settings.exchange_rate ?? 28000),
        receipt_footer: data.settings.receipt_footer ?? "Thank you for your visit!",
      });
    }
    setLoading(false);
  }, [form]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const onSubmit = async (values: { shop_name: string; exchange_rate: number; receipt_footer: string }) => {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_name: values.shop_name,
        exchange_rate: String(values.exchange_rate),
        receipt_footer: values.receipt_footer,
      }),
    });
    if (res.ok) {
      message.success("Settings saved");
    } else {
      message.error("Failed to save settings");
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-16"><Spin size="large" /></div>;

  return (
    <div className="max-w-lg">
      <Title level={4} className="mb-4">Settings</Title>

      <Card>
        <Form form={form} onFinish={onSubmit} layout="vertical">
          <Form.Item name="shop_name" label="Shop Name" rules={[{ required: true }]}>
            <Input placeholder="Baraka Café" />
          </Form.Item>

          <Divider />

          <Form.Item
            name="exchange_rate"
            label="USD → SOS Exchange Rate"
            help="How many Somali Shillings equal 1 USD"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} step={100} className="w-full" />
          </Form.Item>

          <Divider />

          <Form.Item name="receipt_footer" label="Receipt Footer Message">
            <Input.TextArea rows={2} placeholder="Thank you for your visit!" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
            Save Settings
          </Button>
        </Form>
      </Card>
    </div>
  );
}
