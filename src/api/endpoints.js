import API from './axios'

// Auth
export const login = (data) => API.post('/auth/login', data)
export const getMe = () => API.get('/auth/me')

// Dashboard
export const getDashboardStats = () => API.get('/admin/dashboard')

// Categories
export const getCategories = () => API.get('/categories')
export const createCategory = (data) => API.post('/categories', data)
export const updateCategory = (id, data) => API.put(`/categories/${id}`, data)
export const deleteCategory = (id) => API.delete(`/categories/${id}`)

// Sub-categories
export const getSubCategories = (catId) => API.get('/categories/subcategory', { params: { category_id: catId || undefined } })
export const createSubCategory = (data) => API.post('/categories/subcategory', data)
export const updateSubCategory = (id, data) => API.put(`/categories/subcategory/${id}`, data)
export const deleteSubCategory = (id) => API.delete(`/categories/subcategory/${id}`)

// Products
export const getProducts = (params) => API.get('/products', { params })
export const getProduct = (id) => API.get(`/products/${id}`)
export const createProduct = (data) => API.post('/products', data)
export const updateProduct = (id, data) => API.put(`/products/${id}`, data)
export const deleteProduct = (id) => API.delete(`/products/${id}`)
export const deleteProductsBulk = (ids) => API.delete('/products/bulk', { data: { ids } })
export const importProducts = (data) => API.post('/products/import', data)

// Orders
export const getOrders = (params) => API.get('/orders/all', { params })
export const getOrder = (id) => API.get(`/orders/${id}`)
export const updateOrderStatus = (id, data) => API.put(`/orders/${id}/status`, data)
export const cancelOrder = (id, data = {}) => API.post(`/orders/${id}/cancel`, data)
export const assignDelivery = (id, data) => API.put(`/orders/${id}/assign-delivery`, data)

// Customer commerce data
export const getCustomerCart = (userId) => API.get('/cart', { params: { user_id: userId } })
export const getCustomerAddresses = (userId) => API.get('/addresses', { params: { user_id: userId } })
export const getCustomerWishlist = (userId) => API.get('/wishlist', { params: { user_id: userId } })

// Delivery
export const getDeliveryBoys = () => API.get('/users?role=delivery')
export const getDeliveryOrders = () => API.get('/orders/all', { params: { assigned_to_me: 1 } })
export const markDelivered = (id, data = {}) => API.put(`/orders/${id}/status`, {
	status: 'delivered',
	...data,
})

// Suppliers
export const getSuppliers = () => API.get('/purchases/suppliers')
export const createSupplier = (data) => API.post('/purchases/suppliers', data)
export const updateSupplier = (id, data) => API.put(`/purchases/suppliers/${id}`, data)
export const deleteSupplier = (id) => API.delete(`/purchases/suppliers/${id}`)

// Purchases
export const getPurchases = () => API.get('/purchases/invoices')
export const getPurchasesList = (params) => API.get('/purchases/invoices/list', { params })
export const createPurchase = (data) => API.post('/purchases/invoices', data)
export const createPurchaseEntry = (data) => API.post('/purchases/entry', data)

// POS
export const createPOSSale = (data) => API.post('/pos/bill', data)
export const getPOSProducts = (params) => API.get('/products', { params })

// Reports
export const getSalesReport = (params) => API.get('/reports/monthly-sales', { params })
export const getStockReport = () => API.get('/reports/stock')
export const getPurchaseReport = (params) => API.get('/reports/profit', { params })
export const getDailyClosingReport = (params) => API.get('/reports/daily-closing', { params })
export const getExpenseEntries = (params) => API.get('/reports/expenses', { params })
export const addExpenseEntry = (data) => API.post('/reports/expenses', data)
export const getReorderSuggestions = (params) => API.get('/reports/reorder-suggestions', { params })

// Inventory Adjustments
export const getInventoryAdjustments = (params) => API.get('/inventory/adjustments', { params })
export const createInventoryAdjustment = (data) => API.post('/inventory/adjustments', data)

// Users
export const getUsers = (params) => API.get('/users', { params })
export const createUser = (data) => API.post('/users', data)
export const updateUser = (id, data) => API.put(`/users/${id}`, data)
export const deleteUser = (id) => API.delete(`/users/${id}`)

// Settings
export const getPublicSettings = () => API.get('/settings/public')
export const getSettings = () => API.get('/settings')
export const updateSettings = (data) => API.put('/settings', data)
export const downloadBackup = () => API.get('/settings/backup', { responseType: 'blob' })
