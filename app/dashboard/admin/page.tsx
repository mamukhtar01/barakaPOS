"use client";

import { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Typography, Spin } from "antd";
import { DollarOutlined, ShoppingCartOutlined, UserOutlined, AppstoreOutlined, ExclamationCircleOutlined } from "@ant-design/icons";

const { Title } = Typography;

interface Summary {
  today: { total_usd: number; cnt: number };
  month: { total_usd: number; cnt: number };
  total: { total_usd: number; cnt: number };
  todayUnpaid: { total_usd: number; cnt: number };
  monthUnpaid: { total_usd: number; cnt: number };
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [productCount, setProductCount] = useState<number>(0);
  const [customerCount, setCustomerCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/reports?type=summary").then((r) => r.json()),
      fetch("/api/products?status=all").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
    ]).then(([reportData, productData, customerData]) => {
      setSummary(reportData);
      setProductCount(productData.products?.length ?? 0);
      setCustomerCount(customerData.customers?.length ?? 0);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Spin size="large" /></div>;

  return (
    <div>
      <Title level={4} className="mb-4">Dashboard</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Today's Sales"
              value={summary?.today.total_usd ?? 0}
              prefix={<DollarOutlined />}
              precision={2}
              styles={{ content: { color: "#16a34a" } }}
              suffix="USD"
            />
            <div className="text-gray-400 text-xs mt-1">{summary?.today.cnt ?? 0} transactions</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Monthly Sales"
              value={summary?.month.total_usd ?? 0}
              prefix={<DollarOutlined />}
              precision={2}
              styles={{ content: { color: "#1677ff" } }}
              suffix="USD"
            />
            <div className="text-gray-400 text-xs mt-1">{summary?.month.cnt ?? 0} transactions</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Total Sales"
              value={summary?.total.cnt ?? 0}
              prefix={<ShoppingCartOutlined />}
              styles={{ content: { color: "#722ed1" } }}
              suffix="orders"
            />
            <div className="text-gray-400 text-xs mt-1">${(summary?.total.total_usd ?? 0).toFixed(2)} total revenue</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Today's Unpaid Orders"
              value={summary?.todayUnpaid.total_usd ?? 0}
              prefix={<ExclamationCircleOutlined />}
              precision={2}
              styles={{ content: { color: "#f5222d" } }}
              suffix="USD"
            />
            <div className="text-gray-400 text-xs mt-1">{summary?.todayUnpaid.cnt ?? 0} orders unpaid</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Monthly Unpaid Orders"
              value={summary?.monthUnpaid.total_usd ?? 0}
              prefix={<ExclamationCircleOutlined />}
              precision={2}
              styles={{ content: { color: "#fa541c" } }}
              suffix="USD"
            />
            <div className="text-gray-400 text-xs mt-1">{summary?.monthUnpaid.cnt ?? 0} orders unpaid</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Products"
              value={productCount}
              prefix={<AppstoreOutlined />}
              styles={{ content: { color: "#fa8c16" } }}
            />
            <div className="text-gray-400 text-xs mt-1">{customerCount} customers</div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
