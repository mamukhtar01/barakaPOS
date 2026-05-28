"use client";

import { useState, useCallback } from "react";
import {
  Card, Tabs, DatePicker, Button, Table, Typography, Tag, Statistic,
  Row, Col, Space, Spin
} from "antd";
import { BarChartOutlined } from "@ant-design/icons";
import type { DailySalesReport, PaymentMethodReport } from "@/lib/types";

interface CurrencyReport {
  currency: string;
  total_usd: number;
  total_sos: number;
  transaction_count: number;
}

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [dailyData, setDailyData] = useState<DailySalesReport[]>([]);
  const [monthlyData, setMonthlyData] = useState<DailySalesReport[]>([]);
  const [productData, setProductData] = useState<{ product_name: string; quantity_sold: number; revenue_usd: number; cost_usd: number; profit_usd: number }[]>([]);
  const [paymentData, setPaymentData] = useState<PaymentMethodReport[]>([]);
  const [currencyData, setCurrencyData] = useState<CurrencyReport[]>([]);
  const [activeTab, setActiveTab] = useState("daily");

  const fetchReport = useCallback(async (type: string) => {
    setLoading(true);
    const params = new URLSearchParams({ type });
    if (dateRange) {
      params.set("from", dateRange[0]);
      params.set("to", dateRange[1]);
    }
    const res = await fetch(`/api/reports?${params}`);
    if (res.ok) {
      const data = await res.json();
      switch (type) {
        case "daily": setDailyData(data.report); break;
        case "monthly": setMonthlyData(data.report); break;
        case "by_product": setProductData(data.report); break;
        case "by_payment_method": setPaymentData(data.report); break;
        case "by_currency": setCurrencyData(data.report); break;
      }
    }
    setLoading(false);
  }, [dateRange]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    fetchReport(key);
  };

  const PAYMENT_COLORS: Record<string, string> = { cash: "green", mobile: "blue", card: "purple" };

  const dailyColumns = [
    { title: "Date", dataIndex: "date" },
    { title: "Transactions", dataIndex: "transaction_count" },
    { title: "Revenue (USD)", dataIndex: "total_usd", render: (v: number) => `$${Number(v).toFixed(2)}` },
    { title: "Revenue (SSHL)", dataIndex: "total_sos", render: (v: number) => `${Number(v).toLocaleString()} SSHL` },
  ];

  const productColumns = [
    { title: "Product", dataIndex: "product_name" },
    { title: "Qty Sold", dataIndex: "quantity_sold" },
    { title: "Revenue", dataIndex: "revenue_usd", render: (v: number) => `$${Number(v).toFixed(2)}` },
    { title: "Cost", dataIndex: "cost_usd", render: (v: number) => `$${Number(v).toFixed(2)}` },
    {
      title: "Profit",
      dataIndex: "profit_usd",
      render: (v: number) => (
        <span className={v >= 0 ? "text-green-600" : "text-red-500"}>${Number(v).toFixed(2)}</span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Title level={4} className="!mb-0">Reports</Title>
        <Space wrap>
          <RangePicker
            onChange={(_, str) => setDateRange(str[0] && str[1] ? [str[0], str[1]] : null)}
          />
          <Button type="primary" icon={<BarChartOutlined />} onClick={() => fetchReport(activeTab)}>
            Generate
          </Button>
        </Space>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-16"><Spin size="large" /></div>
        ) : (
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={[
              {
                key: "daily",
                label: "Daily Sales",
                children: (
                  <Table
                    dataSource={dailyData}
                    columns={dailyColumns}
                    rowKey="date"
                    pagination={{ pageSize: 15 }}
                    summary={(data) => {
                      const totalUsd = data.reduce((s, r) => s + Number(r.total_usd), 0);
                      const totalTx = data.reduce((s, r) => s + Number(r.transaction_count), 0);
                      return (
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0}><strong>Total</strong></Table.Summary.Cell>
                          <Table.Summary.Cell index={1}><strong>{totalTx}</strong></Table.Summary.Cell>
                          <Table.Summary.Cell index={2}><strong>${totalUsd.toFixed(2)}</strong></Table.Summary.Cell>
                          <Table.Summary.Cell index={3} />
                        </Table.Summary.Row>
                      );
                    }}
                  />
                ),
              },
              {
                key: "monthly",
                label: "Monthly Sales",
                children: (
                  <Table
                    dataSource={monthlyData}
                    columns={[
                      { title: "Month", dataIndex: "month" },
                      { title: "Transactions", dataIndex: "transaction_count" },
                      { title: "Revenue (USD)", dataIndex: "total_usd", render: (v: number) => `$${Number(v).toFixed(2)}` },
                      { title: "Revenue (SSHL)", dataIndex: "total_sos", render: (v: number) => `${Number(v).toLocaleString()} SSHL` },
                    ]}
                    rowKey="month"
                    pagination={false}
                  />
                ),
              },
              {
                key: "by_product",
                label: "Sales per Item",
                children: (
                  <Table
                    dataSource={productData}
                    columns={productColumns}
                    rowKey="product_name"
                    pagination={{ pageSize: 20 }}
                  />
                ),
              },
              {
                key: "by_payment_method",
                label: "By Payment Method",
                children: (
                  <Row gutter={[16, 16]}>
                    {paymentData.map((r) => (
                      <Col xs={24} sm={8} key={r.payment_method}>
                        <Card>
                          <Tag color={PAYMENT_COLORS[r.payment_method] ?? "default"} className="mb-2">
                            {r.payment_method === "cash" ? "💵 Cash" : r.payment_method === "mobile" ? "📱 Mobile" : "💳 Card"}
                          </Tag>
                          <Statistic title="Revenue (USD)" value={Number(r.total_usd)} prefix="$" precision={2} />
                          <div className="text-gray-400 text-xs mt-1">{r.transaction_count} transactions</div>
                        </Card>
                      </Col>
                    ))}
                    {paymentData.length === 0 && <Col span={24}><p className="text-gray-400 text-center py-8">No data. Click Generate.</p></Col>}
                  </Row>
                ),
              },
              {
                key: "by_currency",
                label: "By Currency",
                children: (
                  <Row gutter={[16, 16]}>
                    {currencyData.map((r) => (
                      <Col xs={24} sm={12} key={r.currency}>
                        <Card>
                          <Tag color={r.currency === "USD" ? "green" : "orange"} className="mb-2">
                            {r.currency === "USD" ? "USD Dollar" : "Somaliland Shilling (SSHL)"}
                          </Tag>
                          <Statistic title="Revenue (USD equiv.)" value={Number(r.total_usd)} prefix="$" precision={2} />
                          <div className="text-gray-400 text-xs mt-1">{r.transaction_count} transactions</div>
                        </Card>
                      </Col>
                    ))}
                    {currencyData.length === 0 && <Col span={24}><p className="text-gray-400 text-center py-8">No data. Click Generate.</p></Col>}
                  </Row>
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
