# 🟣 mart-admin — Admin & Delivery Panel

A complete React + Vite + Tailwind admin panel for Mart management system.

## 🚀 Quick Start

```bash
npm install
npm run dev
```
Runs on **http://localhost:5174**

## 🔗 Backend Connection
All API calls target `http://localhost:5000/api`

Make sure backend CORS allows: `http://localhost:5173` and `http://localhost:5174`

## 👤 Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@mart.com | admin123 |
| Delivery | delivery@mart.com | delivery123 |

## 📦 Features

### Admin Panel
- ✅ Dashboard with charts & statistics
- ✅ Category & Sub-category management
- ✅ Product management with FIFO batch support
- ✅ Excel/XLSX bulk import with preview
- ✅ Orders management + status updates
- ✅ Assign delivery to orders
- ✅ Supplier master
- ✅ Purchase entry with FIFO batch tracking
- ✅ **POS System** — barcode scan, GST calc, invoice print
- ✅ Reports — Sales, Stock, Purchases + CSV export
- ✅ User management (Admin/SubAdmin/Salesman/Delivery)
- ✅ Settings

### Delivery Panel
- ✅ Delivery dashboard
- ✅ Assigned orders with map address
- ✅ Mark as delivered with notes
- ✅ COD collection tracking

## 🏗️ Project Structure
```
src/
├── AdminPages/       # All admin pages
├── DeliveryPages/    # Delivery boy pages  
├── Components/       # Reusable UI components
├── routes/           # Route guards
├── context/          # Auth context
├── api/              # API layer (axios)
├── App.jsx
└── main.jsx
```

## 🔧 Tech Stack
- React 18 + Vite 5
- Tailwind CSS 3
- React Router v6
- Axios (with JWT interceptors)
- Recharts (dashboard charts)
- React Hot Toast (notifications)
- XLSX (Excel import/export)
