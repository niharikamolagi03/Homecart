 HomeCart - Marketplace Platform
[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#homecart---marketplace-platform)

A modern, production-ready marketplace web application built with React, TypeScript, and Tailwind CSS featuring glass morphism UI design.

## 🎥 Project Demo

[▶️ Watch the HomeCart Demo](https://youtu.be/VctEC76iN6E)

## Features

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#features)

- **Beautiful Glass Morphism UI** - Modern design with backdrop blur effects and smooth animations
- **Multi-Role Support** - Dedicated dashboards for 5 different user types
- **Fully Responsive** - Mobile-first design that works on all devices
- **Modern Tech Stack** - React, TypeScript, React Router, Motion (Framer Motion), Recharts
- **Production Ready** - Clean code structure with reusable components

## Pages

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#pages)

### Public Pages

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#public-pages)

- **Landing Page** - Hero section, features, stats, testimonials
- **Role Selection** - Choose between Customer, Vendor, Shopkeeper, Delivery Partner, or Admin
- **Login** - Authentication with social login options
- **Register** - User registration with role-based fields

### Dashboards

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#dashboards)

1. **Admin Dashboard** - User management, analytics, activity monitoring
2. **Vendor Dashboard** - Product management, sales tracking, inventory
3. **Shopkeeper Dashboard** - Local inventory, stock alerts, daily operations
4. **Customer Dashboard** - Product browsing, order history, shopping cart
5. **Delivery Dashboard** - Active deliveries, route optimization, earnings

## Design System

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#design-system)

### Color Palette

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#color-palette)

- **Primary**: Blue (#3B82F6)
- **Secondary**: Purple (#8B5CF6)
- **Accent**: Cyan (#06B6D4)
- **Backgrounds**: #F8FAFC, #F1F5F9, #EFF6FF
- **Success**: Green (#10B981)
- **Warning**: Orange (#F59E0B)
- **Error**: Red (#EF4444)

### Typography

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#typography)

- **Font Family**: Inter (Google Fonts)
- **Sizes**: H1 (48px), H2 (36px), H3 (24px), Body (16px), Labels (14px)

### Components

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#components)

- Glass morphism cards with backdrop blur
- Gradient buttons and backgrounds
- Smooth hover animations
- Responsive navigation
- Interactive charts and graphs

## Getting Started

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#getting-started)

### Frontend

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#frontend)

```
npm install
npm run dev
```

**svg**

The frontend uses `VITE_API_URL` from `.env.development` (default: `http://127.0.0.1:8000/api`).

### Backend

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#backend)

```
cd local_vendors_marketplace
cp .env.example .env
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**svg**

For production, set `DEBUG=False`, a strong `SECRET_KEY`, the real `ALLOWED_HOSTS`, and the deployed frontend address in `CORS_ALLOWED_ORIGINS`.

## 📁 Project Structure

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#-project-structure)

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

**svg**

## 🛠️ Technologies

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#%EF%B8%8F-technologies)

- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Router 7** - Navigation
- **Tailwind CSS 4** - Styling
- **Motion (Framer Motion)** - Animations
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **Radix UI** - Accessible components

## Key Features by Role

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#key-features-by-role)

### Admin

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#admin)

- User analytics and management
- Revenue tracking
- Vendor oversight
- Platform monitoring

### Vendor

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#vendor)

- Product catalog management
- Sales analytics
- Inventory tracking
- Order management

### Shopkeeper

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#shopkeeper)

- Local inventory management
- Stock alerts
- Quick restocking
- Daily sales tracking

### Customer

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#customer)

- Product browsing
- Order tracking
- Wishlist management
- Personalized recommendations

### Delivery Partner

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#delivery-partner)

- Active delivery tracking
- Route optimization
- Earnings dashboard
- Customer ratings
- New-order notifications with customer address, payment, and total
- Live customer destination and road-route map

## Notes

[svg](https://github.com/niharikamolagi03/Homecart?utm_source=chatgpt.com#notes)

- All authentication flows are frontend-only (ready for backend integration)
- Mock data is used for demonstrations
- All dashboards are fully functional and interactive
- Responsive design works from mobile to desktop (320px - 1440px+)

---

Built with ❤️ for HomeCart 
