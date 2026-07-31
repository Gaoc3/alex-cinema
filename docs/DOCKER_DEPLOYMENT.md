# تشغيل AleX Cinema بواسطة Docker

هذا الدليل ينقل المنصة إلى أي خادم Linux جديد من دون إعادة بناء إعدادات
الخدمات يدويًا. بعد الإعداد الأول تكون التحديثات بأمر واحد.

```bash
./scripts/deploy-docker.sh
```

## لماذا Compose وليس حاوية واحدة ضخمة؟

الحزمة تُدار كوحدة واحدة، لكن كل خدمة تبقى في حاوية مستقلة. هذا يمنع تعطل
قاعدة البيانات عند تحديث الواجهة، ويمنح كل خدمة فحص صحة وسجلًا وإعادة تشغيل
وصلاحيات خاصة بها. النتيجة للمشغّل هي أمر واحد، مع عزل أفضل من جمع كل شيء في
عملية واحدة.

## مخطط التشغيل

```text
Internet
  -> Caddy :80/:443
       -> Nginx :8080 -> Next.js :3000
       -> Socket.io :4000

Next.js / Socket.io -> PostgreSQL :5432

*.shabakaty.com
  -> CoreDNS wildcard
  -> HAProxy TLS passthrough :443
  -> restricted SSH reverse port :8443
  -> Earthlink router HAProxy :8443
  -> original Shabakaty host :443

Telegram Bot -> Telegram Bot API (long polling)
```

## الخدمات

| الخدمة | الوظيفة | منفذ عام |
|---|---|---|
| `caddy` | HTTPS تلقائي والبوابة العامة | `80`, `443/tcp`, `443/udp` |
| `web` | تمرير التطبيق وكاش الوسائط | لا يوجد |
| `app` | تطبيق Next.js | لا يوجد |
| `socket` | الغرف والدردشة | لا يوجد |
| `postgres` | البيانات الدائمة | لا يوجد |
| `migrate` | ترحيلات Prisma لمرة واحدة | لا يوجد |
| `bot` | بوت Telegram | لا يوجد |
| `coredns` | تحويل نطاقات Shabakaty داخل الشبكة | لا يوجد |
| `tunnel-gateway` | تمرير TLS إلى النفق من دون فك التشفير | لا يوجد |
| `tunnel-sshd` | استقبال النفق العكسي المقيد | `2222/tcp` |
| `tunnel-monitor` | مراقبة آمنة فقط | لا يوجد |

لا تفتح المنافذ التالية للإنترنت.

```text
3000
4000
5432
8080
8443
```

## المتطلبات

- خادم Ubuntu أو Debian حديث مع عنوان عام.
- نطاق يشير إلى الخادم.
- جهاز Linux أو راوتر يدعم Docker داخل شبكة Earthlink.
- قيم Clerk وTelegram الحالية.
- نسخة احتياطية PostgreSQL عند نقل بيانات إنتاج.
- منافذ عامة مسموحة: `80`, `443`, `2222`.

## 1. إعداد DNS وCloudflare

وجّه سجلي النطاق إلى عنوان الخادم الجديد.

```text
cinax.live      A      NEW_VPS_IP
www.cinax.live  CNAME  cinax.live
```

اخفض TTL قبل النقل. يمكن تشغيل Cloudflare Proxy، لكن يجب اختيار تشفير
`Full (strict)` والسماح بوصول `80/443` إلى الخادم. يحصل Caddy على شهادة عامة
ويجددها تلقائيًا.

لا تغيّر DNS النهائي قبل اجتياز اختبارات القبول في هذا الدليل.

## 2. تنزيل المشروع وتثبيت Docker

```bash
git clone https://github.com/Gaoc3/alex-cinema.git /opt/alex-cinema
cd /opt/alex-cinema
sudo ./scripts/install-docker-debian.sh
```

السكريبت يدعم Ubuntu وDebian فقط، ويستخدم مستودع Docker الرسمي. في توزيعة
أخرى ثبّت Docker Engine وCompose يدويًا ثم أكمل.

## 3. إنشاء ملفات البيئة ومفاتيح النفق

```bash
./scripts/prepare-docker.sh
```

ينشئ الأمر الملفات المحلية التالية، وجميعها مستبعدة من Git.

```text
.env.docker
docker/router/secrets/id_ed25519
docker/router/secrets/id_ed25519.pub
docker/tunnel-sshd/secrets/authorized_keys
```

عدّل القيم.

```bash
nano .env.docker
```

ولّد أسرارًا مستقلة، ولا تعِد استخدام السر نفسه.

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

المتغيرات السرية وقت التشغيل فقط:

```text
DATABASE_URL
POSTGRES_PASSWORD
CLERK_SECRET_KEY
PROXY_SECRET
PROXY_SECRET_LEGACY
TELEGRAM_BOT_TOKEN
TELEGRAM_CLIENT_SECRET
TELEGRAM_SESSION_SECRET
SOCKET_AUTH_SECRET
```

المتغيرات التي تبدأ بـ `NEXT_PUBLIC_` تظهر في حزمة المتصفح وليست مكانًا
لأي سر حقيقي. تغييرها يحتاج إعادة بناء الصورة، والسكريبت يفعل ذلك تلقائيًا.

إذا احتوت كلمة مرور PostgreSQL على رموز خاصة، استخدم النسخة URL-encoded داخل
`DATABASE_URL` مع إبقاء القيمة الأصلية داخل `POSTGRES_PASSWORD`.

## 4. تشغيل الخادم

```bash
./scripts/deploy-docker.sh
```

السكريبت يرفض التشغيل إن بقيت قيم `CHANGE_ME`، ويتحقق من Compose، وينشئ نسخة
احتياطية قبل التحديث إن كانت قاعدة البيانات تعمل، ثم يبني ويشغل وينتظر فحوص
الصحة.

اعرض الحالة والسجلات.

```bash
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f --tail=200
```

في أول تشغيل سيكون الموقع وقاعدة البيانات جاهزين، لكن مصدر Shabakaty يبقى
غير متاح حتى يتصل جهاز Earthlink في الخطوات التالية.

## 5. تثبيت طرف Earthlink

انسخ المستودع أو المجلدات التالية إلى جهاز Linux متصل بـ Earthlink.

```text
compose.router.yaml
.env.router.example
docker/router/
```

انقل المفتاح الخاص بقناة آمنة إلى الجهاز، ولا ترسله عبر محادثة عامة.

```text
docker/router/secrets/id_ed25519
```

بعد بدء خادم Compose، ثبّت بصمة SSH الحقيقية.

```bash
ssh-keyscan -p 2222 NEW_VPS_IP > docker/router/secrets/known_hosts
chmod 600 docker/router/secrets/id_ed25519 docker/router/secrets/known_hosts
```

لا تستخدم `StrictHostKeyChecking=no`. قارن البصمة من قناة مستقلة عند النقل
الحساس.

أنشئ ملف الراوتر.

```bash
cp .env.router.example .env.router
nano .env.router
```

شغّل طرف الراوتر.

```bash
docker compose --env-file .env.router -f compose.router.yaml up -d --build
docker compose --env-file .env.router -f compose.router.yaml ps
```

يقرأ HAProxy اسم SNI المشفر، يسمح فقط بالنطاقات المنتهية بـ
`shabakaty.com`، يحلها من DNS الخاص بشبكة Earthlink، ثم يمرر الاتصال كما هو.
يحافظ `autossh` على النفق ويعيد الاتصال تلقائيًا.

إذا كان الراوتر OpenWrt ولا يدعم Docker، استخدم الملفات الحالية
`/etc/tunnel_daemon.sh` وHAProxy عليه، لكن غيّر وجهة SSH إلى منفذ الخادم
`2222` واجعل التحويل العكسي يستمع داخل حاوية SSH على العنوان التالي.

```text
0.0.0.0:8443
```

الصيغة المرجعية:

```bash
autossh -M 0 -NT \
  -p 2222 \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=10 \
  -o ServerAliveCountMax=3 \
  -R 0.0.0.0:8443:127.0.0.1:8443 \
  tunnel@NEW_VPS_IP
```

## 6. ضبط Clerk وTelegram

حدّث النطاقات المسموح بها وعناوين العودة في لوحة Clerk. يجب أن تطابق القيم
العامة في ملف البيئة.

```text
https://cinax.live/sign-in
https://cinax.live/sign-up
https://cinax.live/home
```

حدّث رابط Web App في BotFather وإعداد OIDC.

```text
https://cinax.live/tg-app
https://cinax.live/api/auth/telegram/callback
```

يعمل البوت بأسلوب long polling. لا تشغّل نسخة PM2 ونسخة Docker في الوقت نفسه،
وإلا ستتنازعان على تحديثات Telegram.

## 7. التحقق قبل تحويل الزيارات

```bash
./scripts/verify-docker.sh
curl -fsS https://cinax.live/healthz
```

تحقق يدويًا من الآتي:

1. تسجيل Clerk والدخول والخروج من المتصفح.
2. Telegram Mini App والتبديل بين حسابين.
3. البحث والصور وتشغيل فيديو عبر النفق.
4. إنشاء غرفة باسم مخصص.
5. دخول مستخدم ثانٍ ومزامنة التشغيل.
6. إرسال رسالة ثم إعادة تحميل الصفحة والتحقق من بقائها.
7. الرد والحذف وقائمة الأعضاء والصور الشخصية.
8. عرض الهاتف واللوحي وسطح المكتب.

## 8. التحديثات اللاحقة

```bash
git pull --ff-only
./scripts/deploy-docker.sh
```

لا تستخدم `git reset --hard` في مسار التشغيل الجديد. احتفظ برقم الإصدار السابق
للرجوع السريع.

```bash
git rev-parse HEAD
```

## 9. النسخ الاحتياطي والاستعادة

نسخة فورية:

```bash
./scripts/backup-docker.sh
```

تظهر ملفات مضغوطة وملفات SHA-256 تحت `backups/`. انسخها يوميًا إلى مخزن
خارجي مشفر؛ وجودها على الخادم نفسه لا يحمي من فقد الخادم.

الاستعادة تمسح مخطط قاعدة الهدف، لذلك تتطلب تأكيدًا صريحًا.

```bash
RESTORE_FILE=/backups/alex-cinema-YYYYMMDDTHHMMSSZ.dump \
CONFIRM_RESTORE=RESTORE_ALEX_CINEMA \
docker compose --env-file .env.docker --profile restore run --rm db-restore
```

بعد الاستعادة:

```bash
docker compose --env-file .env.docker run --rm migrate
docker compose --env-file .env.docker restart app socket
```

## 10. قواعد تشغيل مهمة

- لا تنشر PostgreSQL أو `3000/4000/8443` للعامة.
- أبقِ خدمة `socket` بنسخة واحدة؛ حالتها الحية في الذاكرة.
- لا تنفّذ baseline تلقائيًا على قاعدة فارغة.
- لا تضع ملفات البيئة أو المفاتيح أو النسخ الاحتياطية في Git.
- لا تعطل التحقق من TLS أو بصمة SSH.
- راقب مساحة `postgres-data`, `nginx-cache`, `caddy-data`, و`backups/`.
- غيّر شبكة Docker والقيمتين الثابتتين معًا إذا تعارضت مع VPN أو شبكة المضيف.

```text
DOCKER_SUBNET
TUNNEL_GATEWAY_IP
CORE_DNS_IP
```

## 11. إيقاف وتشغيل الحزمة

إيقاف العمليات مع إبقاء البيانات:

```bash
docker compose --env-file .env.docker stop
```

إعادة التشغيل:

```bash
docker compose --env-file .env.docker start
```

حذف الحاويات مع إبقاء البيانات الدائمة:

```bash
docker compose --env-file .env.docker down
```

لا تستخدم الخيار التالي إلا إذا أردت حذف قاعدة البيانات والشهادات والكاش.

```text
docker compose down --volumes
```

