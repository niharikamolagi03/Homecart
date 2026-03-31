const API_BASE_URL = 'http://127.0.0.1:8000/api';

const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('access_token');
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...options.headers,
  };
  const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(Object.values(data).flat().join(', ') || `HTTP ${res.status}`);
  return data;
};

// Auth
export const registerUser = (data) => apiCall('/auth/register/', { method: 'POST', body: JSON.stringify(data) });
export const loginUser = (data) => apiCall('/auth/login/', { method: 'POST', body: JSON.stringify(data) });
export const logoutUser = (refresh) => apiCall('/auth/logout/', { method: 'POST', body: JSON.stringify({ refresh }) });
export const getProfile = () => apiCall('/auth/profile/');
export const updateProfile = (data) => apiCall('/auth/profile/', { method: 'PATCH', body: JSON.stringify(data) });

// Generic profile fetcher used by dashboards
const getProfileData = async () => { try { return await getProfile(); } catch { return {}; } };
export const getAdminData = getProfileData;
export const getCustomerData = getProfileData;
export const getDeliveryData = getProfileData;
export const getShopkeeperData = getProfileData;
export const getVendorData = getProfileData;

// Categories
export const getCategories = () => apiCall('/categories/');

// Vendor Products
export const getVendorProducts = () => apiCall('/vendor-products/');
export const getMyVendorProducts = () => apiCall('/vendor-products/mine/');
export const createVendorProduct = (formData) => apiCall('/vendor-products/create/', { method: 'POST', body: formData });
export const updateVendorProduct = (id, formData) => apiCall(`/vendor-products/${id}/`, { method: 'PATCH', body: formData });
export const deleteVendorProduct = (id) => apiCall(`/vendor-products/${id}/`, { method: 'DELETE' });

// Shopkeeper Products
export const getShopkeeperProducts = () => apiCall('/shopkeeper-products/');
export const getMyShopkeeperProducts = () => apiCall('/shopkeeper-products/mine/');
export const addToShop = (data) => apiCall('/shopkeeper-products/add/', { method: 'POST', body: JSON.stringify(data) });
export const updateShopkeeperProduct = (id, data) => apiCall(`/shopkeeper-products/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteShopkeeperProduct = (id) => apiCall(`/shopkeeper-products/${id}/`, { method: 'DELETE' });

// Aliases used by dashboards
export const getProducts = getShopkeeperProducts;
export const deleteProduct = deleteShopkeeperProduct;

// Cart
export const getCart = () => apiCall('/cart/');
export const addToCart = (data) => apiCall('/cart/add/', { method: 'POST', body: JSON.stringify(data) });
export const updateCartItem = (id, data) => apiCall(`/cart/update/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
export const removeFromCart = (id) => apiCall(`/cart/remove/${id}/`, { method: 'DELETE' });

// Orders
export const getOrders = () => apiCall('/orders/');
export const getOrder = (id) => apiCall(`/orders/${id}/`);
export const placeOrder = (data) => apiCall('/orders/place/', { method: 'POST', body: JSON.stringify(data) });
export const updateOrderStatus = (id, data) => apiCall(`/orders/${id}/update-status/`, { method: 'PATCH', body: JSON.stringify(data) });
export const cancelOrder = (id) => apiCall(`/orders/${id}/cancel/`, { method: 'DELETE' });
export const getVendorRevenue = () => apiCall('/orders/vendor-revenue/');

// Delivery
export const getDeliveryAssignments = () => apiCall('/delivery/assignments/');
export const assignDelivery = (data) => apiCall('/delivery/assign/', { method: 'POST', body: JSON.stringify(data) });
export const updateDeliveryStatus = (id, data) => apiCall(`/delivery/update/${id}/`, { method: 'POST', body: JSON.stringify(data) });
export const updateDeliveryLocation = (lat, lng) => apiCall('/delivery/location/update/', { method: 'POST', body: JSON.stringify({ latitude: lat, longitude: lng }) });

// Admin approval
export const getPendingUsers = () => apiCall('/users/pending/');
export const approveUser = (id) => apiCall(`/users/${id}/approve/`, { method: 'POST' });
export const rejectUser = (id) => apiCall(`/users/${id}/reject/`, { method: 'POST' });

// Purchase Requests
export const createPurchaseRequest = (data) => apiCall('/purchase-requests/', { method: 'POST', body: JSON.stringify(data) });
export const getMyPurchaseRequests = () => apiCall('/purchase-requests/mine/');
export const getVendorPurchaseRequests = () => apiCall('/purchase-requests/vendor/');
export const approvePurchaseRequest = (id) => apiCall(`/purchase-requests/${id}/approve/`, { method: 'POST' });
export const rejectPurchaseRequest = (id) => apiCall(`/purchase-requests/${id}/reject/`, { method: 'POST' });
export const setSellingPrice = (id, data) => apiCall(`/shopkeeper-products/${id}/set-price/`, { method: 'PATCH', body: JSON.stringify(data) });
export const getPendingSetupProducts = () => apiCall('/purchase-requests/pending-setup/');

// Admin reset
export const resetMarketplaceData = () => apiCall('/admin/reset/', { method: 'DELETE' });

// Notifications
export const getNotifications = () => apiCall('/notifications/');
export const markNotificationsRead = () => apiCall('/notifications/read/', { method: 'POST' });

// Billing
export const getMyBilling = () => apiCall('/billing/');
export const makePayment = (id, amount) => apiCall(`/billing/${id}/pay/`, { method: 'POST', body: JSON.stringify({ amount }) });
export const getVendorBilling = () => apiCall('/billing/vendor/');
export const getVendorRevenueSummary = () => apiCall('/billing/vendor/summary/');
// Bug 3: real-time stock polling
export const getVendorStock = () => apiCall('/vendor-products/stock/');
