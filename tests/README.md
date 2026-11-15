# راستی‌آزمایی کتابخانه — هایلایت و اعتبار نویسنده

دو ابزار مستقل، بدون نیاز به سرویس بیرونی:

| فایل | چه می‌کند | وابستگی |
|---|---|---|
| `audit-library.py` | ممیزی ایستا: همهٔ فایل‌های HTML کتابخانه (`content/` + بانک‌های ریشه) را می‌شمارد و می‌گوید کدام لایهٔ هایلایت را دارد و آیا اعتبار نویسنده در آن هست | فقط پایتون ۳ |
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

## آنچه `test-marks.js` می‌سنجد (۱۰ گروه)

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

> `node_modules/` و `package-lock.json` در `.gitignore` هستند؛ فقط کد تست در مخزن می‌ماند.
