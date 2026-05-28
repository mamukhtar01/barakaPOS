"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Layout, Button, Input, Badge, Tag, Typography, Space, Divider, Empty,
  Modal, Form, Select, InputNumber, Radio, message, Avatar, Tooltip,
  Drawer, Card, Spin, Row, Col
} from "antd";
import {
  ShoppingCartOutlined, DeleteOutlined, PlusOutlined, MinusOutlined,
  PrinterOutlined, UserOutlined, LogoutOutlined, SettingOutlined,
  SearchOutlined, DollarOutlined, CloseOutlined, CheckOutlined,
  AppstoreOutlined
} from "@ant-design/icons";
import { useAuth } from "@/components/ClientProvider";
import { useRouter } from "next/navigation";
import type { Product, Category, Customer, CartItem, Sale } from "@/lib/types";

const { Header, Content, Sider } = Layout;
const { Text, Title } = Typography;

const CURRENCY_LABELS: Record<string, string> = { USD: "USD $", SOS: "SOS ش" };
const PAYMENT_LABELS: Record<string, string> = { cash: "Cash", mobile: "Mobile Pay", card: "Card" };

export default function POSPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(28000);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [checkoutForm] = Form.useForm();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<"USD" | "SOS">("USD");

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    const params = new URLSearchParams({ status: "active" });
    if (selectedCategory) params.set("category_id", String(selectedCategory));
    if (search) params.set("search", search);
    const res = await fetch(`/api/products?${params}`);
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products);
    }
    setLoadingProducts(false);
  }, [selectedCategory, search]);

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const data = await res.json();
      if (data.settings.exchange_rate) {
        setExchangeRate(Number(data.settings.exchange_rate));
      }
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    const res = await fetch("/api/customers");
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers);
    }
  }, []);

  useEffect(() => { fetchCategories(); fetchSettings(); fetchCustomers(); }, [fetchCategories, fetchSettings, fetchCustomers]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          unit_price_usd: product.sale_price_usd,
          quantity: 1,
          image_url: product.image_url,
        },
      ];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product_id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (id: number) => setCart((prev) => prev.filter((i) => i.product_id !== id));
  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, i) => sum + i.unit_price_usd * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const displayPrice = (usd: number) =>
    selectedCurrency === "USD"
      ? `$${usd.toFixed(2)}`
      : `${(usd * exchangeRate).toLocaleString()} ش`;

  const handleCheckout = () => {
    if (cart.length === 0) { message.warning("Cart is empty"); return; }
    checkoutForm.resetFields();
    checkoutForm.setFieldsValue({ currency: selectedCurrency, payment_method: "cash", discount: 0 });
    setCheckoutOpen(true);
  };

  const onCheckoutSubmit = async (values: {
    currency: "USD" | "SOS";
    payment_method: string;
    customer_id?: number;
    discount?: number;
    notes?: string;
  }) => {
    setCheckoutLoading(true);
    try {
      const rate = values.currency === "SOS" ? exchangeRate : 1;
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: values.customer_id ?? null,
          currency: values.currency,
          exchange_rate: rate,
          payment_method: values.payment_method,
          items: cart.map((i) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            unit_price_usd: i.unit_price_usd,
            quantity: i.quantity,
          })),
          discount: values.discount ?? 0,
          notes: values.notes ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { message.error(data.error ?? "Failed to process sale"); return; }
      setLastSale(data.sale);
      setCheckoutOpen(false);
      clearCart();
      setReceiptOpen(true);
      message.success("Sale completed!");
    } catch {
      message.error("Network error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const shopName = "Baraka Café";

  return (
    <Layout className="h-screen">
      {/* Header */}
      <Header className="flex items-center justify-between px-4 bg-green-700 text-white h-14">
        <Space>
          <AppstoreOutlined className="text-lg" />
          <Text strong className="text-white text-base">{shopName}</Text>
        </Space>
        <Space>
          <Tag color="green" className="text-sm">
            {CURRENCY_LABELS[selectedCurrency]}
          </Tag>
          <Radio.Group
            size="small"
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            buttonStyle="solid"
            className="hidden sm:inline-flex"
          >
            <Radio.Button value="USD">USD</Radio.Button>
            <Radio.Button value="SOS">SOS</Radio.Button>
          </Radio.Group>
          {user?.role === "admin" && (
            <Tooltip title="Admin Panel">
              <Button size="small" icon={<SettingOutlined />} onClick={() => router.push("/admin")} ghost />
            </Tooltip>
          )}
          <Tooltip title={`Signed in as ${user?.username}`}>
            <Button size="small" icon={<LogoutOutlined />} onClick={logout} ghost>
              <span className="hidden sm:inline">{user?.username}</span>
            </Button>
          </Tooltip>
        </Space>
      </Header>

      <Layout>
        {/* Product Area */}
        <Content className="flex flex-col bg-gray-50 overflow-hidden">
          {/* Category + Search Bar */}
          <div className="p-3 bg-white shadow-sm flex gap-2 flex-wrap">
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              className="flex-1 min-w-32"
            />
            <div className="flex gap-1 overflow-x-auto pb-1 flex-nowrap">
              <Button
                size="small"
                type={selectedCategory === null ? "primary" : "default"}
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  size="small"
                  type={selectedCategory === cat.id ? "primary" : "default"}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={selectedCategory === cat.id ? {} : { borderColor: cat.color, color: cat.color }}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {loadingProducts ? (
              <div className="flex justify-center py-16"><Spin size="large" /></div>
            ) : products.length === 0 ? (
              <Empty description="No products found" className="mt-16" />
            ) : (
              <Row gutter={[8, 8]}>
                {products.map((p) => (
                  <Col key={p.id} xs={12} sm={8} md={6} lg={4}>
                    <Card
                      hoverable
                      className="cursor-pointer select-none h-full"
                      bodyStyle={{ padding: "10px" }}
                      onClick={() => addToCart(p)}
                    >
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-full h-20 object-cover rounded mb-2"
                        />
                      ) : (
                        <div className="w-full h-20 rounded mb-2 bg-green-50 flex items-center justify-center text-3xl">
                          🍽️
                        </div>
                      )}
                      <Text strong className="block text-sm leading-tight truncate">{p.name}</Text>
                      {p.category_name && (
                        <Text type="secondary" className="text-xs block">{p.category_name}</Text>
                      )}
                      <Text className="text-green-600 font-semibold text-sm mt-1 block">
                        {displayPrice(p.sale_price_usd)}
                      </Text>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </div>
        </Content>

        {/* Cart — Desktop sidebar */}
        <Sider
          width={320}
          className="hidden md:flex flex-col bg-white shadow-lg"
          style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}
        >
          <CartPanel
            cart={cart}
            cartTotal={cartTotal}
            cartCount={cartCount}
            exchangeRate={exchangeRate}
            selectedCurrency={selectedCurrency}
            displayPrice={displayPrice}
            updateQty={updateQty}
            removeItem={removeItem}
            clearCart={clearCart}
            handleCheckout={handleCheckout}
          />
        </Sider>
      </Layout>

      {/* Cart FAB for mobile */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <Badge count={cartCount} size="small">
          <Button
            type="primary"
            size="large"
            shape="circle"
            icon={<ShoppingCartOutlined />}
            onClick={() => setCartDrawerOpen(true)}
            className="w-14 h-14 shadow-xl"
          />
        </Badge>
      </div>

      {/* Mobile cart drawer */}
      <Drawer
        title={`Cart (${cartCount})`}
        placement="bottom"
        height="80vh"
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        className="md:hidden"
      >
        <CartPanel
          cart={cart}
          cartTotal={cartTotal}
          cartCount={cartCount}
          exchangeRate={exchangeRate}
          selectedCurrency={selectedCurrency}
          displayPrice={displayPrice}
          updateQty={updateQty}
          removeItem={removeItem}
          clearCart={clearCart}
          handleCheckout={() => { setCartDrawerOpen(false); handleCheckout(); }}
        />
      </Drawer>

      {/* Checkout Modal */}
      <Modal
        title="Complete Sale"
        open={checkoutOpen}
        onCancel={() => setCheckoutOpen(false)}
        footer={null}
        width={480}
      >
        <Form form={checkoutForm} onFinish={onCheckoutSubmit} layout="vertical">
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between">
              <Text>Subtotal</Text>
              <Text strong>{displayPrice(cartTotal)}</Text>
            </div>
          </div>

          <Form.Item name="currency" label="Payment Currency" rules={[{ required: true }]}>
            <Radio.Group buttonStyle="solid" className="w-full">
              <Radio.Button value="USD" className="w-1/2 text-center">🇺🇸 USD Dollar</Radio.Button>
              <Radio.Button value="SOS" className="w-1/2 text-center">🇸🇴 Somali Shilling</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="payment_method" label="Payment Method" rules={[{ required: true }]}>
            <Radio.Group buttonStyle="solid" className="w-full">
              <Radio.Button value="cash" className="w-1/3 text-center">💵 Cash</Radio.Button>
              <Radio.Button value="mobile" className="w-1/3 text-center">📱 Mobile</Radio.Button>
              <Radio.Button value="card" className="w-1/3 text-center">💳 Card</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="customer_id" label="Customer (optional)">
            <Select
              placeholder="Select or search customer"
              allowClear
              showSearch
              optionFilterProp="label"
              options={customers.map((c) => ({ value: c.id, label: `${c.name}${c.phone ? ` — ${c.phone}` : ""}` }))}
            />
          </Form.Item>

          <Form.Item name="discount" label="Discount (USD)">
            <InputNumber min={0} max={cartTotal} step={0.5} className="w-full" prefix="$" />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Order notes..." />
          </Form.Item>

          <Form.Item noStyle shouldUpdate>
            {() => {
              const currency = checkoutForm.getFieldValue("currency") as "USD" | "SOS";
              const discount = Number(checkoutForm.getFieldValue("discount") ?? 0);
              const finalUsd = cartTotal - discount;
              const displayTotal = currency === "SOS"
                ? `${(finalUsd * exchangeRate).toLocaleString()} ش`
                : `$${finalUsd.toFixed(2)}`;
              return (
                <div className="p-3 bg-green-50 rounded-lg mb-4">
                  <div className="flex justify-between">
                    <Text strong>Total to Collect:</Text>
                    <Title level={4} className="!mb-0 text-green-700">{displayTotal}</Title>
                  </div>
                  {currency === "SOS" && (
                    <Text type="secondary" className="text-xs">Rate: 1 USD = {exchangeRate.toLocaleString()} SOS</Text>
                  )}
                </div>
              );
            }}
          </Form.Item>

          <div className="flex gap-2">
            <Button block onClick={() => setCheckoutOpen(false)} icon={<CloseOutlined />}>Cancel</Button>
            <Button block type="primary" htmlType="submit" loading={checkoutLoading} icon={<CheckOutlined />}>
              Complete Sale
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        title="Receipt"
        open={receiptOpen}
        onCancel={() => setReceiptOpen(false)}
        footer={[
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
            Print
          </Button>,
          <Button key="close" onClick={() => setReceiptOpen(false)}>
            Close
          </Button>,
        ]}
        width={380}
      >
        {lastSale && <Receipt sale={lastSale} shopName={shopName} />}
      </Modal>
    </Layout>
  );
}

function CartPanel({
  cart, cartTotal, cartCount, selectedCurrency, displayPrice, updateQty, removeItem, clearCart, handleCheckout,
}: {
  cart: CartItem[];
  cartTotal: number;
  cartCount: number;
  exchangeRate: number;
  selectedCurrency: "USD" | "SOS";
  displayPrice: (usd: number) => string;
  updateQty: (id: number, delta: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  handleCheckout: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <Space>
          <ShoppingCartOutlined />
          <Text strong>Cart</Text>
          {cartCount > 0 && <Badge count={cartCount} />}
        </Space>
        {cart.length > 0 && (
          <Button size="small" danger onClick={clearCart} icon={<DeleteOutlined />}>Clear</Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {cart.length === 0 ? (
          <Empty description="Cart is empty" className="mt-8" />
        ) : (
          <div className="space-y-2">
            {cart.map((item) => (
              <div key={item.product_id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                <div className="flex-1 min-w-0">
                  <Text className="text-sm font-medium block truncate">{item.product_name}</Text>
                  <Text type="secondary" className="text-xs">{displayPrice(item.unit_price_usd)} each</Text>
                </div>
                <Space size={4}>
                  <Button size="small" icon={<MinusOutlined />} onClick={() => updateQty(item.product_id, -1)} />
                  <Text className="w-5 text-center">{item.quantity}</Text>
                  <Button size="small" icon={<PlusOutlined />} onClick={() => updateQty(item.product_id, 1)} />
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeItem(item.product_id)} />
                </Space>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t p-3 space-y-2">
        <div className="flex justify-between items-center">
          <Text strong>Total</Text>
          <Title level={4} className="!mb-0 text-green-700">{displayPrice(cartTotal)}</Title>
        </div>
        <Button
          type="primary"
          size="large"
          block
          disabled={cart.length === 0}
          onClick={handleCheckout}
          icon={<DollarOutlined />}
          className="bg-green-600 hover:bg-green-700"
        >
          Checkout ({cartCount} items)
        </Button>
      </div>
    </div>
  );
}

function Receipt({ sale, shopName }: { sale: Sale; shopName: string }) {
  const isUsd = sale.currency === "USD";
  return (
    <div className="font-mono text-sm print:text-xs" id="receipt">
      <div className="text-center mb-3">
        <Text strong className="text-base block">{shopName}</Text>
        <Text type="secondary" className="text-xs">Receipt #{sale.id}</Text>
        <br />
        <Text type="secondary" className="text-xs">{new Date(sale.created_at).toLocaleString()}</Text>
      </div>
      <Divider className="my-2" />
      {sale.customer_name && (
        <div className="flex justify-between mb-1">
          <Text type="secondary">Customer:</Text>
          <Text>{sale.customer_name}</Text>
        </div>
      )}
      <div className="flex justify-between mb-1">
        <Text type="secondary">Cashier:</Text>
        <Text>{sale.cashier_name}</Text>
      </div>
      <div className="flex justify-between mb-1">
        <Text type="secondary">Payment:</Text>
        <Text>{sale.payment_method === "cash" ? "Cash" : sale.payment_method === "mobile" ? "Mobile" : "Card"}</Text>
      </div>
      <Divider className="my-2" />
      {(sale.items ?? []).map((item, i) => (
        <div key={i} className="flex justify-between mb-1">
          <Text className="flex-1">{item.product_name} × {item.quantity}</Text>
          <Text>{isUsd ? `$${item.subtotal_usd.toFixed(2)}` : `${item.subtotal_sos.toLocaleString()} ش`}</Text>
        </div>
      ))}
      <Divider className="my-2" />
      {sale.discount > 0 && (
        <div className="flex justify-between mb-1">
          <Text>Discount</Text>
          <Text type="danger">-${sale.discount.toFixed(2)}</Text>
        </div>
      )}
      <div className="flex justify-between">
        <Text strong>TOTAL</Text>
        <Text strong className="text-base">
          {isUsd ? `$${sale.total_usd.toFixed(2)}` : `${sale.total_sos.toLocaleString()} ش`}
        </Text>
      </div>
      {sale.currency === "SOS" && (
        <Text type="secondary" className="text-xs block mt-1">
          = ${sale.total_usd.toFixed(2)} USD (Rate: {sale.exchange_rate.toLocaleString()})
        </Text>
      )}
      <Divider className="my-2" />
      <div className="text-center">
        <Text type="secondary" className="text-xs">Thank you for your visit!</Text>
      </div>
    </div>
  );
}
