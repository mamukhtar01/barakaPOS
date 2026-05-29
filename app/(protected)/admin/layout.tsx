"use client";

import { useEffect, useState } from "react";
import { Layout, Menu, Typography, Button, Breadcrumb, Space, Drawer } from "antd";
import {
  DashboardOutlined, AppstoreOutlined, TagsOutlined, UserOutlined,
  BarChartOutlined, TeamOutlined, SettingOutlined, ShopOutlined,
  MenuOutlined, LogoutOutlined
} from "@ant-design/icons";
import { useAuth } from "@/components/ClientProvider";
import { useRouter, usePathname } from "next/navigation";

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: "/admin", icon: <DashboardOutlined />, label: "Dashboard" },
  { key: "/admin/products", icon: <AppstoreOutlined />, label: "Products" },
  { key: "/admin/categories", icon: <TagsOutlined />, label: "Categories" },
  { key: "/admin/customers", icon: <UserOutlined />, label: "Customers" },
  { key: "/admin/reports", icon: <BarChartOutlined />, label: "Reports" },
  { key: "/admin/users", icon: <TeamOutlined />, label: "Users" },
  { key: "/admin/settings", icon: <SettingOutlined />, label: "Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/pos");
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "admin") return null;

  const current = menuItems.find((m) => pathname === m.key || (m.key !== "/admin" && pathname.startsWith(m.key)));
  const breadcrumb = current?.label ?? "Admin";

  const SideMenu = (
    <Menu
      mode="inline"
      selectedKeys={[pathname]}
      items={menuItems.map((item) => ({
        ...item,
        onClick: () => { router.push(item.key); setDrawerOpen(false); },
      }))}
      className="border-0 flex-1"
    />
  );

  return (
    <Layout className="min-h-screen">
      {/* Desktop Sidebar */}
      <Sider
        width={220}
        className="hidden md:flex flex-col bg-white shadow-md"
        style={{ position: "fixed", height: "100vh", left: 0, top: 0, overflow: "auto", zIndex: 20 }}
      >
        <div className="flex items-center gap-2 px-4 py-4 border-b">
          <ShopOutlined className="text-green-600 text-xl" />
          <Text strong className="text-green-700">Baraka POS</Text>
        </div>
        {SideMenu}
        <div className="p-3 border-t">
          <Button block icon={<ShopOutlined />} onClick={() => router.push("/pos")}>POS</Button>
          <Button block danger icon={<LogoutOutlined />} onClick={logout} className="mt-2">Logout</Button>
        </div>
      </Sider>

      {/* Mobile Drawer */}
      <Drawer
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size={220}
        styles={{ body: { padding: 0 } }}
        className="md:hidden"
      >
        <div className="flex items-center gap-2 px-4 py-4 border-b">
          <ShopOutlined className="text-green-600 text-xl" />
          <Text strong className="text-green-700">Baraka POS</Text>
        </div>
        {SideMenu}
        <div className="p-3 border-t">
          <Button block icon={<ShopOutlined />} onClick={() => { router.push("/pos"); setDrawerOpen(false); }}>POS</Button>
          <Button block danger icon={<LogoutOutlined />} onClick={logout} className="mt-2">Logout</Button>
        </div>
      </Drawer>

      <Layout className="admin-content-offset">
        <Header className="bg-white shadow-sm flex items-center justify-between px-4 h-14">
          <Space>
            <Button
              icon={<MenuOutlined />}
              onClick={() => setDrawerOpen(true)}
              className="md:hidden"
              type="text"
            />
            <Breadcrumb items={[{ title: "Admin" }, { title: breadcrumb }]} />
          </Space>
          <Text type="secondary" className="text-sm">{user.username}</Text>
        </Header>
        <Content className="p-4 bg-gray-50 min-h-[calc(100vh-56px)]">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
