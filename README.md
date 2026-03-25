# Haebar Finance OS

منصة مالية احترافية مبنية بالكامل على:

- `Next.js App Router`
- `TypeScript`
- `Tailwind CSS`
- `shadcn/ui`
- `Framer Motion`
- `PostgreSQL / Supabase`
- `Prisma`
- `Zod`

## القواعد المالية المعتمدة

- جميع الحسابات المالية تنفذ في الخلفية فقط.
- جميع القيم المالية محفوظة بدقة `NUMERIC(18,3)`.
- لا يوجد اعتماد على `float`.
- العمليات المالية الحرجة تعمل داخل `Database Transactions`.
- يوجد `Audit Log` لكل العمليات.
- يوجد `Recalculation` للقاصات.
- يوجد `RTL` كامل في الواجهة.

## هيكل المشروع

- `app/` صفحات Next.js وAPI Routes
- `components/` الواجهة وعناصر UI
- `lib/services/` منطق الأعمال
- `lib/calculations/` الحسابات المالية
- `lib/db/` الاتصال بقاعدة البيانات
- `lib/cache/` الكاش وRedis
- `prisma/` المخطط والـ seed والـ migrations

## التشغيل المحلي

1. انسخ `.env.example` إلى `.env`
2. ضع:
   - `DATABASE_URL`
   - `AUTH_ACCESS_SECRET`
   - `AUTH_REFRESH_SECRET`
   - `REDIS_URL` اختيارياً
3. شغل:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run dev
```

## ملاحظات قاعدة البيانات

- المشروع مربوط فعلياً على `Supabase PostgreSQL`.
- تم اعتماد `Prisma migrations` في `prisma/migrations/`.
- إذا احتجت مزامنة سريعة في بيئة تطوير فارغة يمكن استخدام:

```bash
npm run prisma:push
```

## بيانات الدخول الافتراضية

- البريد: `admin@haebar.local`
- كلمة المرور: `Admin12345!`

## الحالة الحالية

- لا توجد بنية `frontend/` و`backend/` منفصلة بعد الآن.
- المشروع يعمل كبنية واحدة على Next.js.
- البناء النهائي ينجح عبر `npm run build`.
