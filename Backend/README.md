# Clinika Backend — Node.js + Express

نفس الباك اند القديم (FastAPI) بالظبط لكن بـ **Node.js + Express + PostgreSQL (pg)**.

- **86 endpoint** — نفس الـ paths، نفس الـ HTTP methods، نفس شكل الـ JSON، نفس أكواد الأخطاء (`{ "detail": ... }`).
- **نفس الداتابيز (Neon)**: الجداول هي هي، مفيش migration ومفيش ضياع داتا.
- **نفس الـ Auth**: الـ JWT (`sub`, `role`, `tv`) والـ bcrypt hashes القديمة بتتقرا عادي، يعني المستخدمين الحاليين يقدروا يسجلوا دخول، والتوكنات الحالية تفضل شغالة لو `SECRET_KEY` نفسها.
- الفرونت اند **مش محتاج أي تعديل** غير إن `API base URL` يشاور على السيرفر الجديد (أو تنشري الجديد على نفس الـ URL).

## التشغيل محليًا

```bash
npm install
cp .env.example .env        # وعدّلي DATABASE_URL و SECRET_KEY
npm run dev                 # http://localhost:8000
npm run smoke               # (تيرمنال تاني) اختبار سريع بيجرّب أهم الـ flows
npm test                    # اختبارات المنطق (من غير داتابيز)
```

- **داتابيز Neon موجودة أصلًا** → حطي نفس الـ `DATABASE_URL` القديم ثم شغّلي `npm run db:migrate` مرة واحدة: بيضيف أي جدول أو عمود ناقص (لو الداتابيز على نسخة أقدم) ومبيمسحش ولا بيعدّل أي داتا.
- **داتابيز جديدة وفاضية** → `npm run db:migrate` ثم `npm run seed` (بيعمل أدمن + 3 دكاترة + مريضين تجريبيين).
- لازم **PostgreSQL** (مفيش SQLite fallback زي الأول). تقدري تستخدمي Neon حتى للتطوير.

## النشر على Vercel

1. ارفعي فولدر المشروع ده (الـ root فيه `package.json` و `vercel.json` و `api/`).
2. ضيفي نفس الـ Environment Variables اللي في `.env.example` (أهمها `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`, `CRON_SECRET`, `FRONTEND_URL`).
3. الـ cron بتاع تذكير المواعيد (`/internal/send-reminders` يوميًا) متظبط في `vercel.json`.

> **نصيحة:** انشري النسخة الجديدة كمشروع Vercel جديد الأول، شغّلي `npm run smoke` عليها (`BASE_URL=https://... npm run smoke`)، جرّبي الفرونت عليها، وبعدين بدّلي الـ URL أو امسحي القديم.

## اختلافات صغيرة عن النسخة القديمة

| | القديم | الجديد |
|---|---|---|
| Swagger `/docs` | موجود | مش موجود (الـ endpoints هي هي) |
| SQLite محليًا | مدعوم | لأ، PostgreSQL بس |
| `AUTO_CREATE_TABLES` / Alembic | موجود | `npm run db:migrate` (آمن وبيتشغل أكتر من مرة) |
| نص رسائل 422 | رسائل pydantic | نفس الشكل (`detail[].loc/msg/type`) لكن النص ممكن يختلف شوية |
| رسالة `GET /` | فيها `docs` | `{ name, status }` |

## الهيكل

```
api/index.js          نقطة دخول Vercel
src/app.js            Express app (routes, CORS, error handler)
src/routes/*          كل الـ routers (auth, doctors, appointments, admin, ...)
src/services/*        الحجز، المواعيد (slots)، الإيميل، Cloudinary، الإشعارات
src/repo.js           الـ queries المشتركة وتحويل الداتا لنفس شكل JSON القديم
src/schemas.js        التحقق من الـ request bodies (zod بدل pydantic)
db/schema.sql         شكل الجداول (بيستخدمه db:migrate)
```
