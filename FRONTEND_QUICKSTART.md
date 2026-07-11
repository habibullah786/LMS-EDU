# LMS-EDU Frontend - Quick Start Guide

## ✅ What's Been Built

### 1. **Beautiful Landing Page**
   - Modern gradient hero section with animated backgrounds
   - Feature showcase with 6 key benefits
   - Courses overview (Coding & Robotics)
   - Professional footer
   - Fully responsive mobile design

### 2. **Integrated Login & Register**
   - Two-tab modal (Login | Register)
   - Real-time validation
   - Demo credentials built-in for testing
   - Beautiful error handling
   - Auto-redirect to dashboard

### 3. **Authentication System**
   - React Context-based auth management
   - Persistent tokens in localStorage
   - useAuth() hook for easy state access
   - Token management for API calls

### 4. **Dashboard Page**
   - Parent welcome message
   - Quick action cards
   - Step-by-step guide
   - Links to key features

### 5. **Professional UI Components**
   - Tailwind CSS utilities
   - Smooth animations
   - Loading spinners
   - Responsive navigation
   - Error/success messages

---

## 🚀 Getting Started

### Prerequisites
```bash
Node.js 18+ installed
npm or yarn
```

### 1. Install Dependencies
```bash
cd /Users/habib/Desktop/LMS-EDU/frontend
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

Open: **http://localhost:3000**

### 3. Test Login (Demo Credentials)
- **Email**: parent@example.com
- **Password**: Password123!

---

## 📁 Frontend Structure

```
frontend/
├── app/
│   ├── page.tsx                   ← Landing page (HOME)
│   ├── layout.tsx                 ← Root layout with providers
│   ├── globals.css                ← Tailwind + custom styles
│   ├── dashboard/page.tsx         ← Dashboard (after login)
│   ├── context/
│   │   └── AuthContext.tsx        ← Authentication state
│   └── components/
│       ├── Navigation.tsx         ← Top navbar
│       └── LoginModal.tsx         ← Login/Register form
├── package.json
├── tailwind.config.js
├── .env.local                     ← API configuration
└── README.md
```

---

## 🎨 Design Highlights

### Color Scheme
- **Primary Blue**: #0066FF
- **Secondary Orange**: #FF6B35
- **Accent Yellow**: #FFB627

### Key Features
- ✅ Mobile-first responsive design
- ✅ Smooth animations & transitions
- ✅ Loading states with spinners
- ✅ Clean error messages
- ✅ Gradient backgrounds
- ✅ Hover effects

---

## 🔐 How Authentication Works

### Flow:
1. User fills login/register form
2. Form validates client-side
3. Credentials sent to Laravel API
4. Backend validates & returns token
5. Token stored in localStorage
6. User redirected to dashboard
7. Auth context persists state

### Usage:
```tsx
import { useAuth } from '@/app/context/AuthContext';

export default function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please login</div>;
  }
  
  return <div>Welcome {user.name}!</div>;
}
```

---

## 🔗 API Integration

The app is configured to call the Laravel backend at:

```
http://localhost:8000/api
```

Config file: `frontend/.env.local`

### Endpoints Used (So Far):
- `POST /auth/login`
- `POST /auth/register`

### To Add More Endpoints:
1. Create API service functions
2. Import `useAuth()` hook for token
3. Call endpoint with Authorization header

---

## 📋 Frontend Pages Checklist

- [x] **Landing Page** (/) - Complete with login modal
- [x] **Dashboard** (/dashboard) - Quick actions & guide
- [ ] **Search Classes** (/search) - Filter & browse
- [ ] **Cart** (/cart) - Review selections
- [ ] **Checkout** (/checkout) - Payment processing
- [ ] **Student Management** (/students) - Add/edit students
- [ ] **Enrollments** (/enrollments) - View class enrollments
- [ ] **Thank You** (/thank-you) - Confirmation page

---

## 🔨 Common Tasks

### Change API URL
Edit `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Build for Production
```bash
npm run build
npm start
```

### Fix TypeScript Errors
```bash
npm run lint
```

### Add Custom Tailwind Colors
Edit `tailwind.config.js` theme.extend.colors

---

## 🎯 Next Steps

1. **Backend Development** - Build Laravel API endpoints
2. **Search Page** - Implement class filtering
3. **Cart System** - Add/remove class selections
4. **Checkout** - Integrate payment mock
5. **Student Management** - CRUD operations

---

## 💡 Pro Tips

- Use `npm run dev` for development (auto-reload)
- Check console for API errors
- Use browser DevTools to inspect localStorage
- Test on mobile using `http://your-ip:3000`
- Keep `.env.local` out of git (already in .gitignore)

---

## 📚 File Descriptions

| File | Purpose |
|------|---------|
| `app/page.tsx` | Landing page with hero & features |
| `app/layout.tsx` | Root layout wrapping all pages |
| `app/globals.css` | Global styles & Tailwind base |
| `app/context/AuthContext.tsx` | Authentication state management |
| `app/components/Navigation.tsx` | Header navigation |
| `app/components/LoginModal.tsx` | Login/Register form |
| `app/dashboard/page.tsx` | Dashboard after login |
| `tailwind.config.js` | Tailwind theme customization |
| `.env.local` | Environment variables |

---

## 🚨 Troubleshooting

### Port 3000 already in use?
```bash
Kill process or use: npm run dev -- -p 3001
```

### API connection failed?
- Check `.env.local` has correct URL
- Ensure Laravel backend is running
- Check CORS headers on backend

### Login doesn't work?
- Check network tab in DevTools
- Verify credentials in request body
- Check Laravel API response

### Styles not loading?
- Clear `.next` folder: `rm -rf .next`
- Restart dev server
- Run: `npm run build`

---

## ✨ Styling Guide

### Using Tailwind
```tsx
<button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
  Click Me
</button>
```

### Using Custom Components
```tsx
<button className="btn-primary">
  Primary Button
</button>
```

Available: `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.input-field`

---

**The frontend is ready to connect with your Laravel backend! 🚀**

Next: Build the backend API endpoints to match the specifications.
