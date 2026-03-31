import { createBrowserRouter } from "react-router";
import Landing from "./pages/Landing";
import RoleSelection from "./pages/RoleSelection";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RoleLogin from "./pages/RoleLogin";
import ForgotPassword from "./pages/ForgotPassword";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import VendorDashboard from "./pages/dashboards/VendorDashboard";
import ShopkeeperDashboard from "./pages/dashboards/ShopkeeperDashboard";
import CustomerDashboard from "./pages/dashboards/CustomerDashboard";
import DeliveryDashboard from "./pages/dashboards/DeliveryDashboard";
import NotFound from "./pages/NotFound";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Support from "./pages/Support";
import ProtectedRoute from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/", Component: Landing },
  { path: "/features", Component: Features },
  { path: "/pricing", Component: Pricing },
  { path: "/about", Component: About },
  { path: "/support", Component: Support },
  { path: "/roles", Component: RoleSelection },
  { path: "/login", Component: RoleLogin },
  { path: "/login/:role", Component: RoleLogin },
  { path: "/register", Component: Register },
  { path: "/forgot-password", Component: ForgotPassword },
  {
    path: "/dashboard/admin",
    element: <ProtectedRoute role="ADMIN" component={AdminDashboard} />,
  },
  {
    path: "/dashboard/vendor",
    element: <ProtectedRoute role="VENDOR" component={VendorDashboard} />,
  },
  {
    path: "/dashboard/shopkeeper",
    element: <ProtectedRoute role="SHOPKEEPER" component={ShopkeeperDashboard} />,
  },
  {
    path: "/dashboard/customer",
    element: <ProtectedRoute role="CUSTOMER" component={CustomerDashboard} />,
  },
  {
    path: "/dashboard/delivery",
    element: <ProtectedRoute role="DELIVERY" component={DeliveryDashboard} />,
  },
  { path: "*", Component: NotFound },
]);
