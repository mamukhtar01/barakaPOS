"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  LogoutOutlined,
  MinusOutlined,
  PlusOutlined,
  PrinterOutlined,
  SearchOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/components/ClientProvider";
import { useRouter } from "next/navigation";
import type { CartItem, Category, Currency, Customer, Product, Sale, SalePaymentStatus } from "@/lib/types";

const { Text } = Typography;

const CURRENCY_OPTIONS: { label: string; value: Currency }[] = [
  { label: "USD ($)", value: "USD" },
  { label: "SSHL", value: "SSHL" },
];

function getProductImage(product: Product) {
  return product.img ?? product.thumbnail_url ?? product.image_url;
}

function normalizeSale(raw: Sale): Sale {
  return {
    ...raw,
    // Legacy rows can still contain SOS and older rows may not have payment_status yet.
    currency: raw.currency === "SOS" ? "SSHL" : raw.currency,
    payment_status: raw.payment_status ?? "paid",
  };
}

export default function POSPage() {
  const { message } = App.useApp();
  const { user, logout } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [recentOrders, setRecentOrders] = useState<Sale[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Sale | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("USD");
  const [exchangeRate, setExchangeRate] = useState(28000);
  const [shopName, setShopName] = useState("Baraka Café");

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [orderAction, setOrderAction] = useState<SalePaymentStatus>("paid");

  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [ordersDrawerOpen, setOrdersDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [customerQuickOpen, setCustomerQuickOpen] = useState(false);

  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [checkoutForm] = Form.useForm();
  const [quickCustomerForm] = Form.useForm();

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    if (!res.ok) return;
    const data = await res.json();
    setCategories(data.categories ?? []);
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    const params = new URLSearchParams({ status: "active" });
    if (selectedCategory) params.set("category_id", String(selectedCategory));
    if (search.trim()) params.set("search", search.trim());

    const res = await fetch(`/api/products?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products ?? []);
    }
    setLoadingProducts(false);
  }, [search, selectedCategory]);

  const fetchCustomers = useCallback(async () => {
    const res = await fetch("/api/customers");
    if (!res.ok) return;
    const data = await res.json();
    setCustomers(data.customers ?? []);
  }, []);

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/settings");
    if (!res.ok) return;
    const data = await res.json();
    if (data.settings?.exchange_rate) setExchangeRate(Number(data.settings.exchange_rate));
    if (data.settings?.shop_name) setShopName(data.settings.shop_name);
  }, []);

  const fetchRecentOrders = useCallback(async () => {
    setLoadingOrders(true);
    const res = await fetch("/api/sales?limit=12");
    if (res.ok) {
      const data = await res.json();
      setRecentOrders((data.sales ?? []).map(normalizeSale));
    }
    setLoadingOrders(false);
  }, []);

  const loadOrderDetails = useCallback(async (id: number) => {
    const res = await fetch(`/api/sales/${id}`);
    if (!res.ok) {
      message.error("Failed to load order details");
      return;
    }
    const data = await res.json();
    setSelectedOrder(normalizeSale(data.sale));
    setOrderDetailsOpen(true);
  }, [message]);

  useEffect(() => {
    void (async () => {
      await Promise.all([fetchCategories(), fetchCustomers(), fetchSettings(), fetchRecentOrders()]);
    })();
  }, [fetchCategories, fetchCustomers, fetchSettings, fetchRecentOrders]);

  useEffect(() => {
    void (async () => {
      await fetchProducts();
    })();
  }, [fetchProducts]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          unit_price_usd: Number(product.sale_price_usd),
          quantity: 1,
          image_url: getProductImage(product) ?? null,
        },
      ];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.product_id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: number) => setCart((prev) => prev.filter((item) => item.product_id !== id));
  const clearCart = () => setCart([]);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const cartTotalUsd = useMemo(
    () => cart.reduce((sum, item) => sum + item.unit_price_usd * item.quantity, 0),
    [cart]
  );
  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers]
  );

  const formatUsd = (usd: number) => `$${usd.toFixed(2)}`;
  const formatSshl = (usd: number, rate = exchangeRate) => `${(usd * rate).toLocaleString()} SSHL`;
  const displayPrice = (usd: number) => (selectedCurrency === "USD" ? formatUsd(usd) : formatSshl(usd));

  const handleCheckout = () => {
    if (cart.length === 0) {
      message.warning("Add items before placing an order");
      return;
    }

    checkoutForm.resetFields();
    checkoutForm.setFieldsValue({
      customer_id: undefined,
      currency: selectedCurrency,
      payment_method: "cash",
      discount: 0,
      notes: "",
    });
    setCheckoutOpen(true);
  };

  const submitOrder = async (status: SalePaymentStatus) => {
    setOrderAction(status);
    await checkoutForm.validateFields();
    checkoutForm.submit();
  };

  const onCheckoutSubmit = async (values: {
    customer_id?: number;
    currency: Currency;
    payment_method: "cash" | "mobile" | "card";
    discount?: number;
    notes?: string;
  }) => {
    setCheckoutLoading(true);

    const rate = values.currency === "SSHL" ? exchangeRate : 1;
    const notes = values.notes?.trim() ? values.notes.trim() : null;

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: values.customer_id ?? null,
          currency: values.currency,
          exchange_rate: rate,
          payment_method: values.payment_method,
          payment_status: orderAction,
          items: cart.map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            unit_price_usd: item.unit_price_usd,
            quantity: item.quantity,
          })),
          discount: Number(values.discount ?? 0),
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        message.error(data.error ?? "Failed to place order");
        return;
      }

      const sale = normalizeSale(data.sale);
      setLastSale(sale);
      setCheckoutOpen(false);
      setCart([]);
      setReceiptOpen(true);
      await fetchRecentOrders();
      message.success(orderAction === "paid" ? "Order completed" : "Order parked as unpaid");
    } catch {
      message.error("Network error while placing order");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const onQuickCreateCustomer = async (values: { name: string; phone?: string }) => {
    const phone = values.phone?.trim() ? values.phone.trim() : null;
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: values.name.trim(), phone }),
    });

    const data = await res.json();
    if (!res.ok) {
      message.error(data.error ?? "Failed to create customer");
      return;
    }

    await fetchCustomers();
    checkoutForm.setFieldValue("customer_id", data.customer.id);
    setCustomerQuickOpen(false);
    quickCustomerForm.resetFields();
    message.success("Customer created");
  };

  const markOrderPaid = async (id: number) => {
    const res = await fetch(`/api/sales/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_status: "paid" }),
    });

    if (!res.ok) {
      const data = await res.json();
      message.error(data.error ?? "Failed to update order status");
      return;
    }

    message.success("Order marked as paid");
    await fetchRecentOrders();
    await loadOrderDetails(id);
  };

  const handlePrint = () => window.print();

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <header className="h-14 bg-green-700 text-white px-3 sm:px-4 flex items-center justify-between">
        <Space>
          <AppstoreOutlined />
          <Text strong className="text-white!">{shopName}</Text>
        </Space>

        <Space size="small">
          <Button
            size="small"
            icon={<ClockCircleOutlined />}
            onClick={() => setOrdersDrawerOpen(true)}
            className="md:hidden"
          />
          <Segmented
            options={CURRENCY_OPTIONS}
            value={selectedCurrency}
            onChange={(value) => setSelectedCurrency(value as Currency)}
          />

          {user?.role === "admin" ? (
            <Button size="small" icon={<SettingOutlined />} ghost onClick={() => router.push("/admin")} />
          ) : null}

          <Button size="small" icon={<LogoutOutlined />} ghost onClick={logout}>
            <span className="hidden sm:inline">{user?.username}</span>
          </Button>
        </Space>
      </header>

      <main className="flex-1 overflow-hidden p-3 sm:p-4">
        <Row gutter={[12, 12]} className="h-full">
          <Col xs={24} lg={16} className="h-full flex flex-col gap-3 overflow-hidden">
            <Card size="small">
              <div className="flex gap-2 flex-wrap">
                <Input
                  prefix={<SearchOutlined />}
                  allowClear
                  placeholder="Search products"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="flex-1 min-w-40"
                />

                <Select
                  allowClear
                  className="w-full sm:w-64"
                  placeholder="Filter category"
                  value={selectedCategory ?? undefined}
                  onChange={(value) => setSelectedCategory(value ?? null)}
                  options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
                />
              </div>
            </Card>

            <Card size="small" className="flex-1 overflow-hidden" styles={{ body: { height: "100%", overflowY: "auto" } }}>
              {loadingProducts ? (
                <div className="py-20 text-center"><Spin /></div>
              ) : products.length === 0 ? (
                <Empty description="No products found" />
              ) : (
                <Row gutter={[10, 10]}>
                  {products.map((product) => {
                    const image = getProductImage(product);
                    return (
                      <Col key={product.id} xs={12} sm={8} md={6}>
                        <Card
                          hoverable
                          size="small"
                          className="h-full"
                          styles={{ body: { padding: 10 } }}
                          onClick={() => addToCart(product)}
                        >
                          {image ? (
                            <Image src={image} alt={`Image of ${product.name}`} preview={false} width="100%" height={84} className="rounded object-cover mb-2" />
                          ) : (
                            <div className="h-21 rounded bg-green-50 flex items-center justify-center mb-2">🍽️</div>
                          )}
                          <Text strong className="block truncate">{product.name}</Text>
                          {product.category_name ? <Text type="secondary" className="text-xs">{product.category_name}</Text> : null}
                          <Text className="text-green-700 block mt-1">{displayPrice(Number(product.sale_price_usd))}</Text>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={8} className="h-full hidden md:flex flex-col gap-3 overflow-hidden">
            <Card title={`Cart (${cartCount})`} size="small" styles={{ body: { paddingTop: 12 } }}>
              <CartPanel
                cart={cart}
                cartCount={cartCount}
                cartTotalUsd={cartTotalUsd}
                displayPrice={displayPrice}
                formatUsd={formatUsd}
                formatSshl={formatSshl}
                updateQty={updateQty}
                removeItem={removeItem}
                clearCart={clearCart}
                onCheckout={handleCheckout}
              />
            </Card>

            <Card
              title="Recent orders"
              size="small"
              className="flex-1 overflow-hidden"
              styles={{ body: { height: "100%", overflowY: "auto" } }}
              extra={<Button size="small" onClick={() => void fetchRecentOrders()}>Refresh</Button>}
            >
              {loadingOrders ? (
                <div className="text-center py-10"><Spin /></div>
              ) : recentOrders.length === 0 ? (
                <Empty description="No recent orders" />
              ) : (
                <div className="space-y-2">
                  {recentOrders.map((order) => (
                    (() => {
                      const customer = order.customer_id ? customerById.get(order.customer_id) : undefined;
                      const customerName = order.customer_name ?? customer?.name ?? "Walk-in";
                      const customerPhone = customer?.phone?.trim() ? customer.phone : "";

                      return (
                    <div
                      key={order.id}
                      className="cursor-pointer border border-gray-200 rounded-md px-3 py-2 flex items-start justify-between gap-3"
                      onClick={() => void loadOrderDetails(order.id)}
                    >
                      <div>
                        <Text strong>{`Order #${order.id} ${customerName} ${customerPhone}`}</Text>
                        <Text className="block text-xs">{new Date(order.created_at).toLocaleString()}</Text>
                        <Text className="block text-xs">{formatUsd(order.total_usd)} / {order.total_sos.toLocaleString()} SSHL</Text>
                      </div>
                      {order.payment_status === "paid" ? <Tag color="green">Paid</Tag> : <Tag color="orange">Unpaid</Tag>}
                    </div>
                      );
                    })()
                  ))}
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </main>

      <div className="md:hidden fixed right-4 bottom-4 z-20">
        <Badge count={cartCount}>
          <Button type="primary" shape="circle" size="large" icon={<ShoppingCartOutlined />} onClick={() => setCartDrawerOpen(true)} />
        </Badge>
      </div>

      <Drawer
        title="Recent orders"
        placement="bottom"
        size="large"
        open={ordersDrawerOpen}
        onClose={() => setOrdersDrawerOpen(false)}
      >
        {loadingOrders ? (
          <div className="text-center py-10"><Spin /></div>
        ) : recentOrders.length === 0 ? (
          <Empty description="No recent orders" />
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              (() => {
                const customer = order.customer_id ? customerById.get(order.customer_id) : undefined;
                const customerName = order.customer_name ?? customer?.name ?? "Walk-in";
                const customerPhone = customer?.phone?.trim() ? customer.phone : "";

                return (
              <div
                key={order.id}
                className="cursor-pointer border border-gray-200 rounded-md px-3 py-2 flex items-start justify-between gap-3"
                onClick={() => {
                  setOrdersDrawerOpen(false);
                  void loadOrderDetails(order.id);
                }}
              >
                <div>
                  <Text strong>{`Order #${order.id} ${customerName} ${customerPhone}`}</Text>
                  <Text className="block text-xs">{formatUsd(order.total_usd)} / {order.total_sos.toLocaleString()} SSHL</Text>
                </div>
                {order.payment_status === "paid" ? <Tag color="green">Paid</Tag> : <Tag color="orange">Unpaid</Tag>}
              </div>
                );
              })()
            ))}
          </div>
        )}
      </Drawer>

      <Drawer
        title={`Cart (${cartCount})`}
        size={560}
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
      >
        <CartPanel
          cart={cart}
          cartCount={cartCount}
          cartTotalUsd={cartTotalUsd}
          displayPrice={displayPrice}
          formatUsd={formatUsd}
          formatSshl={formatSshl}
          updateQty={updateQty}
          removeItem={removeItem}
          clearCart={clearCart}
          onCheckout={() => {
            setCartDrawerOpen(false);
            handleCheckout();
          }}
        />
      </Drawer>

      <Modal
        title="Place order"
        open={checkoutOpen}
        onCancel={() => setCheckoutOpen(false)}
        footer={null}
        width={560}
      >
        <Form form={checkoutForm} layout="vertical" onFinish={onCheckoutSubmit}>
          <div className="p-3 rounded bg-gray-50 mb-3">
            <Text className="block">Subtotal: <strong>{formatUsd(cartTotalUsd)}</strong></Text>
            <Text className="block">Subtotal (SSHL): <strong>{formatSshl(cartTotalUsd)}</strong></Text>
          </div>

          <Form.Item name="customer_id" label="Customer">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Select customer"
              options={customers.map((customer) => ({
                value: customer.id,
                label: `${customer.name}${customer.phone ? ` — ${customer.phone}` : ""}`,
              }))}
            />
          </Form.Item>

          <Button icon={<UserAddOutlined />} className="mb-3" onClick={() => setCustomerQuickOpen(true)}>
            Create new customer
          </Button>

          <Form.Item name="currency" label="Payment currency" rules={[{ required: true }]}>
            <Segmented options={CURRENCY_OPTIONS} block />
          </Form.Item>

          <Form.Item name="payment_method" label="Payment method" rules={[{ required: true }]}>
            <Segmented
              options={[
                { label: "Cash", value: "cash" },
                { label: "Mobile", value: "mobile" },
                { label: "Card", value: "card" },
              ]}
              block
            />
          </Form.Item>

          <Form.Item name="discount" label="Discount (USD)">
            <Space.Compact block className="w-full">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-600">
                $
              </span>
              <InputNumber min={0} max={cartTotalUsd} className="w-full" step={0.5} />
            </Space.Compact>
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional note" />
          </Form.Item>

          <Form.Item noStyle shouldUpdate>
            {() => {
              const currency = checkoutForm.getFieldValue("currency") as Currency;
              const discount = Number(checkoutForm.getFieldValue("discount") ?? 0);
              const finalUsd = Math.max(0, cartTotalUsd - discount);

              return (
                <Card size="small" className="mb-3 bg-green-50">
                  <Text className="block">Collect now: <strong>{currency === "USD" ? formatUsd(finalUsd) : formatSshl(finalUsd)}</strong></Text>
                  <Text type="secondary" className="text-xs">Equivalent: {formatUsd(finalUsd)} / {formatSshl(finalUsd)}</Text>
                </Card>
              );
            }}
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              icon={<ClockCircleOutlined />}
              loading={checkoutLoading && orderAction === "unpaid"}
              onClick={() => void submitOrder("unpaid")}
            >
              Park as unpaid
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={checkoutLoading && orderAction === "paid"}
              onClick={() => void submitOrder("paid")}
            >
              Complete order
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Quick create customer"
        open={customerQuickOpen}
        onCancel={() => setCustomerQuickOpen(false)}
        footer={null}
      >
        <Form form={quickCustomerForm} layout="vertical" onFinish={onQuickCreateCustomer}>
          <Form.Item name="name" label="Customer name" rules={[{ required: true, message: "Name is required" }]}>
            <Input placeholder="Customer name" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="Phone number" />
          </Form.Item>
          <div className="flex gap-2">
            <Button block onClick={() => setCustomerQuickOpen(false)}>Cancel</Button>
            <Button block type="primary" htmlType="submit">Create</Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Order details"
        open={orderDetailsOpen}
        onCancel={() => setOrderDetailsOpen(false)}
        footer={selectedOrder ? [
          selectedOrder.payment_status === "unpaid" ? (
            <Button key="mark-paid" type="primary" onClick={() => void markOrderPaid(selectedOrder.id)}>
              Mark as paid
            </Button>
          ) : null,
          <Button
            key="print"
            icon={<PrinterOutlined />}
            onClick={() => {
              setLastSale(selectedOrder);
              setReceiptOpen(true);
            }}
          >
            Print slip
          </Button>,
        ] : null}
      >
        {selectedOrder ? (
          <div>
            <Space className="mb-2">
              <Tag>{selectedOrder.customer_name ?? "Walk-in"}</Tag>
              {selectedOrder.payment_status === "paid" ? <Tag color="green">Paid</Tag> : <Tag color="orange">Unpaid</Tag>}
            </Space>
            <div className="space-y-2">
              {(selectedOrder.items ?? []).map((item, index) => (
                <div key={`${item.product_id ?? "na"}-${index}`} className="w-full flex justify-between gap-2 border-b border-gray-100 pb-2">
                  <Text>{item.product_name} × {item.quantity}</Text>
                  <Text>{formatUsd(item.subtotal_usd)} / {item.subtotal_sos.toLocaleString()} SSHL</Text>
                </div>
              ))}
            </div>
            <Divider />
            <Text strong>Total: {formatUsd(selectedOrder.total_usd)} / {selectedOrder.total_sos.toLocaleString()} SSHL</Text>
          </div>
        ) : (
          <Empty description="No order selected" />
        )}
      </Modal>

      <Modal
        title="Order slip"
        open={receiptOpen}
        onCancel={() => setReceiptOpen(false)}
        width={400}
        footer={[
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>,
          <Button key="close" onClick={() => setReceiptOpen(false)}>Close</Button>,
        ]}
      >
        {lastSale ? <Receipt sale={lastSale} shopName={shopName} /> : null}
      </Modal>
    </div>
  );
}

function CartPanel({
  cart,
  cartCount,
  cartTotalUsd,
  displayPrice,
  formatUsd,
  formatSshl,
  updateQty,
  removeItem,
  clearCart,
  onCheckout,
}: {
  cart: CartItem[];
  cartCount: number;
  cartTotalUsd: number;
  displayPrice: (usd: number) => string;
  formatUsd: (usd: number) => string;
  formatSshl: (usd: number) => string;
  updateQty: (id: number, delta: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  onCheckout: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Text strong>{cartCount} items</Text>
        <Button size="small" danger disabled={cart.length === 0} onClick={clearCart} icon={<DeleteOutlined />}>
          Clear
        </Button>
      </div>

      {cart.length === 0 ? (
        <Empty description="No items" />
      ) : (
        <div className="space-y-2">
          {cart.map((item) => (
            <div key={item.product_id} className="border border-gray-200 rounded-md px-3 py-2">
              <div className="flex justify-between gap-2">
                <Text strong className="truncate">{item.product_name}</Text>
                <Text>{displayPrice(item.unit_price_usd * item.quantity)}</Text>
              </div>
              <div className="flex items-center justify-between mt-1">
                <Text type="secondary" className="text-xs">{displayPrice(item.unit_price_usd)} each</Text>
                <Space size={4}>
                  <Button size="small" icon={<MinusOutlined />} onClick={() => updateQty(item.product_id, -1)} />
                  <Text>{item.quantity}</Text>
                  <Button size="small" icon={<PlusOutlined />} onClick={() => updateQty(item.product_id, 1)} />
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeItem(item.product_id)} />
                </Space>
              </div>
            </div>
          ))}
        </div>
      )}

      <Divider className="my-2" />

      <Card size="small">
        <Text className="block">Total USD: <strong>{formatUsd(cartTotalUsd)}</strong></Text>
        <Text className="block">Total SSHL: <strong>{formatSshl(cartTotalUsd)}</strong></Text>
      </Card>

      <Button type="primary" block size="large" icon={<DollarOutlined />} disabled={cart.length === 0} onClick={onCheckout}>
        Place order
      </Button>
    </div>
  );
}

function Receipt({ sale, shopName }: { sale: Sale; shopName: string }) {
  return (
    <div id="receipt" className="font-mono text-sm">
      <div className="text-center mb-2">
        <Text strong className="block text-base">{shopName}</Text>
        <Text type="secondary" className="text-xs">Order #{sale.id}</Text>
        <br />
        <Text type="secondary" className="text-xs">{new Date(sale.created_at).toLocaleString()}</Text>
      </div>

      <Divider className="my-2" />

      <div className="flex justify-between mb-1">
        <Text type="secondary">Customer:</Text>
        <Text>{sale.customer_name ?? "Walk-in"}</Text>
      </div>
      <div className="flex justify-between mb-1">
        <Text type="secondary">Cashier:</Text>
        <Text>{sale.cashier_name ?? "-"}</Text>
      </div>
      <div className="flex justify-between mb-1">
        <Text type="secondary">Status:</Text>
        <Text>{sale.payment_status === "paid" ? "Paid" : "Unpaid"}</Text>
      </div>

      <Divider className="my-2" />

      {(sale.items ?? []).map((item, index) => (
        <div key={index} className="mb-1">
          <div className="flex justify-between gap-2">
            <Text>{item.product_name} × {item.quantity}</Text>
            <Text>{`$${item.subtotal_usd.toFixed(2)}`}</Text>
          </div>
          <Text type="secondary" className="text-xs block text-right">{item.subtotal_sos.toLocaleString()} SSHL</Text>
        </div>
      ))}

      <Divider className="my-2" />

      {sale.discount > 0 ? (
        <div className="flex justify-between mb-1">
          <Text>Discount</Text>
          <Text>{`-$${sale.discount.toFixed(2)}`}</Text>
        </div>
      ) : null}

      <div className="flex justify-between mb-1">
        <Text strong>Total (USD)</Text>
        <Text strong>${sale.total_usd.toFixed(2)}</Text>
      </div>
      <div className="flex justify-between mb-1">
        <Text strong>Total (SSHL)</Text>
        <Text strong>{sale.total_sos.toLocaleString()} SSHL</Text>
      </div>
      <Text type="secondary" className="text-xs block">
        Rate: 1 USD = {sale.exchange_rate.toLocaleString()} SSHL
      </Text>

      <Divider className="my-2" />
      <div className="text-center">
        <Text type="secondary" className="text-xs">Thank you for your visit!</Text>
      </div>
    </div>
  );
}
