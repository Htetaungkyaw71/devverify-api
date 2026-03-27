# DevVerify API

Backend API for coding assessments with:

- OTP-based auth (email verification + reset password)
- AI code review scoring
- Recruiter positions and invite links
- Redis caching (Upstash)

## Tech Stack

- Node.js + Express + TypeScript
- MongoDB (Mongoose)
- Upstash Redis (`@upstash/redis`)
- Resend (email OTP)
- JWT authentication

## Project Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Create `.env` in project root and copy values from `.env.example`.

Required keys:

- `MONGODB_URI`
- `JWT_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `UPSTASH_REDIS_REST_URL` (optional)
- `UPSTASH_REDIS_REST_TOKEN` (optional)

### 3) Run in development

```bash
npm run dev
```

### 4) Build for production

```bash
npm run build
```

Output is generated in `dist/`.

### 5) Start production build

```bash
npm run start
```

## Scripts

- `npm run dev` → run TS server with watch mode
- `npm run seed` → seed challenges
- `npm run seedtag` → seed tags
- `npm run build` → compile TS to `dist/`
- `npm run start` → run compiled server from `dist/index.js`

## Main Auth Endpoints

Base: `/api`

- `POST /register/send-otp` → send signup OTP to email
- `POST /register` → verify OTP + create account
- `POST /login` → login with email/password
- `POST /forgot-password` → send reset OTP
- `POST /reset-password` → reset password using OTP
- `GET /me` → authenticated user profile

## Other Routes

- `/api/challenges`
- `/api/tags`
- `/api/positions`
- `/api/submissions`

## Notes

- API includes route-level rate limiting for auth and core routes.
- If Redis is unavailable, API continues without cache (fail-open behavior).
- CORS frontend origin is controlled via `FRONTEND_URL` (fallback: `http://localhost:3000`).

## Deployment (Free-friendly)

- API: Render / Koyeb
- MongoDB: MongoDB Atlas (free tier)
- Redis: Upstash Redis (free tier)

## Security Reminder

Do not commit real secrets in `.env`.
If secrets were exposed previously, rotate them:

- MongoDB password
- Resend API key
- JWT secret
- GitHub OAuth secret
- Upstash token
