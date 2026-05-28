"use client";

import { useState, useRef } from "react";
import { Button, Input, Form, Card, Typography, Alert, Space } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [form] = Form.useForm();
  const router = useRouter();
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const digits = value.slice(-1);
    const newPin = pin.split("");
    newPin[index] = digits;
    const updated = newPin.join("").slice(0, 4);
    setPin(updated);
    if (digits && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
    if (updated.length === 4) {
      form.setFieldValue("pin", updated);
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
      const newPin = pin.split("");
      newPin[index - 1] = "";
      setPin(newPin.join(""));
    }
  };

  const onFinish = async (values: { username: string; pin: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: values.username, pin: pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        setPin("");
        pinRefs.current[0]?.focus();
      } else {
        router.push("/pos");
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-sm shadow-xl rounded-2xl">
        <Space direction="vertical" className="w-full text-center" size="large">
          <div>
            <div className="flex justify-center mb-2">
              <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                B
              </div>
            </div>
            <Title level={3} className="!mb-0">
              Baraka POS
            </Title>
            <Text type="secondary">Sign in to continue</Text>
          </div>

          {error && (
            <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} />
          )}

          <Form form={form} onFinish={onFinish} layout="vertical" requiredMark={false}>
            <Form.Item
              name="username"
              rules={[{ required: true, message: "Enter your username" }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Username"
                size="large"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item label="PIN" required>
              <div className="flex gap-3 justify-center">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    ref={(el) => { pinRefs.current[i] = el; }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={pin[i] ?? ""}
                    onChange={(e) => handlePinChange(i, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(i, e)}
                    className="w-12 h-12 text-center text-xl border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none transition-colors"
                  />
                ))}
              </div>
            </Form.Item>

            <Form.Item className="!mb-0">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
                icon={<LockOutlined />}
                disabled={pin.length < 4}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <Text type="secondary" className="text-xs">
            Default: admin / 1234
          </Text>
        </Space>
      </Card>
    </div>
  );
}
