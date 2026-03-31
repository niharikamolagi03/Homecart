# HomeCart - Marketplace Platform

A modern, production-ready marketplace web application built with React, TypeScript, and Tailwind CSS featuring glass morphism UI design.

## 🎨 Features

- **Beautiful Glass Morphism UI** - Modern design with backdrop blur effects and smooth animations
- **Multi-Role Support** - Dedicated dashboards for 5 different user types
- **Fully Responsive** - Mobile-first design that works on all devices
- **Modern Tech Stack** - React, TypeScript, React Router, Motion (Framer Motion), Recharts
- **Production Ready** - Clean code structure with reusable components

## 📱 Pages

### Public Pages
- **Landing Page** - Hero section, features, stats, testimonials
- **Role Selection** - Choose between Customer, Vendor, Shopkeeper, Delivery Partner, or Admin
- **Login** - Authentication with social login options
- **Register** - User registration with role-based fields

### Dashboards
1. **Admin Dashboard** - User management, analytics, activity monitoring
2. **Vendor Dashboard** - Product management, sales tracking, inventory
3. **Shopkeeper Dashboard** - Local inventory, stock alerts, daily operations
4. **Customer Dashboard** - Product browsing, order history, shopping cart
5. **Delivery Dashboard** - Active deliveries, route optimization, earnings

## 🎨 Design System

### Color Palette
- **Primary**: Blue (#3B82F6)
- **Secondary**: Purple (#8B5CF6)
- **Accent**: Cyan (#06B6D4)
- **Backgrounds**: #F8FAFC, #F1F5F9, #EFF6FF
- **Success**: Green (#10B981)
- **Warning**: Orange (#F59E0B)
- **Error**: Red (#EF4444)

### Typography
- **Font Family**: Inter (Google Fonts)
- **Sizes**: H1 (48px), H2 (36px), H3 (24px), Body (16px), Labels (14px)

### Components
- Glass morphism cards with backdrop blur
- Gradient buttons and backgrounds
- Smooth hover animations
- Responsive navigation
- Interactive charts and graphs

## 🚀 Getting Started

The application is ready to run. Navigate through:
1. Start at the landing page (/)
2. Choose your role (/roles)
3. Sign in or register (/login or /register)
4. Access your dashboard based on your role

## 📁 Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── DashboardLayout.tsx    # Shared dashboard layout
│   │   └── ui/                    # Reusable UI components
│   ├── pages/
│   │   ├── Landing.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── RoleSelection.tsx
│   │   ├── NotFound.tsx
│   │   └── dashboards/
│   │       ├── AdminDashboard.tsx
│   │       ├── VendorDashboard.tsx
│   │       ├── ShopkeeperDashboard.tsx
│   │       ├── CustomerDashboard.tsx
│   │       └── DeliveryDashboard.tsx
│   ├── App.tsx
│   └── routes.ts
└── styles/
    ├── fonts.css
    ├── theme.css
    └── tailwind.css
```

## 🛠️ Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Router 7** - Navigation
- **Tailwind CSS 4** - Styling
- **Motion (Framer Motion)** - Animations
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **Radix UI** - Accessible components

## 🎯 Key Features by Role

### Admin
- User analytics and management
- Revenue tracking
- Vendor oversight
- Platform monitoring

### Vendor
- Product catalog management
- Sales analytics
- Inventory tracking
- Order management

### Shopkeeper
- Local inventory management
- Stock alerts
- Quick restocking
- Daily sales tracking

### Customer
- Product browsing
- Order tracking
- Wishlist management
- Personalized recommendations

### Delivery Partner
- Active delivery tracking
- Route optimization
- Earnings dashboard
- Customer ratings

## 📝 Notes

- All authentication flows are frontend-only (ready for backend integration)
- Mock data is used for demonstrations
- All dashboards are fully functional and interactive
- Responsive design works from mobile to desktop (320px - 1440px+)

---

Built with ❤️ for HomeCart
