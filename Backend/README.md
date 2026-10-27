# Clinika Backend (FastAPI + Neon Postgres + Vercel)

Backend كامل لمنصة Clinika: مرضى + دكاترة + أدمن.

## التشغيل محليًا

```bash
python -m venv .venv
source .venv/bin/activate        # على ويندوز: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # عدّلي DATABASE_URL و SECRET_KEY
alembic revision --autogenerate -m "initial"   # مرة واحدة فقط (بيولّد ملف migration)
alembic upgrade head             # إنشاء الجداول
python -m app.seed               # بيانات تجريبية (اختياري)
uvicorn app.main:app --reload
```

افتحي: http://localhost:8000/docs  (زر Authorize بيشتغل بـ email + password)

> لو سبتي `DATABASE_URL` فاضي هيشتغل على SQLite محليًا للتجربة السريعة.

## النشر على Vercel + Neon

1. في Neon: اعملي Project وانسخي الـ connection string (الـ Pooled) وحطيه في `.env` محليًا.
2. من جهازك (و`DATABASE_URL` بتاع Neon في `.env`) شغّلي: `alembic upgrade head` ثم `python -m app.seed`
   (كده الجداول تتعمل على Neon).
3. ارفعي المشروع على GitHub.
4. في Vercel: New Project ← اختاري الـ repo ← من Settings > Environment Variables ضيفي:
   `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS` (رابط الفرونت)، `CRON_SECRET`
5. Deploy. الـ docs هتلاقيها على `https://YOUR-APP.vercel.app/docs`

لو ظهر خطأ `channel_binding` في الاتصال: شيلي `&channel_binding=require` من الـ URL.

## الصلاحيات

| Role | يقدر |
|---|---|
| Patient | يسجّل، يبحث، يحجز/يلغي/يعدّل مواعيده، يشوف سجلاته وروشتاته، يقيّم الدكتور |
| Doctor | جدوله وإجازاته، يأكد/ينهي الحجوزات، يكتب السجلات والروشتات لمرضاه |
| Admin | المستخدمين، الأطباء، التخصصات، العيادات، التقارير، سجل الوصول (Audit) |

الأدمن **مش** بيشوف المحتوى الطبي (سجلات/روشتات) لأسباب الخصوصية. الدكتور بيشوف سجلات
المريض بس لو بينهم حجز غير ملغي، وكل وصول بيتسجل في `audit_logs`.

## Endpoints

**Auth**: `POST /auth/register` · `POST /auth/login` · `POST /auth/token` (Swagger) · `GET/PUT /auth/me` · `POST /auth/change-password`

**Specialties**: `GET /specialties` · `GET /specialties/{id}` · `POST/PUT/DELETE` (admin)

**Clinics**: `GET /clinics` · `GET /clinics/{id}` · `POST/PUT/DELETE` (admin)

**Doctors**
`GET /doctors` (q, specialty_id, clinic_id, city, min_rating, max_fee, sort) · `GET /doctors/{id}`
`POST /doctors` (admin) · `PUT /doctors/{id}` · `DELETE /doctors/{id}` (admin)
`GET /doctors/me/profile` · `GET /doctors/me/stats`
`GET /doctors/{id}/slots?date=YYYY-MM-DD` · `GET /doctors/{id}/availability?days=14`
`GET/PUT /doctors/{id}/schedules` · `GET/POST /doctors/{id}/time-off` · `DELETE /doctors/{id}/time-off/{off_id}`
`GET /doctors/{id}/reviews`

**Patients**: `GET/PUT /patients/me` · `GET /patients` (doctor/admin) · `GET /patients/{id}`

**Appointments**
`POST /appointments` · `GET /appointments` (status, date_from, date_to, upcoming, ...) · `GET /appointments/today` · `GET /appointments/{id}`
`PATCH /appointments/{id}/cancel` · `PATCH /appointments/{id}/reschedule` · `PATCH /appointments/{id}/status` (doctor/admin)

**Medical records**: `POST/GET /medical-records` · `GET/PUT /medical-records/{id}`

**Prescriptions**: `POST/GET /prescriptions` · `GET /prescriptions/{id}`

**Notifications**: `GET /notifications` · `GET /notifications/unread-count` · `PATCH /notifications/{id}/read` · `PATCH /notifications/read-all` · `DELETE /notifications/{id}`

**Reviews**: `POST /reviews`

**Admin**: `GET /admin/stats` · `GET /admin/reports/appointments` · `GET/POST /admin/users` · `PATCH /admin/users/{id}/status` · `GET /admin/audit-logs`

## قواعد الحجز

- `day_of_week`: 0=الاثنين … 5=السبت، 6=الأحد.
- المواعيد بتتولد من الجدول الأسبوعي × `slot_duration_minutes` مع استبعاد الإجازات والمحجوز والماضي.
- منع الحجز المزدوج: فحص في الكود + unique index في قاعدة البيانات (الحجوزات الملغية مستثناة).
- المريض مينفعش يلغي/يعدّل قبل الموعد بأقل من `CANCEL_MIN_HOURS_BEFORE` ساعة.
- حالات الحجز: `pending → confirmed → completed | no_show`، و`cancelled` من pending/confirmed.
- `AUTO_CONFIRM_APPOINTMENTS=true` لو عايزة الحجز يتأكد تلقائيًا.

## الإشعارات والتذكير

الإشعارات داخل التطبيق (جدول notifications). التذكير اليومي بيشتغل بـ Vercel Cron على
`/internal/send-reminders` الساعة 16:00 UTC (محمي بـ `CRON_SECRET`).

## ملاحظات

- التوكن JWT: ابعتيه في الهيدر `Authorization: Bearer <token>`.

## Migrations (Alembic)

كل ما تعدّلي في `app/models.py` (عمود أو جدول جديد):

```bash
alembic revision --autogenerate -m "وصف التعديل"   # يولّد ملف في alembic/versions
# راجعي الملف المتولّد قبل ما تطبّقيه
alembic upgrade head                               # يطبّق على الداتابيز (Neon)
alembic downgrade -1                               # يرجّع خطوة لو حصلت مشكلة
alembic current                                    # الإصدار الحالي
```

- الـ migration بتتطبق من جهازك، مش من Vercel. ارفعي ملفات `alembic/versions` على GitHub.
- لو الجداول موجودة أصلًا على Neon من `init_db`: اعملي migration الأولى ثم `alembic stamp head`
  بدل `upgrade` (عشان ما يحاولش ينشئها تاني)، أو امسحي الجداول التجريبية وابدئي من الأول.
- `app.init_db` اتساب للتجربة السريعة بس.

---

## تحديث: الـ endpoints الجديدة (متوافقة مع شاشات الـ UI)

**Auth**
`POST /auth/register/doctor` (طلب انضمام دكتور → حالة pending) · `POST /auth/forgot-password` ·
`GET /auth/reset-password/validate?token=` · `POST /auth/reset-password` ·
`POST /auth/login` بيقبل `remember_me: true` (توكن 30 يوم) ·
`PUT /auth/me` بيقبل `full_name` واحد (أو first/last) و`avatar_url`، وتغيير `email` بيحتاج `current_password` ·
`POST /auth/change-password` بيرجّع **توكن جديد** (200) ويقفل باقي الجلسات.
`register` و`PUT /patients/me` و`POST /doctors` بيقبلوا `full_name` بدل first/last.

**Public**: `GET /public/stats` · `GET /public/locations` · `POST /contact`

**Doctors**
`GET /doctors` فلاتر جديدة: `specialty_ids` · `cities` · `districts` · `gender` · `min_fee` · `verified` ·
`accepting_new_patients` · `online` · `availability=today|tomorrow|this_week` · `date=YYYY-MM-DD` ·
`sort=recommended|next_available` — والـ header `X-Total-Count` فيه العدد الكلي، وكل دكتور فيه `next_available`.
`GET/PUT /doctors/{id}/credentials` (التعليم والشهادات).
`/doctors/me/stats` بقى فيه: `completed_this_week` · `attendance_rate` · `visit_types_30d` · `today_capacity`.
`/doctors/{id}/availability` بقى فيه `is_working_day` (لو true و`available_slots=0` اليوم "Full").

**Appointments**
`POST /appointments` بيقبل `consultation_type: in_person|online`، والرد فيه `reference_number` ·
`fee_at_booking` · `meeting_link` · بيانات الدكتور (صورة، تقييم، سعر، عيادة بالعنوان والخريطة).
`PATCH /appointments/{id}/meeting-link` · `GET /appointments?q=&consultation_type=`.

**Patients**: `GET /patients/me/stats`

**Admin**
`GET /admin/doctors?status=pending|active|inactive|rejected` · `GET /admin/doctors/counts` ·
`GET /admin/doctors/{id}` · `PATCH /admin/doctors/{id}/review` (approve/reject) · `PATCH /admin/doctors/{id}/verify` ·
`GET /admin/doctors/export` (CSV) · `POST /admin/patients` · `POST /admin/appointments` ·
`GET /admin/activity` · `GET /admin/contact-messages` · `PATCH /admin/contact-messages/{id}`

**العيادات المتعددة للدكتور**
الدكتور بيحدد العيادة لكل فترة في جدوله: `PUT /doctors/{id}/schedules` وكل عنصر فيه `clinic_id` (فاضي = عيادته الأساسية).
المريض لما يفلتر بعيادة/مدينة/منطقة (`/doctors?clinic_id=` أو `cities` أو `districts`) مش بيشوف غير الدكاترة اللي فعلًا
في العيادة دي، و`next_available` بيتحسب في العيادات المختارة بس. كل دكتور فيه `clinics` (كل عياداته).
`GET /doctors/{id}/slots?date=&clinic_id=` و`/availability?clinic_id=` بيرجّعوا مواعيد العيادة دي بس.
`POST /appointments` بيقبل `clinic_id` اختياري: لو الدكتور في عيادة تانية في الوقت ده الحجز بيترفض (400)،
والحجز بيتسجل عليه العيادة (`clinic_id` و`clinic` في الرد). الدكتور مينفعش يبقى في عيادتين في نفس الوقت.

**Uploads**: `POST /uploads/avatar` · `POST /uploads/image` (أدمن)

## Environment Variables الجديدة
`FRONTEND_URL` · `RESEND_API_KEY` · `EMAIL_FROM` · `CONTACT_RECEIVER_EMAIL` ·
`CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` ·
`MIN_BOOKING_NOTICE_MINUTES` · `PASSWORD_RESET_EXPIRE_MINUTES` · `REMEMBER_ME_EXPIRE_DAYS`
(الإيميل والصور اختياريين: من غيرهم الباك اند بيشتغل عادي، بس الإيميل بيتجاهل والرفع بيرجّع 503).

## تطبيق الـ migration الجديدة على Neon
```bash
alembic current                      # لازم يطلّع 74a942950602 (أو يبقى فاضي)
# لو فاضي (الجداول اتعملت بـ create_all): alembic stamp 74a942950602
alembic upgrade head                 # بيطبّق migration-تين دفاعيتين (a1f3c9d2b7e4 ثم b2d4e6f8a0c1) ويضيف الناقص بس
```
