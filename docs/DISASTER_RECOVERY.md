# خطة الاستعادة والترحيل

هذا المستند هو قائمة تنفيذ عند فقد الخادم، انتهاء الاشتراك، أو استبدال الراوتر.

## الهدف التشغيلي

- هدف فقد البيانات يعتمد على تكرار النسخ الخارجية. النسخ اليومي يعني RPO حتى
  24 ساعة.
- الهدف العملي للاستعادة على خادم جاهز هو 30-60 دقيقة، إضافة إلى وقت نقل
  النسخة وقلب DNS.
- لا تعتبر الخطة صالحة قبل إجراء استعادة تجريبية على قاعدة منفصلة.

## ما يجب حفظه خارج الخادم

احتفظ بنسخة مشفرة ومحدودة الصلاحيات من الآتي:

```text
.env.docker
.env.router
docker/router/secrets/id_ed25519
docker/router/secrets/known_hosts
docker/tunnel-sshd/secrets/authorized_keys
backups/alex-cinema-*.dump
backups/alex-cinema-*.dump.sha256
```

احتفظ أيضًا بملكية أو وصول إداري إلى:

- GitHub repository.
- DNS/Cloudflare.
- Clerk production instance.
- Telegram BotFather and OIDC application.
- PostgreSQL backup storage.
- Earthlink router or bridge.

لا تحفظ الأسرار داخل المستودع حتى لو كان خاصًا.

## سيناريو فقد الخادم بالكامل

1. أنشئ VPS بنظام Ubuntu أو Debian.
2. اسمح بالمنافذ `22`, `80`, `443`, `2222` فقط حسب سياسة الإدارة.
3. اخفض TTL أو جهز سجل اختبار قبل قلب DNS.
4. استنسخ المستودع وثبّت Docker.
5. استعد `.env.docker` وملف `authorized_keys` فقط إلى مساراتهما.
6. شغّل `scripts/deploy-docker.sh`.
7. انقل أحدث backup وتحقق من SHA-256.
8. نفذ الاستعادة المحمية.
9. شغّل migrations، ثم أعد تشغيل التطبيق وخادم الغرف.
10. حدث `known_hosts` على جهاز Earthlink بعد التحقق من بصمة الخادم الجديد.
11. عدّل `VPS_HOST` وشغّل Compose الخاص بالراوتر.
12. نفذ مصفوفة القبول قبل قلب DNS.

الأوامر المرجعية:

```bash
git clone https://github.com/Gaoc3/alex-cinema.git /opt/alex-cinema
cd /opt/alex-cinema
sudo ./scripts/install-docker-debian.sh
./scripts/deploy-docker.sh
sha256sum -c backups/alex-cinema-YYYYMMDDTHHMMSSZ.dump.sha256
```

الاستعادة:

```bash
RESTORE_FILE=/backups/alex-cinema-YYYYMMDDTHHMMSSZ.dump \
CONFIRM_RESTORE=RESTORE_ALEX_CINEMA \
docker compose --env-file .env.docker --profile restore run --rm db-restore
docker compose --env-file .env.docker run --rm migrate
docker compose --env-file .env.docker restart app socket
```

## سيناريو استبدال الراوتر فقط

لا تحتاج إلى تغيير قاعدة البيانات أو الخادم.

1. أوصل جهاز Linux أو راوتر Docker بشبكة Earthlink.
2. انسخ `compose.router.yaml` و`docker/router/`.
3. استعد مفتاح النفق الخاص و`known_hosts`.
4. اضبط `.env.router` بعنوان VPS الحالي.
5. شغّل الحزمة وتحقق من السجلات.

```bash
docker compose --env-file .env.router -f compose.router.yaml up -d --build
docker compose --env-file .env.router -f compose.router.yaml logs -f
```

إذا فُقد مفتاح الراوتر، ولّد زوجًا جديدًا ولا تستعد القديم من مصدر غير موثوق.
استبدل المفتاح العام داخل الملف التالي ثم أعد إنشاء `tunnel-sshd`.

```text
docker/tunnel-sshd/secrets/authorized_keys
```

## سيناريو نقل قاعدة البيانات فقط

1. أنشئ backup من المصدر.
2. تحقق من checksum.
3. أوقف الكتابة أو ضع نافذة صيانة قصيرة.
4. أنشئ backup نهائيًا بعد إيقاف الكتابة.
5. استعده إلى قاعدة الهدف.
6. حدث `DATABASE_URL`.
7. شغّل `prisma migrate deploy`.
8. اختبر عدد المستخدمين والغرف والرسائل والمفضلة.

لا تستخدم أمر baseline إلا لقاعدة قديمة مؤكدة تحتوي المخطط نفسه ولم تسجل
ترحيل baseline. القاعدة الجديدة يجب أن تنفذ جميع migrations بصورة طبيعية.

## مصفوفة القبول

| الفحص | النتيجة المطلوبة |
|---|---|
| `docker compose ps` | الخدمات الدائمة healthy/running و`migrate` ناجح |
| `/healthz` | HTTP 200 |
| `/api/health` | HTTP 200 مع PostgreSQL |
| DNS العام | عنوان VPS الجديد |
| TLS | شهادة صالحة واسم نطاق مطابق |
| Telegram bot | `getMe` ناجح ولا يوجد polling conflict |
| Telegram Mini App | دخول أول مرة وتبديل الحساب |
| Clerk | تسجيل ودخول وخروج وإعادة توجيه صحيحة |
| Shabakaty API | HTTP 2xx عبر النفق |
| الصور | بلا عناصر تالفة |
| الفيديو | Range/206 والتخطي والتكبير |
| الغرف | دخول مستخدمين ومزامنة |
| الدردشة | حفظ بعد reload ورد وحذف |
| backup | ملف dump وchecksum في مخزن خارجي |

## الرجوع عند فشل الإصدار

قبل كل إصدار سجل رقم Git والصورة ووقت backup.

```bash
git rev-parse HEAD
./scripts/backup-docker.sh
```

إذا كانت migrations متوافقة رجوعًا، ارجع إلى رقم Git السابق وأعد البناء.

```bash
git checkout PREVIOUS_GOOD_SHA
./scripts/deploy-docker.sh
```

إذا غيّرت migrations البيانات بصورة غير متوافقة، أوقف الكتابة واستعد backup
السابق أولًا. لا تفترض أن إرجاع الكود يعيد قاعدة البيانات.

عند فشل قطع DNS، أعد السجل إلى عنوان الخادم السابق خلال فترة TTL، وأبقِ خدمة
Telegram polling على خادم واحد فقط.

## مراقبة دورية

أسبوعيًا:

- راجع حالة الحاويات ومحاولات إعادة التشغيل.
- راجع انتهاء مساحة القرص.
- تحقق من وجود backup خارجي حديث.
- اختبر `/healthz` وSocket.io والنفق.

شهريًا:

- نفذ استعادة تجريبية في مشروع Compose منفصل.
- راجع صلاحيات GitHub وCloudflare وClerk وBotFather.
- حدّث صور الأساس بعد اختبارها.
- دوّر المفاتيح عند الاشتباه أو تغير المشغلين.

## إلغاء الخادم القديم

لا تحذفه مباشرة بعد النقل. احتفظ به في وضع لا يقبل الكتابة حتى يمر وقت مراقبة
متفق عليه، ثم:

1. خذ backup نهائيًا.
2. تحقق من وصول النسخة الخارجية.
3. أوقف PM2 والبوت والنفق القديم.
4. ألغِ مفاتيح SSH القديمة.
5. امسح الأسرار والبيانات وفق سياسة المزود.
6. أغلق الاشتراك بعد اجتياز الاستعادة الجديدة.

