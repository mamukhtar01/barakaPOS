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
  Image as AntImage,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from "antd";
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  DownOutlined,
  DollarOutlined,
  LogoutOutlined,
  MinusOutlined,
  PlusOutlined,
  PrinterOutlined,
  SearchOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  UpOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/components/ClientProvider";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type {
  CartItem,
  Category,
  Currency,
  Customer,
  CustomerCreditGroup,
  Product,
  Sale,
  SalePaymentStatus,
} from "@/lib/types";

const { Text } = Typography;

const CURRENCY_OPTIONS: { label: string; value: Currency }[] = [
  { label: "USD ($)", value: "USD" },
  { label: "SSHL", value: "SSHL" },
];

type CreditKey = number | "none";
const creditKeyOf = (customerId: number | null): CreditKey =>
  customerId ?? "none";

function getProductImage(product: Product) {
  return product.img ?? product.thumbnail_url ?? product.image_url;
}

function normalizeSale(raw: Sale): Sale {
  const rawIsDone = (raw as { is_done?: unknown }).is_done;
  const normalizedIsDone =
    typeof rawIsDone === "boolean"
      ? rawIsDone
      : typeof rawIsDone === "number"
        ? rawIsDone === 1
        : typeof rawIsDone === "string"
          ? rawIsDone === "1" || rawIsDone.toLowerCase() === "true"
          : false;

  return {
    ...raw,
    // Legacy rows can still contain SOS and older rows may not have payment_status yet.
    currency: raw.currency === "SOS" ? "SSHL" : raw.currency,
    payment_status: raw.payment_status ?? "paid",
    is_done: normalizedIsDone,
  };
}

export default function POSPage() {
  const { message } = App.useApp();
  const { user, logout } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderEditProducts, setOrderEditProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [recentOrders, setRecentOrders] = useState<Sale[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [loadingOrderDetailsId, setLoadingOrderDetailsId] = useState<
    number | null
  >(null);
  const [savingOrderItemsId, setSavingOrderItemsId] = useState<number | null>(
    null,
  );
  const [markingDoneOrderId, setMarkingDoneOrderId] = useState<number | null>(
    null,
  );
  const [reopeningOrderId, setReopeningOrderId] = useState<number | null>(null);
  const [orderDetailsById, setOrderDetailsById] = useState<
    Record<number, Sale>
  >({});
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

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
  const [ordersTabKey, setOrdersTabKey] = useState<"pending" | "completed">(
    "pending",
  );
  const [creditDrawerOpen, setCreditDrawerOpen] = useState(false);
  const [creditGroups, setCreditGroups] = useState<CustomerCreditGroup[]>([]);
  const [loadingCredit, setLoadingCredit] = useState(false);
  const [expandedCreditKey, setExpandedCreditKey] = useState<CreditKey | null>(
    null,
  );
  const [creditOrdersByCustomer, setCreditOrdersByCustomer] = useState<
    Record<string, Sale[]>
  >({});
  const [loadingCreditOrdersKey, setLoadingCreditOrdersKey] =
    useState<CreditKey | null>(null);
  const [creditNoteDrafts, setCreditNoteDrafts] = useState<
    Record<number, string>
  >({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTabKey, setCheckoutTabKey] = useState<"checkout" | "details">(
    "checkout",
  );
  const [receiptOpen, setReceiptOpen] = useState(false);
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

  const fetchOrderEditProducts = useCallback(async () => {
    const res = await fetch("/api/products?status=active");
    if (!res.ok) return;
    const data = await res.json();
    setOrderEditProducts(data.products ?? []);
  }, []);

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
    if (data.settings?.exchange_rate)
      setExchangeRate(Number(data.settings.exchange_rate));
    if (data.settings?.shop_name) setShopName(data.settings.shop_name);
  }, []);

  const fetchRecentOrders = useCallback(async () => {
    setLoadingOrders(true);
    const res = await fetch("/api/sales?limit=120");
    if (res.ok) {
      const data = await res.json();
      setRecentOrders((data.sales ?? []).map(normalizeSale));
    }
    setLoadingOrders(false);
  }, []);

  const fetchCreditGroups = useCallback(async () => {
    setLoadingCredit(true);
    const res = await fetch("/api/sales/credit");
    if (res.ok) {
      const data = await res.json();
      setCreditGroups(data.groups ?? []);
    }
    setLoadingCredit(false);
  }, []);

  const fetchCustomerCreditOrders = useCallback(async (key: CreditKey) => {
    setLoadingCreditOrdersKey(key);
    const res = await fetch(
      `/api/sales?status=unpaid&customer_id=${key}&limit=200`,
    );
    if (res.ok) {
      const data = await res.json();
      setCreditOrdersByCustomer((prev) => ({
        ...prev,
        [key]: (data.sales ?? []).map(normalizeSale),
      }));
    }
    setLoadingCreditOrdersKey(null);
  }, []);

  const toggleCreditCustomer = useCallback(
    (key: CreditKey) => {
      if (expandedCreditKey === key) {
        setExpandedCreditKey(null);
        return;
      }
      setExpandedCreditKey(key);
      void fetchCustomerCreditOrders(key);
    },
    [expandedCreditKey, fetchCustomerCreditOrders],
  );

  const fetchOrderDetails = useCallback(
    async (id: number): Promise<Sale | null> => {
      setLoadingOrderDetailsId(id);
      const res = await fetch(`/api/sales/${id}`);
      if (!res.ok) {
        message.error("Failed to load order details");
        setLoadingOrderDetailsId(null);
        return null;
      }
      const data = await res.json();
      const normalizedSale = normalizeSale(data.sale);
      setOrderDetailsById((prev) => ({ ...prev, [id]: normalizedSale }));
      setLoadingOrderDetailsId(null);
      return normalizedSale;
    },
    [message],
  );

  const toggleOrderDetails = useCallback(
    async (id: number) => {
      if (expandedOrderId === id) {
        setExpandedOrderId(null);
        return;
      }

      setExpandedOrderId(id);
      if (!orderDetailsById[id]) {
        await fetchOrderDetails(id);
      }
    },
    [expandedOrderId, orderDetailsById, fetchOrderDetails],
  );

  const closeOrderDetails = useCallback(() => {
    setExpandedOrderId(null);
  }, []);

  useEffect(() => {
    void (async () => {
      await Promise.all([
        fetchCategories(),
        fetchCustomers(),
        fetchSettings(),
        fetchRecentOrders(),
        fetchOrderEditProducts(),
        fetchCreditGroups(),
      ]);
    })();
  }, [
    fetchCategories,
    fetchCustomers,
    fetchSettings,
    fetchRecentOrders,
    fetchOrderEditProducts,
    fetchCreditGroups,
  ]);

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
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
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
        .map((item) =>
          item.product_id === id
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (id: number) =>
    setCart((prev) => prev.filter((item) => item.product_id !== id));
  const clearCart = () => setCart([]);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );
  const cartTotalUsd = useMemo(
    () =>
      cart.reduce((sum, item) => sum + item.unit_price_usd * item.quantity, 0),
    [cart],
  );
  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );
  const pendingRecentOrders = useMemo(
    () => recentOrders.filter((order) => !order.is_done),
    [recentOrders],
  );
  const completedRecentOrders = useMemo(
    () => recentOrders.filter((order) => order.is_done),
    [recentOrders],
  );

  const formatUsd = (usd: number) => `$${usd.toFixed(2)}`;
  const formatSshl = (usd: number, rate = exchangeRate) =>
    `SSHL: ${(usd * rate).toLocaleString()} `;
  const displayPrice = (usd: number) =>
    selectedCurrency === "USD" ? formatUsd(usd) : formatSshl(usd);

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
    setCheckoutTabKey("checkout");
    setCheckoutOpen(true);
  };

  const submitOrder = async (status: SalePaymentStatus) => {
    if (status === "unpaid" && !checkoutForm.getFieldValue("customer_id")) {
      message.warning("Select a customer to park an order as unpaid");
      return;
    }
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

    const rate = exchangeRate;
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
      if (orderAction === "unpaid") await fetchCreditGroups();
      message.success(
        orderAction === "paid" ? "Order completed" : "Order parked as unpaid",
      );
    } catch {
      message.error("Network error while placing order");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const onQuickCreateCustomer = async (values: {
    name: string;
    phone?: string;
  }) => {
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

  const markOrderPaid = async (id: number, notes?: string) => {
    const res = await fetch(`/api/sales/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        notes !== undefined
          ? { payment_status: "paid", notes }
          : { payment_status: "paid" },
      ),
    });

    if (!res.ok) {
      const data = await res.json();
      message.error(data.error ?? "Failed to update order status");
      return;
    }

    message.success("Order marked as paid");
    setCreditNoteDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await fetchRecentOrders();
    await fetchOrderDetails(id);
    await fetchCreditGroups();
    if (expandedCreditKey !== null) {
      await fetchCustomerCreditOrders(expandedCreditKey);
    }
  };

  const markOrderDone = async (id: number) => {
    setMarkingDoneOrderId(id);
    try {
      const res = await fetch(`/api/sales/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_done: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        message.error(data.error ?? "Failed to mark order as done");
        return;
      }

      message.success("Order marked as done");
      await fetchRecentOrders();
      await fetchOrderDetails(id);
    } catch {
      message.error("Network error while marking order as done");
    } finally {
      setMarkingDoneOrderId(null);
    }
  };

  const reopenOrder = async (id: number) => {
    setReopeningOrderId(id);
    try {
      const res = await fetch(`/api/sales/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_done: false }),
      });

      const data = await res.json();
      if (!res.ok) {
        message.error(data.error ?? "Failed to reopen order");
        return;
      }

      message.success("Order reopened");
      await fetchRecentOrders();
      await fetchOrderDetails(id);
    } catch {
      message.error("Network error while reopening order");
    } finally {
      setReopeningOrderId(null);
    }
  };

  const cancelOrder = async (id: number) => {
    const res = await fetch(`/api/sales/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      message.error(data.error ?? "Failed to cancel order");
      return;
    }
    message.success("Order cancelled");
    setRecentOrders((prev) => prev.filter((o) => o.id !== id));
    setOrderDetailsById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setExpandedOrderId(null);
    await fetchCreditGroups();
    if (expandedCreditKey !== null) {
      await fetchCustomerCreditOrders(expandedCreditKey);
    }
  };

  const startEditingOrder = useCallback(
    async (id: number) => {
      const detail = orderDetailsById[id] ?? (await fetchOrderDetails(id));
      if (!detail) return;

      if (detail.payment_status !== "unpaid") {
        message.warning("Only unpaid orders can be updated");
        return;
      }

      const productById = new Map(
        [...orderEditProducts, ...products].map((product) => [
          product.id,
          product,
        ]),
      );

      const nextCart: CartItem[] = (detail.items ?? []).map((item, index) => {
        const fallbackId = -(index + 1);
        const safeProductId = item.product_id ?? fallbackId;
        const sourceProduct = item.product_id
          ? productById.get(item.product_id)
          : undefined;

        return {
          product_id: safeProductId,
          product_name: item.product_name,
          unit_price_usd: Number(item.unit_price_usd),
          quantity: Number(item.quantity),
          image_url: sourceProduct
            ? (getProductImage(sourceProduct) ?? null)
            : null,
        };
      });

      setCart(nextCart);
      setEditingOrderId(id);
      setOrdersDrawerOpen(false);
      message.success(`Order #${id} loaded into cart`);
    },
    [orderDetailsById, fetchOrderDetails, message, orderEditProducts, products],
  );

  const updateUnpaidOrderItems = useCallback(
    async (id: number, nextItems: Sale["items"]) => {
      if (!nextItems || nextItems.length === 0) {
        message.warning("Order must contain at least one item");
        return;
      }

      setSavingOrderItemsId(id);
      const res = await fetch(`/api/sales/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: nextItems.map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price_usd: item.unit_price_usd,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        message.error(data.error ?? "Failed to update order items");
        setSavingOrderItemsId(null);
        return;
      }

      const updatedSale = normalizeSale(data.sale as Sale);
      setOrderDetailsById((prev) => ({ ...prev, [id]: updatedSale }));
      setRecentOrders((prev) =>
        prev.map((order) =>
          order.id === id ? normalizeSale({ ...order, ...updatedSale }) : order,
        ),
      );
      setSavingOrderItemsId(null);
      message.success("Order updated");
    },
    [message],
  );

  const saveEditingOrderFromCart = useCallback(async () => {
    if (!editingOrderId) return;
    if (cart.length === 0) {
      message.warning("Order must contain at least one item");
      return;
    }

    const detail =
      orderDetailsById[editingOrderId] ??
      (await fetchOrderDetails(editingOrderId));
    if (!detail) return;

    const nextItems = cart.map((item) => ({
      id: 0,
      sale_id: editingOrderId,
      product_id: item.product_id > 0 ? item.product_id : null,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price_usd: item.unit_price_usd,
      unit_price_sos: item.unit_price_usd * detail.exchange_rate,
      subtotal_usd: item.unit_price_usd * item.quantity,
      subtotal_sos: item.unit_price_usd * detail.exchange_rate * item.quantity,
    }));

    await updateUnpaidOrderItems(editingOrderId, nextItems);
    setEditingOrderId(null);
    setCart([]);
    await fetchRecentOrders();
  }, [
    editingOrderId,
    cart,
    message,
    orderDetailsById,
    fetchOrderDetails,
    updateUnpaidOrderItems,
    fetchRecentOrders,
  ]);

  const renderOrderItem = (
    order: Sale,
    inMobileDrawer = false,
    enforceCreditRules = false,
  ) => {
    const customer = order.customer_id
      ? customerById.get(order.customer_id)
      : undefined;
    const customerName = order.customer_name ?? customer?.name ?? "Walk-in";
    const customerPhone = customer?.phone?.trim() ? customer.phone : "";
    const cashierName = order.cashier_name?.trim() || "-";
    const detail = orderDetailsById[order.id];
    const isExpanded = expandedOrderId === order.id;
    const isSavingItems = savingOrderItemsId === order.id;
    const isPaid = order.payment_status === "paid";
    const isDone = order.is_done;
    const isMarkingDone = markingDoneOrderId === order.id;
    const isReopening = reopeningOrderId === order.id;
    const rowClassName = isPaid
      ? "border-emerald-300 bg-emerald-50/45"
      : "border-amber-300 bg-amber-50/55";
    const existingNote = orderDetailsById[order.id]?.notes?.trim() ?? "";
    const draftNote = creditNoteDrafts[order.id] ?? existingNote;
    const hasNote = draftNote.trim().length > 0;

    return (
      <div
        key={order.id}
        className={`rounded-lg border px-3 py-3 shadow-sm transition-all ${rowClassName} ${inMobileDrawer ? "mx-auto w-full max-w-3xl" : ""} ${isExpanded ? "ring-2 ring-green-500/30" : ""}`}
      >
        <button
          type="button"
          aria-expanded={isExpanded}
          className="w-full text-left"
          onClick={() => void toggleOrderDetails(order.id)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Text strong className="text-base leading-tight truncate">
                  {`Order #${order.id} ${customerName}${customerPhone ? ` • ${customerPhone}` : ""}`}
                </Text>
                <Tag color={isPaid ? "green" : "orange"}>
                  {isPaid ? "Paid" : "Unpaid"}
                </Tag>
                {isDone ? (
                  <Tag color="blue" icon={<CheckCircleOutlined />}>
                    Completed
                  </Tag>
                ) : null}
                <Text type="secondary" className="text-xs">
                  {isExpanded ? <UpOutlined /> : <DownOutlined />}
                </Text>
              </div>
              <Text type="secondary" className="block text-xs">
                <ClockCircleOutlined className="mr-1" />
                {new Date(order.created_at).toLocaleString([], {
                  year: "2-digit",
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                • by: {cashierName}
              </Text>
            </div>
            <div className="shrink-0 text-right">
              <Text strong className="block text-sm">
                {formatUsd(order.total_usd)}
              </Text>
              <Text type="secondary" className="block text-xs">
                {order.total_sos.toLocaleString()} SSHL
              </Text>
            </div>
          </div>
        </button>

        {isExpanded ? (
          <div className="mt-3 border-t border-black/10 pt-3">
            {loadingOrderDetailsId === order.id ? (
              <div className="py-2">
                <Spin size="small" />
              </div>
            ) : detail ? (
              <>
                <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
                  {detail.payment_status === "unpaid" ? (
                    <Button
                      size="small"
                      loading={isSavingItems}
                      onClick={(event) => {
                        event.stopPropagation();
                        void startEditingOrder(order.id);
                      }}
                    >
                      Update
                    </Button>
                  ) : null}
                  {detail.payment_status === "unpaid" ? (
                    <Button
                      size="small"
                      type="primary"
                      loading={isSavingItems}
                      disabled={enforceCreditRules && !hasNote}
                      title={
                        enforceCreditRules && !hasNote
                          ? "Add a note/remark before marking this order as paid"
                          : undefined
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        void markOrderPaid(
                          order.id,
                          enforceCreditRules ? draftNote.trim() : undefined,
                        );
                      }}
                    >
                      Mark as paid
                    </Button>
                  ) : null}
                  {detail.payment_status === "paid" && !detail.is_done ? (
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      loading={isMarkingDone}
                      onClick={(event) => {
                        event.stopPropagation();
                        void markOrderDone(order.id);
                      }}
                    >
                      Mark done
                    </Button>
                  ) : null}
                  {detail.is_done ? (
                    <Button
                      size="small"
                      loading={isReopening}
                      onClick={(event) => {
                        event.stopPropagation();
                        void reopenOrder(order.id);
                      }}
                    >
                      Reopen
                    </Button>
                  ) : null}
                  {detail.payment_status === "unpaid" && !enforceCreditRules ? (
                    <Popconfirm
                      title="Cancel this order?"
                      description="This will permanently delete the order."
                      onConfirm={() => void cancelOrder(order.id)}
                    >
                      <Button
                        size="small"
                        danger
                        icon={<CloseCircleOutlined />}
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                      >
                        Cancel
                      </Button>
                    </Popconfirm>
                  ) : null}
                  <Button
                    size="small"
                    icon={<PrinterOutlined />}
                    disabled={isSavingItems}
                    onClick={(event) => {
                      event.stopPropagation();
                      setLastSale(detail);
                      setReceiptOpen(true);
                    }}
                  >
                    Print
                  </Button>
                </div>

                {enforceCreditRules && detail.payment_status === "unpaid" ? (
                  <div className="mb-2">
                    <Input.TextArea
                      value={creditNoteDrafts[order.id] ?? existingNote}
                      placeholder="Add a note/remark before marking this order as paid"
                      autoSize={{ minRows: 1, maxRows: 3 }}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        setCreditNoteDrafts((prev) => ({
                          ...prev,
                          [order.id]: event.target.value,
                        }))
                      }
                    />
                  </div>
                ) : detail.notes?.trim() ? (
                  <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                    <Text className="block text-sm text-amber-900">
                      <Text strong>Note:</Text> {detail.notes.trim()}
                    </Text>
                  </div>
                ) : null}

                {(detail.items ?? []).length === 0 ? (
                  <Empty
                    description="No items in this order"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  <div className="space-y-2">
                    {(detail.items ?? []).map((item, index) => (
                      <div
                        key={`${item.product_id ?? "na"}-${index}`}
                        className="w-full flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-black/5 pb-2 text-sm"
                      >
                        <Text>
                          {item.product_name} × {item.quantity}
                        </Text>
                        <Text type="secondary">•</Text>
                        <Text strong>{formatUsd(item.subtotal_usd)}</Text>
                        <Text type="secondary">
                          / {item.subtotal_sos.toLocaleString()} SSHL
                        </Text>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Text type="secondary" className="text-xs">
                No order details available
              </Text>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const handlePrint = () => window.print();

  return (
    <div className="h-dvh overflow-hidden bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-30 h-14 bg-green-700 text-white px-3 sm:px-4 flex items-center justify-between">
        <Space>
          <AppstoreOutlined />
          <Text strong className="text-white!">
            {shopName}
          </Text>
        </Space>

        <Space size="small">
          <Button
            size="small"
            icon={<ClockCircleOutlined />}
            onClick={() => setOrdersDrawerOpen(true)}
          />
          <Badge count={creditGroups.length} size="small" offset={[-4, 4]}>
            <Button
              size="small"
              icon={<CreditCardOutlined />}
              onClick={() => setCreditDrawerOpen(true)}
            />
          </Badge>
          <Segmented
            options={CURRENCY_OPTIONS}
            value={selectedCurrency}
            onChange={(value) => setSelectedCurrency(value as Currency)}
          />

          {user?.role === "admin" ? (
            <Button
              size="small"
              icon={<SettingOutlined />}
              ghost
              onClick={() => router.push("/dashboard/admin")}
            />
          ) : null}

          <Button size="small" icon={<LogoutOutlined />} ghost onClick={logout}>
            <span className="hidden sm:inline">{user?.username}</span>
          </Button>
        </Space>
      </header>

      <main className="flex flex-col flex-1 min-h-0 overflow-hidden scroll-smooth p-3 sm:p-4 md:pb-[42dvh] lg:pb-4">
        <Row
          gutter={[12, 12]}
          className="flex-1 h-full min-h-0 md:overflow-hidden"
        >
          <Col
            xs={24}
            lg={16}
            className="grid h-full min-h-0 grid-rows-[auto,1fr] gap-3 overflow-hidden"
          >
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
                  options={categories.map((cat) => ({
                    value: cat.id,
                    label: cat.name,
                  }))}
                />
              </div>
            </Card>

            <Card
              size="small"
              className="h-full min-h-0"
              styles={{
                body: {
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  minHeight: 0,
                  overflow: "hidden",
                  paddingTop: 12,
                },
              }}
            >
              <div
                className="h-full min-h-0 flex-1 scroll-smooth pr-1"
                style={{
                  overflowY: "auto",
                  height: "100%",
                  minHeight: 0,
                  paddingBottom: 88,
                  scrollPaddingBottom: 88,
                  scrollBehavior: "smooth",
                  WebkitOverflowScrolling: "touch",
                  overscrollBehavior: "contain",
                }}
              >
                {loadingProducts ? (
                  <div className="py-20 text-center">
                    <Spin />
                  </div>
                ) : products.length === 0 ? (
                  <Empty description="No products found" />
                ) : (
                  <Row gutter={[10, 10]} style={{ marginBottom: 0 }}>
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
                              <AntImage
                                src={image}
                                alt={`Image of ${product.name}`}
                                preview={false}
                                width="100%"
                                height={84}
                                className="rounded object-cover mb-2"
                              />
                            ) : (
                              <div className="h-21 rounded bg-green-50 flex items-center justify-center mb-2">
                                🍽️
                              </div>
                            )}
                            <Text strong className="block truncate">
                              {product.name}
                            </Text>
                            {product.category_name ? (
                              <Text type="secondary" className="text-xs">
                                {product.category_name}
                              </Text>
                            ) : null}
                            <Text className="text-green-700 block mt-1">
                              {displayPrice(Number(product.sale_price_usd))}
                            </Text>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                )}
              </div>
            </Card>
          </Col>

          <Col
            xs={24}
            lg={8}
            className="hidden lg:block h-full min-h-0 md:overflow-hidden"
          >
            <div className="hidden lg:flex flex-col gap-3 h-full min-h-0">
              <Card
                title={`Cart (${cartCount})`}
                size="small"
                className="h-full min-h-0"
                styles={{
                  body: {
                    paddingTop: 12,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                    height: "100%",
                  },
                }}
              >
                <CartPanel
                  cart={cart}
                  cartCount={cartCount}
                  cartTotalUsd={cartTotalUsd}
                  editingOrderId={editingOrderId}
                  displayPrice={displayPrice}
                  formatUsd={formatUsd}
                  formatSshl={formatSshl}
                  updateQty={updateQty}
                  removeItem={removeItem}
                  clearCart={clearCart}
                  checkoutLoading={
                    savingOrderItemsId === editingOrderId &&
                    editingOrderId !== null
                  }
                  onCancelEditOrder={() => {
                    setEditingOrderId(null);
                    setCart([]);
                  }}
                  onCheckout={() => {
                    if (editingOrderId) {
                      void saveEditingOrderFromCart();
                      return;
                    }
                    handleCheckout();
                  }}
                />
              </Card>
            </div>
          </Col>
        </Row>
      </main>

      <div className="hidden md:block lg:hidden fixed inset-x-0 bottom-0 z-20 px-3 pb-3">
        <Card
          title={`Cart (${cartCount})`}
          size="small"
          className="shadow-lg"
          styles={{
            body: {
              paddingTop: 12,
              maxHeight: "38dvh",
              display: "flex",
              flexDirection: "column",
              minHeight: 260,
            },
          }}
        >
          <CartPanel
            cart={cart}
            cartCount={cartCount}
            cartTotalUsd={cartTotalUsd}
            editingOrderId={editingOrderId}
            displayPrice={displayPrice}
            formatUsd={formatUsd}
            formatSshl={formatSshl}
            updateQty={updateQty}
            removeItem={removeItem}
            clearCart={clearCart}
            checkoutLoading={
              savingOrderItemsId === editingOrderId && editingOrderId !== null
            }
            onCancelEditOrder={() => {
              setEditingOrderId(null);
              setCart([]);
            }}
            onCheckout={() => {
              if (editingOrderId) {
                void saveEditingOrderFromCart();
                return;
              }
              handleCheckout();
            }}
          />
        </Card>
      </div>

      <div className="md:hidden fixed right-4 bottom-4 z-20">
        <Badge count={cartCount}>
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<ShoppingCartOutlined />}
            onClick={() => setCartDrawerOpen(true)}
          />
        </Badge>
      </div>

      <Drawer
        title="Recent orders"
        placement="bottom"
        size="85%"
        open={ordersDrawerOpen}
        onClose={() => {
          setOrdersDrawerOpen(false);
          closeOrderDetails();
        }}
        styles={{
          body: { display: "flex", flexDirection: "column", minHeight: 0 },
        }}
      >
        <Tabs
          centered
          activeKey={ordersTabKey}
          onChange={(key) => setOrdersTabKey(key as "pending" | "completed")}
          items={[
            {
              key: "pending",
              label: `Pending (${pendingRecentOrders.length})`,
              children: loadingOrders ? (
                <div className="text-center py-10">
                  <Spin />
                </div>
              ) : pendingRecentOrders.length === 0 ? (
                <Empty description="No pending orders" />
              ) : (
                <div
                  className="space-y-2 overflow-y-auto pb-4 max-h-[65dvh]"
                  style={{
                    scrollBehavior: "smooth",
                    WebkitOverflowScrolling: "touch",
                    overscrollBehavior: "contain",
                  }}
                >
                  {pendingRecentOrders.map((order) =>
                    renderOrderItem(order, true),
                  )}
                </div>
              ),
            },
            {
              key: "completed",
              label: `Completed (${completedRecentOrders.length})`,
              children: loadingOrders ? (
                <div className="text-center py-10">
                  <Spin />
                </div>
              ) : completedRecentOrders.length === 0 ? (
                <Empty description="No completed orders" />
              ) : (
                <div
                  className="space-y-2 overflow-y-auto pb-4 max-h-[65dvh]"
                  style={{
                    scrollBehavior: "smooth",
                    WebkitOverflowScrolling: "touch",
                    overscrollBehavior: "contain",
                  }}
                >
                  {completedRecentOrders.map((order) =>
                    renderOrderItem(order, true),
                  )}
                </div>
              ),
            },
          ]}
        />
      </Drawer>

      <Drawer
        title="Unpaid / Credit customers"
        placement="bottom"
        size="85%"
        open={creditDrawerOpen}
        onClose={() => {
          setCreditDrawerOpen(false);
          setExpandedCreditKey(null);
          closeOrderDetails();
        }}
        styles={{
          body: { display: "flex", flexDirection: "column", minHeight: 0 },
        }}
      >
        {loadingCredit ? (
          <div className="text-center py-10">
            <Spin />
          </div>
        ) : creditGroups.length === 0 ? (
          <Empty description="No outstanding customer balances" />
        ) : (
          <div
            className="mx-auto w-full max-w-3xl space-y-3 overflow-y-auto pb-4 max-h-[70dvh]"
            style={{
              scrollBehavior: "smooth",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
            }}
          >
            {creditGroups.map((group) => {
              const key = creditKeyOf(group.customer_id);
              const isExpanded = expandedCreditKey === key;
              const isLoadingOrders = loadingCreditOrdersKey === key;
              const orders = creditOrdersByCustomer[key] ?? [];

              return (
                <Card key={key} size="small">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Text strong className="block truncate">
                        {group.customer_name}
                        {group.customer_phone
                          ? ` • ${group.customer_phone}`
                          : ""}
                      </Text>
                      <Text type="secondary" className="block text-xs">
                        {group.order_count} unpaid order
                        {group.order_count === 1 ? "" : "s"} • outstanding since{" "}
                        {new Date(group.oldest_created_at).toLocaleDateString()}
                      </Text>
                    </div>
                    <div className="shrink-0 text-right">
                      <Text strong className="block text-sm">
                        {formatUsd(group.total_usd)}
                      </Text>
                      <Text type="secondary" className="block text-xs">
                        {group.total_sos.toLocaleString()} SSHL
                      </Text>
                    </div>
                  </div>
                  <Button
                    size="small"
                    className="mt-2"
                    onClick={() => toggleCreditCustomer(key)}
                  >
                    {isExpanded ? "Hide orders" : "View orders"}
                  </Button>

                  {isExpanded ? (
                    <div className="mt-3 space-y-2 border-t border-black/10 pt-3">
                      {isLoadingOrders ? (
                        <Spin size="small" />
                      ) : orders.length === 0 ? (
                        <Empty
                          description="No unpaid orders"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      ) : (
                        orders.map((order) =>
                          renderOrderItem(order, true, true),
                        )
                      )}
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </Drawer>

      <Drawer
        title={`Cart (${cartCount})`}
        size={560}
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        styles={{
          body: { display: "flex", flexDirection: "column", minHeight: 0 },
        }}
      >
        <CartPanel
          cart={cart}
          cartCount={cartCount}
          cartTotalUsd={cartTotalUsd}
          editingOrderId={editingOrderId}
          displayPrice={displayPrice}
          formatUsd={formatUsd}
          formatSshl={formatSshl}
          updateQty={updateQty}
          removeItem={removeItem}
          clearCart={clearCart}
          checkoutLoading={
            savingOrderItemsId === editingOrderId && editingOrderId !== null
          }
          onCancelEditOrder={() => {
            setEditingOrderId(null);
            setCart([]);
          }}
          onCheckout={() => {
            setCartDrawerOpen(false);
            if (editingOrderId) {
              void saveEditingOrderFromCart();
              return;
            }
            handleCheckout();
          }}
        />
      </Drawer>

      <Modal
        title="Place order"
        open={checkoutOpen}
        onCancel={() => {
          setCheckoutOpen(false);
          setCheckoutTabKey("checkout");
        }}
        footer={null}
        width={560}
      >
        <Form form={checkoutForm} layout="vertical" onFinish={onCheckoutSubmit}>
          <Tabs
            activeKey={checkoutTabKey}
            onChange={(key) => setCheckoutTabKey(key as "checkout" | "details")}
            items={[
              {
                key: "checkout",
                label: "Checkout form",
                children: (
                  <>
                    <div className="p-3 rounded bg-gray-50 mb-3">
                      <Text className="block">
                        Subtotal: <strong>{formatUsd(cartTotalUsd)}</strong>
                      </Text>
                      <Text className="block">
                        Subtotal{" "}
                        <strong>{formatSshl(cartTotalUsd)}</strong>
                      </Text>
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

                    <Button
                      icon={<UserAddOutlined />}
                      className="mb-3"
                      onClick={() => setCustomerQuickOpen(true)}
                    >
                      Create new customer
                    </Button>

                    <Form.Item
                      name="currency"
                      label="Payment currency"
                      rules={[{ required: true }]}
                    >
                      <Segmented options={CURRENCY_OPTIONS} block />
                    </Form.Item>

                    <Form.Item
                      name="payment_method"
                      label="Payment method"
                      rules={[{ required: true }]}
                    >
                      <Segmented
                        options={[
                          { label: "Cash", value: "cash" },
                          { label: "Zaad", value: "zaad" },
                          { label: "Edahab", value: "edahab" },
                        ]}
                        block
                      />
                    </Form.Item>

                    <Form.Item name="discount" label="Discount (USD)">
                      <Space.Compact block className="w-full">
                        <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-600">
                          $
                        </span>
                        <InputNumber
                          min={0}
                          max={cartTotalUsd}
                          className="w-full"
                          step={0.5}
                        />
                      </Space.Compact>
                    </Form.Item>

                    <Form.Item name="notes" label="Notes">
                      <Input.TextArea rows={2} placeholder="Optional note" />
                    </Form.Item>

                    <Form.Item noStyle shouldUpdate>
                      {() => {
                        const currency = checkoutForm.getFieldValue(
                          "currency",
                        ) as Currency;
                        const discount = Number(
                          checkoutForm.getFieldValue("discount") ?? 0,
                        );
                        const finalUsd = Math.max(0, cartTotalUsd - discount);

                        return (
                          <Card size="small" className="mb-3 bg-green-50">
                            <Text className="block">
                              Collect now:{" "}
                              <strong>
                                {currency === "USD"
                                  ? formatUsd(finalUsd)
                                  : formatSshl(finalUsd)}
                              </strong>
                            <Divider vertical></Divider>
                              <strong>

                              {formatSshl(finalUsd)}
                              </strong>
                            </Text>
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
                  </>
                ),
              },
              {
                key: "details",
                label: `Order details (${cartCount})`,
                children: (
                  <div className="space-y-3">
                    {cart.length === 0 ? (
                      <Empty
                        description="No items in cart"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    ) : (
                      <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
                        {cart.map((item) => {
                          const lineUsd = item.unit_price_usd * item.quantity;
                          return (
                            <div
                              key={`${item.product_id}-${item.product_name}`}
                              className="rounded border border-black/10 px-3 py-2"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <Text strong className="block truncate">
                                    {item.product_name}
                                  </Text>
                                  <Text
                                    type="secondary"
                                    className="text-xs block"
                                  >
                                    {item.quantity} ×{" "}
                                    {formatUsd(item.unit_price_usd)} (
                                    {formatSshl(item.unit_price_usd)})
                                  </Text>
                                </div>
                                <div className="text-right shrink-0">
                                  <Text strong className="block">
                                    {formatUsd(lineUsd)}
                                  </Text>
                                  <Text type="secondary" className="text-xs">
                                    {formatSshl(lineUsd)}
                                  </Text>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <Card size="small" className="bg-gray-50">
                      <div className="flex items-center justify-between gap-2">
                        <Text>Subtotal (USD)</Text>
                        <Text strong>{formatUsd(cartTotalUsd)}</Text>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Text type="secondary">Subtotal (SSHL)</Text>
                        <Text>{formatSshl(cartTotalUsd)}</Text>
                      </div>
                      <Form.Item noStyle shouldUpdate>
                        {() => {
                          const discount = Number(
                            checkoutForm.getFieldValue("discount") ?? 0,
                          );
                          const finalUsd = Math.max(0, cartTotalUsd - discount);

                          return (
                            <>
                              <Divider className="my-2" />
                              <div className="flex items-center justify-between gap-2">
                                <Text type="secondary">Discount</Text>
                                <Text>
                                  {formatUsd(discount)} / {formatSshl(discount)}
                                </Text>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <Text strong>Total due</Text>
                                <Text strong>
                                  {formatUsd(finalUsd)} / {formatSshl(finalUsd)}
                                </Text>
                              </div>
                            </>
                          );
                        }}
                      </Form.Item>
                    </Card>
                  </div>
                ),
              },
            ]}
          />
        </Form>
      </Modal>

      <Modal
        title="Quick create customer"
        open={customerQuickOpen}
        onCancel={() => setCustomerQuickOpen(false)}
        footer={null}
      >
        <Form
          form={quickCustomerForm}
          layout="vertical"
          onFinish={onQuickCreateCustomer}
        >
          <Form.Item
            name="name"
            label="Customer name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder="Customer name" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Phone"
            rules={[{ required: true, message: "Enter phone" }]}
          >
            <Input placeholder="Phone number" type="number" />
          </Form.Item>
          <div className="flex gap-2">
            <Button block onClick={() => setCustomerQuickOpen(false)}>
              Cancel
            </Button>
            <Button block type="primary" htmlType="submit">
              Create
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Order slip"
        open={receiptOpen}
        onCancel={() => setReceiptOpen(false)}
        width={400}
        footer={[
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handlePrint}
          >
            Print
          </Button>,
          <Button key="close" onClick={() => setReceiptOpen(false)}>
            Close
          </Button>,
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
  editingOrderId,
  displayPrice,
  formatUsd,
  formatSshl,
  updateQty,
  removeItem,
  clearCart,
  checkoutLoading,
  onCancelEditOrder,
  onCheckout,
}: {
  cart: CartItem[];
  cartCount: number;
  cartTotalUsd: number;
  editingOrderId: number | null;
  displayPrice: (usd: number) => string;
  formatUsd: (usd: number) => string;
  formatSshl: (usd: number) => string;
  updateQty: (id: number, delta: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  checkoutLoading: boolean;
  onCancelEditOrder: () => void;
  onCheckout: () => void;
}) {
  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      {editingOrderId ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
          <Text strong>{`Updating Order #${editingOrderId}`}</Text>
          <div>
            <Button
              size="small"
              type="link"
              className="px-0!"
              onClick={onCancelEditOrder}
            >
              Cancel update
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex justify-between items-center">
        <Text strong>{cartCount} items</Text>
        <Button
          size="small"
          danger
          disabled={cart.length === 0}
          onClick={clearCart}
          icon={<DeleteOutlined />}
        >
          Clear
        </Button>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto pr-1 pb-28"
        style={{
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
        }}
      >
        {cart.length === 0 ? (
          <Empty description="No items" />
        ) : (
          <div className="space-y-2">
            {cart.map((item) => (
              <div
                key={item.product_id}
                className="border border-gray-200 rounded-md px-3 py-2"
              >
                <div className="flex justify-between gap-2">
                  <Text strong className="truncate">
                    {item.product_name}
                  </Text>
                  <Text>
                    {displayPrice(item.unit_price_usd * item.quantity)}
                  </Text>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <Text type="secondary" className="text-xs">
                    {displayPrice(item.unit_price_usd)} each
                  </Text>
                  <Space size={4}>
                    <Button
                      size="small"
                      icon={<MinusOutlined />}
                      onClick={() => updateQty(item.product_id, -1)}
                    />
                    <Text>{item.quantity}</Text>
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => updateQty(item.product_id, 1)}
                    />
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeItem(item.product_id)}
                    />
                  </Space>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 mt-auto shrink-0 bg-white pt-2">
        <Divider className="my-2" />

        <Card size="small">
          <Text className="block">
            Total USD: <strong>{formatUsd(cartTotalUsd)}</strong>
          </Text>
          <Text className="block">
            Total SSHL: <strong>{formatSshl(cartTotalUsd)}</strong>
          </Text>
        </Card>

        <Button
          type="primary"
          block
          size="large"
          icon={<DollarOutlined />}
          disabled={cart.length === 0}
          loading={checkoutLoading}
          onClick={onCheckout}
        >
          {editingOrderId ? "Save order updates" : "Place order"}
        </Button>
      </div>
    </div>
  );
}

function Receipt({ sale, shopName }: { sale: Sale; shopName: string }) {
  type ReceiptItem = Sale["items"] extends Array<infer Item> | undefined
    ? Item
    : never;

  const formatReceiptItemLineTotal = (item: ReceiptItem) =>
    sale.currency === "USD"
      ? `$${item.subtotal_usd.toFixed(2)}`
      : `${item.subtotal_sos.toLocaleString()} SSHL`;

  return (
    <div
      id="receipt"
      className="font-mono text-sm text-black font-bold pl-7 pr-2 py-1 [&_.ant-typography]:text-black! [&_.ant-typography]:font-bold!"
      style={{ marginLeft: 12 }}
    >
      <div className="text-center mb-2">
        <Image
          src="/logo.png"
          alt={`${shopName} logo`}
          width={320}
          height={64}
          className="mx-auto mb-2 h-16 w-auto object-contain"
        />
        <Text strong className="block text-lg! uppercase text-red-500! mb-2">
          {shopName}
        </Text>
        <Text type="secondary" className="text-xs">
          Order #{sale.id}
        </Text>
        <br />
        <Text type="secondary" className="text-xs">
          {new Date(sale.created_at).toLocaleString()}
        </Text>
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
            <Text>
              {item.product_name} × {item.quantity}
            </Text>
            <Text>{formatReceiptItemLineTotal(item)}</Text>
          </div>
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

      <Divider className="my-2" />

      <div className="mb-1 flex justify-center gap-8 sm:gap-8 print:gap-8">
        <div className="flex items-center gap-1.5">
          <Text code>ZAAD:</Text>
          <Text>519707</Text>
        </div>
        <div className="flex items-center gap-1.5">
          <Text
            code
            style={{
              color: "red",
            }}
          >
            EDAHAB:
          </Text>
          <Text>760083</Text>
        </div>
      </div>

      <Divider className="my-2" />
      <div className="text-center">
        <Text type="secondary" className="text-xs">
          Thank you for your visit!
        </Text>
      </div>
    </div>
  );
}
