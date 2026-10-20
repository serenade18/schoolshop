import type { ComponentType } from "react"
import { createBrowserRouter } from "react-router"

import { DashboardLayout, type DashboardNavItem } from "@/components/layout/DashboardLayout"
import { ParentLayout } from "@/components/layout/ParentLayout"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { RequireRole } from "@/components/layout/RequireRole"
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage"
import { RegisterOrganisationPage } from "@/pages/auth/RegisterOrganisationPage"
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage"
import { SignInPage } from "@/pages/auth/SignInPage"
import { SignUpPage } from "@/pages/auth/SignUpPage"
import { ComingSoonPage } from "@/pages/ComingSoonPage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { HomePage } from "@/pages/public/HomePage"
import { SchoolPage } from "@/pages/public/SchoolPage"
import { SchoolsPage } from "@/pages/public/SchoolsPage"
import { ShopPage } from "@/pages/public/ShopPage"

/** Route-level code splitting: each role's pages load only when visited. */
function page<M extends Record<string, ComponentType>>(load: () => Promise<M>, name: keyof M) {
  return async () => ({ Component: (await load())[name] })
}

const schoolNav: DashboardNavItem[] = [
  { to: "/school", label: "Overview", end: true },
  { to: "/school/booklists", label: "Booklists" },
  { to: "/school/orders", label: "Parent orders" },
  { to: "/school/deliveries", label: "Deliveries" },
  { to: "/school/collection", label: "Collection" },
  { to: "/school/students", label: "Classes & students" },
  { to: "/school/settings", label: "Settings" },
]

const publisherNav: DashboardNavItem[] = [
  { to: "/publisher", label: "School orders", end: true },
  { to: "/publisher/catalog", label: "Catalog & stock" },
  { to: "/publisher/dispatches", label: "Dispatches" },
  { to: "/publisher/payouts", label: "Payouts" },
  { to: "/publisher/settings", label: "Settings" },
]

const adminNav: DashboardNavItem[] = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/organisations", label: "Schools & publishers", badge: 5 },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/payments", label: "Payments & payouts" },
  { to: "/admin/refunds", label: "Refunds & disputes" },
  { to: "/admin/users", label: "Users & roles" },
  { to: "/admin/catalog", label: "Catalog review" },
  { to: "/admin/settings", label: "Fees & settings" },
  { to: "/admin/audit", label: "Audit log" },
]

/** Placeholder routes for every nav entry that isn't built yet (index routes are handled separately). */
const comingSoon = (nav: DashboardNavItem[], base: string) =>
  nav.filter((n) => !n.end).map((n) => ({ path: n.to.slice(base.length + 1), element: <ComingSoonPage title={n.label} /> }))

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "shop", element: <ShopPage /> },
      { path: "schools", element: <SchoolsPage /> },
      { path: "for-schools", lazy: page(() => import("@/pages/public/ForSchoolsPage"), "ForSchoolsPage") },
      { path: "for-publishers", lazy: page(() => import("@/pages/public/ForPublishersPage"), "ForPublishersPage") },
      { path: "shop/:productId", lazy: page(() => import("@/pages/public/ProductPage"), "ProductPage") },
      { path: "schools/:slug", element: <SchoolPage /> },
    ],
  },
  { path: "sign-in", element: <SignInPage /> },
  { path: "sign-up", element: <SignUpPage /> },
  { path: "forgot-password", element: <ForgotPasswordPage /> },
  { path: "reset-password", element: <ResetPasswordPage /> },
  { path: "register", element: <RegisterOrganisationPage /> },
  {
    path: "parent",
    element: <RequireRole roles={["parent"]} />,
    children: [
      {
        element: <ParentLayout />,
        children: [
          { index: true, lazy: page(() => import("@/pages/parent/ParentHomePage"), "ParentHomePage") },
          { path: "lists/:booklistId", lazy: page(() => import("@/pages/parent/BooklistPage"), "BooklistPage") },
          { path: "checkout", lazy: page(() => import("@/pages/parent/CheckoutPage"), "CheckoutPage") },
          { path: "orders", lazy: page(() => import("@/pages/parent/OrdersPage"), "OrdersPage") },
          { path: "orders/:orderId", lazy: page(() => import("@/pages/parent/OrderPage"), "OrderPage") },
          { path: "orders/:orderId/payments/:paymentId", lazy: page(() => import("@/pages/parent/PaymentPage"), "PaymentPage") },
          { path: "children", element: <ComingSoonPage title="Children" /> },
          { path: "account", element: <ComingSoonPage title="Account" /> },
        ],
      },
    ],
  },
  {
    path: "school",
    element: <RequireRole roles={["school_admin", "teacher"]} />,
    children: [
      {
        element: <DashboardLayout nav={schoolNav} orgLabel="School admin" />,
        children: [
          { index: true, lazy: page(() => import("@/pages/school/SchoolOverviewPage"), "SchoolOverviewPage") },
          { path: "orders", lazy: page(() => import("@/pages/school/SchoolOrdersPage"), "SchoolOrdersPage") },
          { path: "deliveries", lazy: page(() => import("@/pages/school/SchoolDeliveriesPage"), "SchoolDeliveriesPage") },
          { path: "deliveries/:id", lazy: page(() => import("@/pages/school/SchoolReceiveDeliveryPage"), "SchoolReceiveDeliveryPage") },
          ...comingSoon(schoolNav.filter((n) => !["/school/orders", "/school/deliveries"].includes(n.to)), "/school"),
        ],
      },
    ],
  },
  {
    path: "publisher",
    element: <RequireRole roles={["publisher"]} />,
    children: [
      {
        element: <DashboardLayout nav={publisherNav} tone="dark" tag="PUBLISHER" />,
        children: [
          { index: true, lazy: page(() => import("@/pages/publisher/PublisherOrdersPage"), "PublisherOrdersPage") },
          { path: "catalog", lazy: page(() => import("@/pages/publisher/PublisherCatalogPage"), "PublisherCatalogPage") },
          { path: "dispatches", lazy: page(() => import("@/pages/publisher/PublisherDispatchesPage"), "PublisherDispatchesPage") },
          { path: "payouts", lazy: page(() => import("@/pages/publisher/PublisherPayoutsPage"), "PublisherPayoutsPage") },
          { path: "settings", lazy: page(() => import("@/pages/publisher/PublisherSettingsPage"), "PublisherSettingsPage") },
        ],
      },
    ],
  },
  {
    path: "admin",
    element: <RequireRole roles={["platform_admin"]} />,
    children: [
      {
        element: <DashboardLayout nav={adminNav} tone="dark" tag="ADMIN" />,
        children: [{ index: true, lazy: page(() => import("@/pages/admin/AdminOverviewPage"), "AdminOverviewPage") }, ...comingSoon(adminNav, "/admin")],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
])
