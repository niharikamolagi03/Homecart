import { Navigate } from "react-router";
import React from "react";

interface Props {
  role: string;
  component: React.ComponentType;
}

// Used as JSX: <ProtectedRoute role="ADMIN" component={AdminDashboard} />
export default function ProtectedRoute({ role, component: Component }: Props) {
  const token = localStorage.getItem("access_token");
  const userStr = localStorage.getItem("user");

  if (!token || !userStr) {
    return <Navigate to={`/login/${role.toLowerCase()}`} replace />;
  }

  let user: any;
  try {
    user = JSON.parse(userStr);
  } catch {
    localStorage.clear();
    return <Navigate to={`/login/${role.toLowerCase()}`} replace />;
  }

  if (user.role !== role) {
    return <Navigate to={`/login/${user.role?.toLowerCase() || role.toLowerCase()}`} replace />;
  }

  return <Component />;
}
