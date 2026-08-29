# 🧠 ذاكرة المشروع الشاملة — ALEX CINEMA & ECOSYSTEM MASTER MEMORY

> **ملف الذاكرة المركزية والهندسة المعمارية لمنصة AleX Cinema والأنظمة المرتبطة بها.**
> *تم إنشاء هذا الملف ليكون المرجع الشامل والنهائي لأي جلسة تطوير جديدة أو ذكاء اصطناعي يعمل على هذا المشروع بعد إعادة تثبيت النظام أو استئناف العمل.*

---

## 📌 1. نظرة عامة على المشروع (Project Overview)

منصة **ALEX CINEMA** هي منصة سينمائية متكاملة للمشاهدة الجماعية والفردية فائقة السرعة، متصلة بشبكة سحابية هجينة ومدمجة مع تطبيق تيليجرام (Telegram WebApp / Mini App)، مع خوادم بث مباشر وسيرفرات تزامن فوري وشبكة وكلاء (Proxies) متطورة لشبكة سينمانا/شبكتي (Shabakaty).

* **النطاق العام للإنتاج:** `https://cinax.live` و `https://www.cinax.live`
* **المستودع الرئيسي (GitHub):** `https://github.com/Gaoc3/alex-cinema.git` (الفرع الأساسي: `main`)
* **الخادم السحابي (Production VPS):**
  * **IP الخادم:** `64.225.99.144` (المستخدم: `root`)
  * **مسار المشروع بالخادم:** `/root/alex-cinema`
  * **مسار بوت التحميل والموسيقى:** `/root/AIBOT/Mtsky-AI`

---

## 🏗️ 2. المعمارية السحابية وعمليات PM2 (Cloud & VPS Architecture)

تدار كافة خدمات المنصة على خادم الإنتاج عبر **PM2** تحت نظام التشغيل Ubuntu / Linux. فيما يلي تفصيل كافة العمليات الست القائمة (PM2 Process Table):

| ID | اسم العملية في PM2 (`name`) | المسار والملف الرئيسي | المنفذ / التقنية | الوظيفة والدور |
|:--:|:----------------------------|:----------------------|:-----------------|:----------------|
| **0** | `lyrics-api` | `/root/lyrics_api` | Port `8000` (Python) | API جلب وتنسيق كلمات الأغاني المتزامنة. |
| **1** | `alex-socket` | `/root/alex-cinema/socket-server.js` | Port `4000` (Node.js + Socket.io) | خادم الغرف الحية والمشاهدة التزامنية والدردشة. |
| **2** | `alex-tunnel-watchdog` | `/root/alex-cinema/tunnel_watchdog_vps.js` | Node.js Daemon (15s cycle) | مراقبة نفق شبكتي والتحقق الدوري من الاتصال. |
| **3** | `yt-downloader-bot` | `/root/AIBOT/Mtsky-AI/main.py` | Python 3 + Pyrogram + Telebot | بوت تحميل الفيديوهات من يوتيوب وتيليجرام وYTMusic. |
| **4** | `cinemana` | `/root/alex-cinema` (`npm start`) | Port `3000` (Next.js 16 Standalone) | تطبيق الويب الرئيسي والواجهة والـ API Routes. |
| **5** | `alex-telegram-bot` | `/root/alex-cinema/telegram_bot.py` | Python 3 + Telebot | بوت تيليجرام الرسمي لـ AleX Cinema وتطبيق الويب. |

---

## 🌐 3. شبكة الأنفاق وكسر الحظر الجغرافي (Shabakaty Reverse Tunnel & DNS)

### آلية عمل النفق الهجين:
1. **نفق SSH العكسي (Reverse Tunnel):** يتم توجيه حركة المرور من راوتر داخل شبكة إيرثلنك (العراق) إلى خادم الـ VPS على المنفذ المحلي `8443` (`127.0.0.1:8443`).
2. **اختطاف الـ DNS المحلي (`/etc/hosts`):** تم توجيه كافة نطاقات `*.shabakaty.com` و `cinemana.shabakaty.com` و `cnth1..49` و `cndw1..49` في ملف `/etc/hosts` إلى `127.0.0.1`.
3. **وسيط Nginx العكسي (`/etc/nginx/nginx.conf`):**
   * يستقبل طلبات `*.shabakaty.com` ويعيد توجيهها إلى `https://127.0.0.1:8443` مع تمرير الترويسات الصحيحة (`Host`, `Referer`, `Bypass-Tunnel-Reminder`).
   * يتعامل مع مسارات الفيديو `/tunnel/...` لتقديم كاش فائق السرعة وإعادة توجيه المسارات المباشرة.
   * يوجه `/socket.io/` إلى المنفذ `4000`، وباقي طلبات الموقع إلى تطبيق Next.js على المنفذ `3000`.

---

## 🤖 4. تفاصيل بوتات تيليجرام (Telegram Bots Ecosystem)

### أ. بوت أليكس سينما (`alex-telegram-bot`):
* **الملف:** `telegram_bot.py` (يقرأ متغيرات البيئة من `.env` / `.env.production`).
* **الميزات:**
  * يفتح المنصة مباشرة كـ Telegram Mini App عبر زر `WebAppInfo(url="https://cinax.live/tg-app")`.
  * استقبال أوامر البحث السريع، روابط مشاركة الغرف، ومزامنة هوية تيليجرام مع نظام الموقع عبر `Telegram WebApp InitData`.
  * ترويسات أمان ومصادقة سحابية عبر `/api/auth/telegram`.

### ب. بوت التحميل والذكاء الاصطناعي (`yt-downloader-bot` / Mtsky-AI):
* **المسار:** `/root/AIBOT/Mtsky-AI/main.py`
* **الميزات:**
  * يعتمد على سيرفر تيليجرام بوت محلي (`http://127.0.0.1:8081/bot{token}`) لتحميل ورفع ملفات ضخمة تفوق 50MB وحتى 2GB.
  * تحميل الفيديوهات والصوتيات من YouTube بجودات متعددة، تحويل الصيغ، وجلب معلومات الموسيقى والكلمات المتزامنة عبر `ytmusicapi` و `lyrics_manager`.

---

## 🎨 5. النظام التصميمي الصارم للواجهة (Obsidian Cinema Design System)

تم بناء الموقع وفق أعلى معايير الحرفية البصرية والجمالية (Impeccable Cinema Polish):

### الألوان والسمة العامة:
* **خلفية الموقع العميقة (Deep Obsidian):** `#050811` و `#070b13` و `#090e1d`.
* **اللون التمييزي الأساسي (Ruby Red):** `#e50914` مع ظلال نيون `rgba(229, 9, 20, 0.45)`.
* **الذهب والعنبر (Gold & Stars):** `#fbbf24` / `#f59e0b`.
* **الخطوط الرسمية:** خط `Changa` العربي المدمج، وخط `SF Pro / Inter` للأرقام واللغة الإنجليزية.

### القواعد الهندسية الصارمة (Strict UI Laws):
1. **القضاء التام على خطوط ولحامات الهوفر (Zero Hover Seam Law):**
   * يمنع ظهور أي خط لوني أو تسريب ضوء أسفل البوسترات أو الكروت أثناء الـ Hover (التكبير).
   * يتم تطبيق قناع أوبسيدياني مزدوج:
     ```tsx
     <div className="absolute inset-0 bg-gradient-to-t from-[#070b13] via-[#070b13]/40 to-transparent pointer-events-none z-10" />
     <div className="absolute inset-x-0 bottom-0 h-3 bg-[#070b13] pointer-events-none z-10" />
     ```
   * تطبيق `contain: paint` و `-webkit-mask-image: -webkit-radial-gradient(white, black)` على حاويات الصور في `globals.css`.
2. **السايدبار المصغر المتطابق رياضياً (Collapsed Sidebar 80px):**
   * أبعاد كل زر وأيقونة موحدة وثابتة: `44px × 44px` (`width: 2.75rem; height: 2.75rem;`).
   * التباعد الرأسي بين كل أيقونة والتي تليها: **10px بالضبط** (`gap: 0.625rem !important`).
   * القوائم الفرعية المخفية تعدم تماماً في السايدبار المصغر عبر: `display: none !important; height: 0 !important;`.
3. **شريط مواسم المسلسلات (Series Navigator):**
   * الترويسة والشارات في صف علوي مستقل تماماً لمنع أي تزاحم.
   * شريط أزرار المواسم في مسار سفلي زجاجي مخصص بعرض كامل مع إخفاء شريط التمرير المشوه (`hide-scrollbar`).

---

## 🚀 6. أوامر التطوير والبناء والنشر (Deployment & Build Commands)

### أ. البناء المحلي والتحقق:
```bash
npm run build
```

### ب. النشر والتحديث على سيرفر الإنتاج (Production Deployment):
```bash
# 1. إرسال التحديثات لـ GitHub
git add -A
git commit -m "feat/fix: description"
git push origin main

# 2. التحديث والبناء على الـ VPS
ssh root@64.225.99.144 "cd /root/alex-cinema && git pull origin main && ./node_modules/.bin/next build && pm2 restart cinemana"
```

> [!TIP]
> عند مواجهة استهلاك زائد للذاكرة أثناء بناء Next.js على الخادم، استخدم معامل تخصيص الذاكرة:
> `NODE_OPTIONS='--max-old-space-size=3072' ./node_modules/.bin/next build`

### ج. فحص حالة الخدمات على الـ VPS:
```bash
ssh root@64.225.99.144 "pm2 status"
ssh root@64.225.99.144 "pm2 logs cinemana --lines 50 --nostream"
```

---

## 🔒 7. إدارة الصور والوسائط (Media & Image Proxy)

* **مسار البروكسي:** `/api/img?type=poster&file=FILENAME`
* **عقد الـ CDN المدعومة تلقائياً مع Failover:**
  `cnth2.shabakaty.com` • `cnth1.shabakaty.com` • `cndw2.shabakaty.com` • `cndw1.shabakaty.com` • `cinemana.shabakaty.com` • `cdn.shabakaty.com`
* **تفريغ كاش المتصفح عند التحديث:** يتم رفع رقم الإصدار `IMAGE_CACHE_VERSION` في `src/utils/imageHelper.ts`.

---

## 💡 8. تعليمات لأي مساعد ذكاء اصطناعي مستقبلي (Instructions for Future AI)

1. **اقرأ هذا الملف أولاً (`PROJECT_MEMORY.md`)** فور بدء أي جلسة جديدة لاستعادة السياق الكامل للمعمارية.
2. حافظ دائماً على نمط التصميم السينمائي الفاخر (Obsidian Red Luxury Theme).
3. لا تقم بتعديل إعدادات `/etc/hosts` أو منافذ `8443` و `4000` و `3000` دون مراعاة اتصال شبكة الراوتر العكسية.
4. تأكد دائماً بعد أي تعديل من تشغيل `npm run build` للتأكد من انعدام أخطاء الـ TypeScript والـ Turbopack قبل الرفع.
