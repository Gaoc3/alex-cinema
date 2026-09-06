# 🧠 ذاكرة المشروع المركزية — ALE﻿X CINEMA MASTER ARCHITECTURE & MEMORY

> **ملف المرجع الهندسي الشامل والنهائي لمنصة AleX Cinema والأنظمة المرتبطة بها.**
> *تم إعداد هذا المستند ليكون الدليل الأساسي لأي مطور أو مساعد ذكاء اصطناعي يستأنف العمل على المشروع لضمان الحفاظ على المعمارية، الأمان، والتصميم القياسي.*

---

## 📌 1. نظرة عامة على المنظومة (Ecosystem Overview)

منصة **ALEX CINEMA** هي منصة سينمائية متطورة للمشاهدة الجماعية والفردية فائقة السرعة، متصلة بشبكة سحابية هجينة ومدمجة مع تطبيق تيليجرام (Telegram WebApp / Mini App)، مع خوادم بث مباشر وسيرفرات تزامن فوري وشبكة وكلاء (Proxies) متطورة لشبكة سينمانا/شبكتي.

### شبكة المستودعات المترابطة (Repositories Map):
1. **المستودع الرئيسي (Web + Sockets + Mini App):** [`Gaoc3/alex-cinema`](https://github.com/Gaoc3/alex-cinema) (الفرع الأساسي: `main`).
2. **مستودع بوت التحميل والموسيقى (Mtsky-AI):** [`Gaoc3/AIBOT`](https://github.com/Gaoc3/AIBOT) (المجلد: `Mtsky-AI/`).
3. **مستودع واجهة كلمات الأغاني (Lyrics API):** [`Gaoc3/Api-Lyrics`](https://github.com/Gaoc3/Api-Lyrics).

### النطاقات وبيئة التشغيل:
* **النطاق العام للإنتاج:** `https://cinax.live` و `https://www.cinax.live`
* **نظام التشغيل المعتمد:** Ubuntu / Debian LTS (Linux)
* **المسار الافتراضي على السيرفر:** `/root/alex-cinema` أو `/opt/alex-cinema`

---

## 🏗️ 2. المعمارية السحابية والخدمات (Architecture & PM2 Processes)

تدار خدمات المنصة إما عبر **Docker Compose** (النظام الموصى به) أو عبر **PM2**. فيما يلي جدول الخدمات الأساسية المعتمدة:

| اسم الخدمة في PM2 | المنفذ / التقنية | المسار والملف الرئيسي | الوظيفة والدور الفني |
|:------------------|:-----------------|:----------------------|:---------------------|
| `cinemana` | Port `3000` (Next.js 16) | `/root/alex-cinema` | تطبيق الويب الرئيسي، واجهة المستخدم، و API Routes. |
| `alex-socket` | Port `4000` (Socket.io) | `socket-server.js` | خادم الغرف الحية والمشاهدة التزامنية والدردشة الفورية. |
| `alex-telegram-bot` | Python 3 + Telebot | `telegram_bot.py` | بوت تيليجرام الرسمي لتشغيل تطبيق الويب المصغر ومصادقة الحسابات. |
| `alex-tunnel-watchdog`| Node.js Daemon (15s) | `tunnel_watchdog_vps.js` | مراقبة نفق شبكتي والتحقق الدوري من الاتصال السحابي. |
| `lyrics-api` | Port `8000` (FastAPI/Flask) | `/root/lyrics_api` | خدمة جلب وتنسيق كلمات الأغاني المتزامنة. |
| `yt-downloader-bot` | Python 3 + Pyrogram | `/root/AIBOT/Mtsky-AI` | بوت التحميل والذكاء الاصطناعي ورفع الملفات الضخمة عبر السيرفر المحلي. |

---

## 🌐 3. شبكة الأنفاق وكسر الحظر الجغرافي (Shabakaty Reverse Tunnel & DNS)

### آلية عمل النفق الهجين:
1. **نفق SSH العكسي (Reverse SSH Tunnel):**
   * يتم توجيه حركة المرور من راوتر أو جهاز لينكس داخل شبكة إيرثلنك (العراق) إلى خادم الـ VPS على المنفذ المحلي `8443` (`127.0.0.1:8443`).
2. **اختطاف الـ DNS المحلي (`/etc/hosts`):**
   * يتم توجيه كافة نطاقات `*.shabakaty.com` و `cinemana.shabakaty.com` و `cnth1..49` و `cndw1..49` في ملف `/etc/hosts` إلى `127.0.0.1`.
3. **وسيط Nginx العكسي (`nginx_vps.conf`):**
   * يستقبل طلبات `*.shabakaty.com` ويعيد توجيهها إلى `https://127.0.0.1:8443` مع تمرير ترويسات المصادقة (`Host`, `Referer`, `Bypass-Tunnel-Reminder`).
   * يتعامل مع مسارات الفيديو `/tunnel/...` لتقديم كاش فائق السرعة وإعادة توجيه المسارات المباشرة.
   * يوجه مسار `/socket.io/` إلى المنفذ `4000`، وباقي طلبات الموقع إلى تطبيق Next.js على المنفذ `3000`.

---

## 🤖 4. منظومة بوتات تيليجرام (Telegram Bots Ecosystem)

### أ. بوت أليكس سينما الرسمي (`alex-telegram-bot`):
* **الملف:** `telegram_bot.py` (يقرأ المتغيرات من `.env`).
* **الميزات:**
  * فتح المنصة فورياً كـ **Telegram Mini App** عبر زر `WebAppInfo(url="https://cinax.live/tg-app")`.
  * استقبال أوامر البحث السريع، روابط مشاركة الغرف، ومزامنة هوية تيليجرام عبر `initData`.
  * ترويسات أمان ومصادقة سحابية عبر `/api/auth/telegram`.

### ب. بوت التحميل والموسيقى (`yt-downloader-bot` / Mtsky-AI):
* **المستودع المستقل:** [`Gaoc3/AIBOT`](https://github.com/Gaoc3/AIBOT)
* **المسار:** `/root/AIBOT/Mtsky-AI/main.py`
* **الميزات:**
  * يعتمد على سيرفر تيليجرام بوت محلي (`http://127.0.0.1:8081/bot{token}`) لتحميل ورفع ملفات ضخمة تصل إلى 2GB.
  * تحميل الفيديوهات والصوتيات من YouTube بجودات متعددة، واستخراج الصوتيات، وجلب كلمات الأغاني.

---

## 🎨 5. النظام التصميمي الصارم (Obsidian Cinema Design System)

تم بناء الواجهة وفق معايير بصرية صارمة ومحددة في وثيقة [`DESIGN.md`](DESIGN.md):

### الألوان الأساسية:
* **خلفية الأوبسيديان العميقة (Deep Obsidian):** `#03060f` و `#070b13` و `#090e1d`.
* **اللون التمييزي الأساسي (Ruby Red):** `#e50914` مع ظلال وتوهجات نيون قرمزي.
* **الذهب والعنبر (Gold Stars):** `#fbbf24` / `#f59e0b`.
* **الخطوط الرسمية:** خط `Cairo` العربي، وخط `SF Pro / Outfit` للأرقام واللغة الإنجليزية.

### القواعد الهندسية الصارمة (Strict UI Laws):
1. **القضاء التام على خطوط ولحامات الهوفر (Zero Hover Seam Law):**
   * يمنع ظهور أي خط لوني أو تسريب ضوء أسفل البوسترات أو الكروت أثناء التكبير (Hover).
   * يتم تطبيق قناع أوبسيدياني مزدوج:
     ```tsx
     <div className="absolute inset-0 bg-gradient-to-t from-[#070b13] via-[#070b13]/40 to-transparent pointer-events-none z-10" />
     <div className="absolute inset-x-0 bottom-0 h-3 bg-[#070b13] pointer-events-none z-10" />
     ```
2. **السايدبار المصغر المتطابق رياضياً (Collapsed Sidebar 80px):**
   * أبعاد كل زر وأيقونة موحدة: `44px × 44px` (`width: 2.75rem; height: 2.75rem;`).
   * التباعد الرأسي بين كل أيقونة والتي تليها: **10px بالضبط** (`gap: 0.625rem !important`).
   * القوائم الفرعية المخفية تعدم تماماً في السايدبار المصغر: `display: none !important; height: 0 !important;`.
3. **شريط مواسم المسلسلات (Series Navigator):**
   * الترويسة والشارات في صف علوي مستقل تماماً لمنع أي تزاحم بصري.
   * شريط أزرار المواسم في مسار سفلي زجاجي مخصص بعرض كامل مع إخفاء شريط التمرير (`hide-scrollbar`).

---

## 🔒 6. إدارة الصور والوسائط (Media & Image Proxy)

* **مسار البروكسي الداخلي:** `/api/img?type=poster&file=FILENAME`
* **عقد الـ CDN المدعومة تلقائياً مع نظام التحويل التلقائي (Failover):**
  * `cnth2.shabakaty.com`
  * `cnth1.shabakaty.com`
  * `cndw2.shabakaty.com`
  * `cndw1.shabakaty.com`
  * `cinemana.shabakaty.com`
  * `cdn.shabakaty.com`
* **تفريغ كاش الصور:** يتم تحديث رقم الإصدار `IMAGE_CACHE_VERSION` في `src/utils/imageHelper.ts` عند إجراء تعديلات بصرية جذرية.

---

## 🚀 7. إجراءات البناء والنشر والاستعادة (Deployment & Build Runbook)

### أ. التحقق من البناء محلياً:
```bash
npm run build
```

### ب. النشر عبر Docker Compose (الإنتاج الحديث):
```bash
./scripts/deploy-docker.sh
```

### ج. النشر التحديثي عبر PM2 (الإنتاج التقليدي):
```bash
git pull origin main
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart cinemana alex-socket alex-telegram-bot alex-tunnel-watchdog --update-env
pm2 save
```

---

## 💡 8. تعليمات لأي مساعد ذكاء اصطناعي مستقبلي (Instructions for Future AI)

1. **اقرأ هذا الملف أولاً (`PROJECT_MEMORY.md`)** فور بدء أي جلسة عمل جديدة لاستعادة السياق الكامل للمعمارية.
2. **حافظ دائماً على هوية التصميم السينمائي الفاخر (Obsidian Red Luxury Theme)** ولا تقم بإدخال خلفيات رمادية أو ألوان تشوه التباين.
3. **لا تقم بحفظ أو تضمين كلمات سر أو مفاتيح حقيقية** داخل ملفات المستودع أو ملفات الماركداون.
4. **تأكد دائماً بعد أي تعديل** من خلو الكود من أخطاء الـ TypeScript وتطابق مسارات Next.js 16 قبل رفع التحديثات.
