const API_URL = import.meta.env.VITE_API_URL;

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) throw new Error('No refresh token available');

  const response = await fetch(`${API_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!response.ok) {
    // If refresh fails, clear tokens and redirect to login
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }

  const data = await response.json();
  localStorage.setItem('access_token', data.access);
  return data.access;
};

const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('access_token');
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  let res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  // If unauthorized and we have a token, try refreshing
  if (res.status === 401 && token) {
    try {
      const newToken = await refreshAccessToken();
      // Retry the request with new token
      const newHeaders = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
      };
      res = await fetch(`${API_URL}${endpoint}`, { ...options, headers: newHeaders });
    } catch (refreshError) {
      throw new Error('Session expired. Please login again.');
    }
  }

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

// Reviews
export const getProductReviews = (shopkeeperProductId) => apiCall(`/reviews/?shopkeeper_product=${shopkeeperProductId}`);
export const createReview = (data) => apiCall('/reviews/', { method: 'POST', body: JSON.stringify(data) });
export const getReviewDetail = (id) => apiCall(`/reviews/${id}/`);
export const updateReview = (id, data) => apiCall(`/reviews/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteReview = (id) => apiCall(`/reviews/${id}/`, { method: 'DELETE' });
export const getMyReviews = () => apiCall('/reviews/my/');
export const getProductReviewStats = (shopkeeperProductId) => apiCall(`/reviews/${shopkeeperProductId}/stats/`);
