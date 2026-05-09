# Deals

Deals is a mobile-first hyperlocal coupon and in-store deal discovery platform. Users discover nearby offers, copy coupon codes, open shop navigation, and redeem in-store. Shop owners can register, add shop/location details, and publish up to 3 free deals per month by default. Admins approve owners, moderate deals, manage categories, ban accounts, and watch platform analytics.

## Stack

- Frontend: React + Vite, Tailwind CSS, Framer Motion, React Query, Zustand, React Router, Axios
- Backend: Node.js, Express, JWT cookies, Helmet, rate limiting, Zod validation, Multer uploads
- Database: MySQL 8 with relational tables for users, shop profiles, deals, categories, images, locations, and redemptions
- Infrastructure: Docker Compose with separate frontend, backend, and MySQL containers

## Run With Docker

```bash
docker compose up --build
```

Open:

- App: `http://localhost:8080`
- API health: `http://localhost:4000/api/health`
- MySQL: `localhost:3307`

Demo accounts:

- Admin: `admin@deals.local` / `Admin@12345`
- Shop owner: `owner@deals.local` / `Owner@12345`

## Local Development

Backend:

```bash
cd backend
npm install
npm start
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` and `/uploads` to `http://localhost:4000`.

## API Overview

- `POST /api/auth/register` user/shop-owner registration
- `POST /api/auth/login` JWT cookie login
- `POST /api/auth/forgot-password` reset token flow
- `POST /api/auth/reset-password` update password
- `POST /api/auth/verify-email` mark account email verified
- `GET /api/deals` nearby deal discovery with category, radius, sort, pagination
- `POST /api/deals/:id/redeem` redemption tracking
- `GET /api/owner/deals` owner dashboard
- `POST /api/owner/deals` publish a deal with monthly limit enforcement
- `GET /api/admin/analytics` admin metrics
- `GET /api/admin/users` user monitoring
- `GET /api/admin/shop-owners` owner approval list
- `PATCH /api/admin/shop-owners/:id/status` approve/suspend owners
- `PATCH /api/admin/shop-owners/:id/limit` control monthly posting limit
- `GET /api/admin/deals` deal moderation
- `POST /api/admin/categories` category creation

## Production Notes

Change `JWT_SECRET`, database passwords, and demo credentials before deployment. For production email verification and forgot-password emails, connect `/api/auth/forgot-password` to an email provider and remove the development reset token from responses.
