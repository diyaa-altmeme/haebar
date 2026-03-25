# Deployment Guide

## Stack

- `Next.js App Router`
- `TypeScript`
- `Tailwind CSS`
- `shadcn/ui`
- `Framer Motion`
- `Prisma`
- `PostgreSQL / Supabase`
- `Redis` اختياري للكاش الإنتاجي

## Environment

Create `.env` and set:

- `DATABASE_URL`
- `AUTH_ACCESS_SECRET`
- `AUTH_REFRESH_SECRET`
- `REDIS_URL` optional

Recommended Supabase connection format:

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:5432/postgres?schema=public&sslmode=require"
```

## Database Commands

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
```

For development-only schema sync:

```bash
npm run prisma:push
```

## Runtime Commands

```bash
npm run build
npm run start
```

## Notes

- جميع واجهات النظام وAPI Routes داخل مشروع Next.js واحد.
- الحسابات المالية تعمل في الخلفية فقط.
- القيم المالية تعتمد `NUMERIC(18,3)`.
- عند عدم توفير `REDIS_URL` يستخدم النظام memory cache fallback.
