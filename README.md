# موقع فهد مبارك — النسخة V5 (جاهزة لـ GitHub + Netlify)

> الرابط المعتمد: https://fahad-mubarak.netlify.app
> قاعدة البيانات: Supabase (المشروع `jujkckphabzsfjcodefy`) — لا تُنشئ مشروعًا أو موقعًا جديدًا.

## هيكل المستودع
```
public/        ← ما يُنشر على Netlify (index.html, supabase-auth.js, supabase-data.js, _redirects, robots.txt)
docs/          ← ملاحظات الإصدارات السابقة (لا تُنشر)
scripts/       ← smoke-test.mjs لاختبار الاتصال الحي
netlify.toml   ← publish = "public" بلا أمر بناء
.gitignore
```
ملفات `public/` مطابقة بايتًا ببايت لنسخة V4 (تحوي وسم Google Search Console)؛ لم يُعدَّل أي سطر من الكود.

## الرفع إلى GitHub
```bash
cd fahad-mubarak
git init -b main
git add .
git commit -m "V5: organized project (Supabase + Netlify ready)"
git remote add origin https://github.com/<حسابك>/<المستودع>.git
git push -u origin main
```
لا توجد أسرار في الملفات (المفتاح publishable عام بطبيعته ومحميّ بسياسات RLS).

## ربط Netlify بالمستودع (على الموقع الحالي نفسه)
1. Netlify ← مشروع **fahad-mubarak** ← Site configuration ← Build & deploy ← Continuous deployment ← **Link repository**.
2. اختر GitHub والمستودع والفرع `main`.
3. Build command: فارغ — Publish directory: `public` (تُقرأ من netlify.toml).
4. بعد الحفظ، كل `git push` على `main` ينشر تلقائيًا على نفس الرابط.

## متغيرات البيئة
غير مطلوبة: الموقع ثابت ومفتاح Supabase العام داخل `public/supabase-auth.js`. لا تضع `service_role` في أي ملف.

## اختبار الاتصال الحي
```bash
node scripts/smoke-test.mjs
```
يفحص: الموقع، تطابق مشروع Supabase، Auth، قراءة الزائر، حجب البيانات الخاصة (RLS)، Storage، Realtime. قراءة فقط.
