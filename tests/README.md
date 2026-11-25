# راستی‌آزمایی کتابخانه — هایلایت و اعتبار نویسنده

دو ابزار مستقل، بدون نیاز به سرویس بیرونی:

| فایل | چه می‌کند | وابستگی |
|---|---|---|
| `audit-library.py` | ممیزی ایستا: همهٔ ۴۴۰ فایل HTML کتابخانه (`content/` + بانک‌های ریشه) را می‌شمارد و می‌گوید کدام لایهٔ هایلایت را دارد و آیا اعتبار نویسنده در آن هست. دو ابزار خودبسندهٔ آزمایشگاه (`labs/cardiac/simulator.html` و بستهٔ `labs/pulmolab/`) `VENDORED` شناخته می‌شوند و بیرون می‌مانند | فقط پایتون ۳ |
| `test-marks.js` | راستی‌آزمایی رفتاری در jsdom: واقعاً متن انتخاب می‌کند، هایلایت می‌سازد، ذخیره/بازیابی/حذف و جابه‌جایی بین سؤال‌ها را می‌سنجد | Node + jsdom |

## اجرا

```bash
# ممیزی ایستا (کد خروج ۱ یعنی صفحه‌ای جا مانده)
python3 tests/audit-library.py
python3 tests/audit-library.py --json      # خروجی ماشین‌خوان
python3 tests/audit-library.py --quiet     # فقط خلاصه و موارد مشکل‌دار

# راستی‌آزمایی رفتاری
cd tests && npm install jsdom && node test-marks.js
```

## آنچه `test-marks.js` می‌سنجد (۱۳ گروه)

| گروه | صفحه | نکتهٔ کلیدی |
|---|---|---|
| ۰ | `content/cardio/acute-and-chronic-myocarditis.html` | صفحه‌ای که قلاب‌های کامل دارد **هیچ UI تکراری** از `ensureMarksUI()` نمی‌گیرد |
| ۱ | `content/infectious/124-approach-infectious-disease.html` | لایهٔ خودکار موتور: شیت نشانه‌ها، شیت یادداشت، پنج رنگ، FAB، شمارنده، ذخیره در `medx.state.v1` |
| ۲ | `content/ophthalmology/chapter-01.html` | marks-lite روی صفحهٔ خودبسنده: ساخت/بازیابی/حذف هایلایت + پنل + اعتبار نویسنده |
| ۳ | `content/subject/infectious-exam.html` | بانک ۷۰۵ سؤالی: کلید سند پویا، هایلایت با سؤال بعد/قبل جابه‌جا می‌شود و برمی‌گردد، نشت نمی‌کند |
| ۴ | `content/qbank/inf.html` | `qbank.js` + marks-lite: `data-marks-doc` با هر سؤال عوض می‌شود (تابع پارامتری `qbankPartChecks(part)` که گروه ۹ هم از آن استفاده می‌کند) |
| ۵ | `chashm.html` (بانک ریشه) | نسخهٔ درون‌خطی marks-lite در یک فایل خودبسنده |
| ۶ | `content/orthopedics/chapter-01.html` | همزیستی marks-lite با «علامت‌گذاری فصل» بومی صفحه؛ هر دو ذخیرهٔ جدا دارند |
| ۷ | `content/ent/01-…-hematology.html` | موتور بومی ENT (آزمون ۱۵ سؤالی، فلش‌کارت، نشان‌گذاری بخش) کنار marks-lite؛ کلیدهای جدا `entlesson:…` و `ml-marks/ent/…`؛ نبودِ بخش فلش‌کارت در ریشه‌های هایلایت؛ پانویس با «نویسنده:» و نوار پیوند کتابخانه |
| ۸ | `content/urology/chapter-01.html` | همزیستی marks-lite با هایلایت بومی `.mk`/`hl-mode` (کلید `medx.urology.progress.v1`)، کرامب به داشبورد/فهرست، و نبودِ بلوک اعتبار تکراری |
| ۹ | `content/qbank/uro.html` و `content/qbank/ent.html` | دو بخش تازهٔ بانک: ۲۰۰ سؤال، چهار گزینه و پاسخ معتبر برای همه، عنوان فصل پر، کلید سند پویا |
| ۱۰ | `content/neurology/cerebrovascular-diseases.html` | درسنامهٔ **خودبسنده**: سه موتور کتابخانه بایت‌به‌بایت درون فایل، هیچ منبع بیرونی نه؛ لایهٔ `full` بدون marks-lite و بدون بلوک اعتبار تکراری؛ رنگ هویت ۲۹۲؛ نوار `.ml-nav` با سه پیوند؛ هایلایت موتور درون‌خطی و ذخیره‌اش با کلید `neurology/<slug>` در `medx.state.v1` (با تأخیر ۲۶۰ms ذخیره) |
| ۱۱ | `content/qbank/neuro.html` | بخش تازهٔ بانک نورولوژی: همان `qbankPartChecks` — ۲۰۰ سؤال، ۱۴ فصل با عنوان فارسی، کلید سند `neuro-001|neuro` |
| ۱۲ | `content/labs/pulmolab/` (بدون jsdom) | بستهٔ آزمایشگاه ریه: نسبی بودن همهٔ ارجاع‌ها و وجود فایل‌ها، ثبت `./sw.js`، یکی بودن شمارش‌ها با `data/manifest.json` خود بسته، اعتبارنامهٔ کامل ۷۰ رادیوگرافی و ۱۴ فایل صوتی، و پیوند از فهرست آزمایشگاه‌ها و نوار صفحهٔ خانه |

## اگر چیزی شکست

- **`✗ اعتبار نویسنده ندارد`** → `python3 build/inject_marks_credit.py` (برای صفحه‌های
  پیش‌ساخته/بانک‌های ریشه) یا `python3 build/qb_build.py` (برای صفحه‌های بانک سؤال).
- **`✗ هایلایت ندارد`** → همان دو دستور بالا؛ سپس `python3 build/sync_docs.py` تا
  `docs/lib` و `docs/assets` همگام شوند.
- **آمار خانوادهٔ پیش‌ساخته با manifest نمی‌خورد** → `python3 build/sync_family.py`
  (یا `--check` برای تشخیص بدون نوشتن) و بعد `python3 build/medx_build.py --portal-only`.
- **لایهٔ marks-lite عوض شد** → `python3 build/inject_marks_credit.py` نسخهٔ درون‌خطی
  کهنه را با تازه عوض می‌کند (idempotent است) و `qb_build.py` نسخه‌های تک‌فایلی را از نو می‌سازد.
- **آینه‌ها اختلاف دارند** → `python3 build/sync_docs.py --check` سپس بدون `--check`.
- **`✗ هایلایت ندارد: content/neurology/…`** → این درسنامه‌ها موتور را درون‌خطی دارند؛
  ممیزی `<script src="…medx-reader.js…">` **یا** `function ensureMarksUI` درون‌خطی را
  می‌پذیرد. اگر شکست، احتمالاً فایل از بستهٔ اصلی دوباره کپی شده و موتور را ندارد.
- **`✗ بستهٔ آزمایشگاه ریه کامل نیست` (گروه ۱۲ یا `build_labs.py --check`)** →
  `python3 build/build_labs.py --refresh-pulmolab` تا بسته بایت‌به‌بایت از
  `PulmoLab-Studio-Offline.zip` بازنویسی شود.
- **نوار «آزمایشگاه تعاملی» یا «اسکچ‌نوت» در صفحهٔ خانه نیست** → `medx_build.py --portal-only`
  صفحهٔ خانه را از نو می‌سازد و این دو نوار را پاک می‌کند؛ بعدش
  `python3 build/build_labs.py` و `build_sketch_library.patch_portal()` را اجرا کن.

> `node_modules/` و `package-lock.json` در `.gitignore` هستند؛ فقط کد تست در مخزن می‌ماند.
