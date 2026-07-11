# LMS-EDU Frontend

Beautiful and responsive Next.js frontend for the LMS-EDU ed-tech platform.

## 🚀 Features

- **Beautiful Landing Page** with integrated login/register
- **Responsive Design** - Mobile first approach with Tailwind CSS
- **Authentication** - Context-based auth with localStorage persistence
- **Dashboard** - Parent dashboard with student management and enrollments
- **Modern UI** - Smooth animations and gradient designs
- **API Integration** - Ready to connect with Laravel backend

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn

## 🛠️ Installation

```bash
cd frontend
npm install
```

## 🚀 Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   ├── globals.css         # Global styles
│   ├── context/
│   │   └── AuthContext.tsx # Authentication context
│   ├── components/
│   │   ├── Navigation.tsx  # Navigation bar
│   │   └── LoginModal.tsx  # Login/Register modal
│   ├── dashboard/
│   │   └── page.tsx        # Dashboard page
│   ├── search/
│   │   └── page.tsx        # Class search page (TO BUILD)
│   ├── cart/
│   │   └── page.tsx        # Cart page (TO BUILD)
│   ├── checkout/
│   │   └── page.tsx        # Checkout page (TO BUILD)
│   └── thank-you/
│       └── page.tsx        # Thank you page (TO BUILD)
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
├── postcss.config.js
└── .env.local
```

## 🔐 Authentication

The app uses a custom Auth Context for state management:

```typescript
const { user, isAuthenticated, login, register, logout, error, isLoading } = useAuth();
```

Token and user data are stored in localStorage.

## 🎨 Styling

- **Tailwind CSS** for utility-first styling
- **Custom components** with @layer directives
- **Color scheme**: 
  - Primary: #0066FF (Blue)
  - Secondary: #FF6B35 (Orange)
  - Accent: #FFB627 (Yellow)
  - Dark: #1A1A2E

## 🔗 API Integration

The app is configured to connect with the Laravel backend at:

```
NEXT_PUBLIC_API_URL=http://localhost:8002/api
```

Update this in `.env.local` if your backend runs on a different port.

### Auth Endpoints Used:
- `POST /auth/login` - Parent login
- `POST /auth/register` - Parent registration
- `GET /auth/me` - Get current user (to implement)

## 📱 Pages

### Landing Page (/)
- Hero section with CTA
- Features showcase
- Courses overview
- Integrated login/register modal
- Responsive footer

### Dashboard (/dashboard)
- Welcome message
- Quick action cards
- Steps to get started
- Links to manage students and search classes

### More Pages (To be built):
- `/search` - Class search and filtering
- `/cart` - Shopping cart
- `/checkout` - Payment processing
- `/thank-you` - Enrollment confirmation

## 🚨 Demo Credentials

For testing the login:
- Email: `parent@example.com`
- Password: `Password123!`

## 🎯 Next Steps

1. Build class search page with filtering
2. Build cart system
3. Build checkout with payment integration
4. Build student management
5. Build enrollments view

## 📝 Configuration

Update `.env.local` to match your backend:

```env
NEXT_PUBLIC_API_URL=http://localhost:8002/api
```

## 🤝 Contributing

Follow these conventions:
- Use TypeScript for all components
- Use Tailwind CSS for styling (no inline styles)
- Use React hooks and context API
- Follow the folder structure

## 📜 License

All rights reserved © 2026 LMS-EDU
