# IoT & Network Camera/PA Security Auditor 🛡️

مشروع دفاعي ذكي متكامل بلغة **Python** مخصص لاكتشاف وتدقيق أمان كاميرات المراقبة (IP Cameras)، أنظمة الإذاعة الصوتية (IP-PA / SIP Systems)، وأجهزة الـ IoT المتصلة بالشبكة تلقائياً دون الحاجة لمعرفة الـ IP مسبقاً، واستخراج الثغرات المسجلة مباشرة من قواعد بيانات **NIST NVD API 2.0** و **CIRCL CVE**.

---

## 📁 هيكلية المشروع (Project Structure)

```text
tools/iot-auditor/
├── main.py             # نقطة الدخول الرئيسية للسكربت (CLI Engine)
├── discover.py         # محرك الاكتشاف الذكي للشبكة (ONVIF WS-Discovery / SSDP / Subnet Sweep)
├── scanner.py          # فحص المنافذ واستخراج ترويسات RTSP / ONVIF / HTTP / SIP
├── cve_client.py       # عميل الاتصال بقواعد بيانات CVE و NVD API
├── reporter.py         # وحدة توليد وتلوين الجداول وتصدير تقارير JSON
├── requirements.txt    # الاعتماديات والمكتبات المطلوبة
└── README.md           # دليل الاستخدام والتوثيق
```

---

## 🚀 التثبيت والتشغيل

### 1. تثبيت المتطلبات:
```bash
cd tools/iot-auditor
pip install -r requirements.txt
```

### 2. طرق الاستخدام:

* **الوضع الذكي التلقائي (Auto-Discovery Mode) - بدون تحديد IP:**
> يكتشف السكربت شبكتك المحلية تلقائياً ويبحث عن جميع كاميرات ONVIF وأجهزة الصوت ويفحصها بالكامل:
```bash
python main.py
```

* **فحص جهاز محدد (Target IP Mode):**
```bash
python main.py -t 192.168.1.50
```

* **فحص سابنت مخصص مع تصدير التقرير إلى JSON:**
```bash
python main.py --subnet 192.168.1.0/24 -o audit_report.json
```

* **استخدام مفتاح NVD API Key (لرفع سرعة وحدود الاستعلام):**
```bash
python main.py --api-key YOUR_NVD_API_KEY --cve-limit 5
```

---

## ⚙️ كيف يعمل الاكتشاف التلقائي؟

1. **ONVIF WS-Discovery (UDP 3702):** إرسال حزم استكشاف بروتوكول ONVIF عبر Multicast لاكتشاف جميع كاميرات المراقبة المتصلة على الشبكة واستخراج نقاط النهاية (`XAddrs`).
2. **UPnP / SSDP Multicast (UDP 1900):** البحث التلقائي عن أجهزة الصوت الذكية، أنظمة الإذاعة الداخلية (PA Systems)، وسيرفرات الوسائط.
3. **Subnet Concurrent Sweep:** مسح تفرعي سريع وفوري لكامل شبكة الـ `/24` على المنافذ الشائعة (`554, 80, 443, 8000, 8080, 5060`).
4. **Banner Grabbing & Fingerprinting:** قراءة ترويسات `Server` و `OPTIONS` للحصول على الطراز ورقم الإصدار.
5. **CVE & CVSS Scoring:** ربط الإصدارات مع قاعدة بيانات **NVD** واستخراج الثغرات ودرجة خطورتها (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
