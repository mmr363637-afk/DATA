# PulmoLab | آزمایشگاه تعاملی ریه — مستندات معماری و راهنمای تولید محتوا

## ۱. معماری ماژولار (جداسازی کامل محتوا از منطق)

در PulmoLab هیچ متن علمی یا دادهٔ بالینی درون کامپوننت‌های رابط کاربری (`js/views/`) هاردکد نشده است. تمامی داده‌ها از طریق فایل‌های JSON ساختاریافته و رجیستری مرکزی (`js/store/content-registry.js`) مدیریت می‌شوند:

```text
pulmolab/
├── index.html                   # پوستهٔ RTL فارسی، منوی ناوبری و سوییچر حالت یادگیری/شبیه‌سازی
├── manifest.webmanifest         # مانیفست نصب PWA
├── sw.js                        # سرویس‌ورکر آفلاین (هسته + کش انتخابی رسانه‌ها)
├── css/
│   ├── tokens.css               # متغیرهای رنگی هماهنگ با پالت ریه در DATA (--h:197, --c:74)
│   ├── layout.css               # ساختار واکنش‌گرا (موبایل، تبلت، دسکتاپ)
│   └── components.css           # کارت‌ها، کنسول صوتی، لایت‌باکس رادیولوژی و نمودارهای PFT
├── js/
│   ├── app.js                   # روتر Hash، مدیریت حالت‌ها و راه‌اندازی PWA
│   ├── store/
│   │   ├── content-registry.js  # بارگذاری JSONها، نگاشت O(1)، پیوندهای معکوس و اعتبارسنجی
│   │   ├── idb-store.js         # ذخیره‌سازی محلی IndexedDB (پیشرفت، آزمون‌ها، جلسات پرونده)
│   │   └── offline-manager.js   # مدیریت دانلود انتخابی بسته‌های رسانه در Cache API
│   ├── engines/
│   │   ├── audio-engine.js      # موتور صوتی Web Audio (شکل‌موج، حلقه A-B، سرعت، رویدادها)
│   │   ├── radiology-viewer.js  # بینندهٔ CXR (زوم، پن، Invert، تمام‌صفحه، نشانگرها)
│   │   ├── pft-engine.js        # رسم SVG حلقهٔ جریان-حجم + طبقه‌بند فیزیولوژیک ATS/ERS 2022
│   │   ├── search-engine.js     # موتور جستجوی یکپارچه فارسی/انگلیسی با نرمال‌سازی حروف
│   │   └── case-engine.js       # موتور چندبیماری، تکامل مرحله‌ای و استدلال بیزی کیفی
│   └── views/                   # ۹ نمای مستقل رابط کاربری
├── data/                        # پایگاه دادهٔ JSON اعتبارسنجی‌شده با شناسه‌های یکتا
│   ├── manifest.json            # رجیستری مرکزی، آمار، بسته‌های آفلاین و فهرست رسانه‌های ناقص
│   ├── references.json          # ۲۳ منبع علمی معتبر (Harrison, GOLD, GINA, ATS/ERS, IDSA...)
│   ├── sounds.json              # ۱۲ صدای سمع (۱۴ ضبط واقعی + ۲ اسلات شفاف فاقد ضبط آزاد)
│   ├── radiographs.json         # ۲۶ رادیوگرافی واقعی ناشناس‌شده با نشانگر و آزمون کور
│   ├── pft.json                 # اصول، ۱۲ الگوی PFT و ۶ تمرین تفسیری
│   ├── exam.json                # ۱۲ مهارت معاینه، ماتریس ۸ سندرمی و ۴ تمرین
│   ├── diseases.json            # ۱۲ دسته و ۳۰ بیماری کامل (۲۱ بخش استاندارد)
│   └── cases.json               # ۸ پروندهٔ چندبیماری مرحله‌ای در تمام ۵ سطح دشواری
└── media/
    ├── audio/                   # ۱۴ فایل PCM WAV واقعی + ATTRIBUTION.json
    └── cxr/                     # ۲۶ فایل JPEG بالینی واقعی + ATTRIBUTION.json
```

## ۲. راهنمای افزودن محتوای جدید (Content Authoring Guide)

### افزودن صدای بالینی واقعی (از جمله تکمیل دو اسلات Tracheal و Pleural Friction Rub)
1. فایل واقعی بیمار با مجوز معتبر (مثلاً CC BY 4.0 یا مجوز مؤسسه‌ای) را با فرمت WAV مونو ۱۶ بیت در مسیر `media/audio/tracheal_custom.wav` یا `media/audio/pleural_rub_custom.wav` قرار دهید.
2. در `data/sounds.json` فیلد `authenticAudioStatus` را به `"verified_patient"` تغییر داده و یک آبجکت کامل به آرایهٔ `recordings` شامل `file`، `labelFa`، `patientMeta`، `dataset`، `license` و `processingNote` اضافه کنید.
3. در `media/audio/ATTRIBUTION.json` اطلاعات منبع و مجوز را ثبت کرده و آزمون اعتبارسنجی را اجرا نمایید:
   ```bash
   node tests/validate-content.mjs
   ```

### افزودن رادیوگرافی جدید
1. فقط از تصاویر واقعی ناشناس‌شده با مجوز آزاد (CC0 / PD / CC BY / CC BY-SA) بدون علائم گرافیکی روی عکس استفاده کنید.
2. فایل JPEG را در `media/cxr/` قرار داده، متادیتا و مجوز را در `media/cxr/ATTRIBUTION.json` ثبت کنید و رکورد جدید را با شناسهٔ یکتای `cxr-*` و مختصات درصدی نشانگرها (`x`, `y` بین ۰ تا ۱۰۰) به `data/radiographs.json` بیفزایید.

### افزودن بیماری یا پروندهٔ بالینی جدید
- **بیماری جدید:** در `data/diseases.json` با شناسهٔ `dis-*` و تکمیل هر ۱۹ کلید بخش `sections` به علاوهٔ `relatedDiseases`، `relatedCases` و `references`.
- **پروندهٔ جدید:** در `data/cases.json` با شناسهٔ `case-*`، تعیین `difficultyTier`، تعریف نقش هر تشخیص در `diagnoses` (`primary`, `secondary`, `underlying`, `comorbidity`, `complication`, `triggering`, `differential`, `incidental`)، مراحل زمانی (`stages`) و اقدامات غیرخطی (`investigations`) همراه با جهت‌های کیفی بیزی (`bayesianShift`).
- در پایان با اجرای `node tests/validate-content.mjs` صحت تمام شناسه‌ها، پیوندهای متقابل و فایل‌های رسانه را تضمین کنید.
