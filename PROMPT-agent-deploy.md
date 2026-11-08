# پرامپت — ایجنت متصل به GitHub (استقرار و انتشار کتابخانه)

این پرامپت را کامل کپی کن و به ایجنتی بده که به اکانت GitHub من (`mmr363637-afk`) متصل است.
هدف: مخزن محتوا ساخته شود، کتابخانه روی GitHub Pages منتشر شود و به اپ planner وصل شود.

---

## نقش تو
تو یک مهندس DevOps هستی که به GitHub دسترسی دارد. باید یک **مخزن محتوای مستقل** بسازی،
فایل‌های کتابخانه را در آن منتشر کنی، GitHub Pages را روشن کنی و مسیر اتصال را به من بدهی.
هیچ محتوایی را بازنویسی یا خلاصه نکن؛ فایل‌ها را همان‌طور که هستند منتقل کن.

## ورودی‌ها
1. آرشیو `med-library.zip` (شامل پوشه‌های `content/`, `build/`, `assets/`, `docs/`,
   `integration/`, `README.md`, `PROMPT-lessons.md`)
2. اکانت: `mmr363637-afk`
3. نام مخزن جدید: `med-library`
4. ریپوی اپ موجود: `mmr363637-afk/planner` (برنچ `main`، انتشار از پوشهٔ `docs/`)

---

## مرحله ۱ — ساخت مخزن
```bash
gh repo create mmr363637-afk/med-library --public \
  --description "کتابخانهٔ درسنامه‌های پزشکی — قالب واحد، هویت رنگی هر درس" \
  --homepage "https://mmr363637-afk.github.io/med-library/lib/"
```
سپس آرشیو را در ریشهٔ مخزن باز کن به‌طوری که ساختار نهایی این باشد:

```
med-library/
├─ content/          ← خروجی آمادهٔ انتشار (index.html, manifest.json, assets/, <subject>/, qbank/)
├─ build/            ← اسکریپت‌های ساخت (subjects.json, make_map.py, build.py, gen_library.py, icons.py, qb_normalize.py, qb_build.py)
├─ qbank/            ← فایل‌های خام آزمون (raw/) + نسخهٔ نرمال‌شده (data/)
├─ assets/           ← منبع CSS/فونت/JS
├─ docs/             ← پیش‌نمایش‌ها و ‎.github ‎workflow
├─ integration/lessonLinks.ts
├─ README.md
└─ PROMPT-lessons.md
```

## مرحله ۲ — GitHub Pages
1. در Settings → Pages: Source = **Deploy from a branch**، Branch = `main`، Folder = `/docs`.
2. فایل خروجی را در `docs/lib/` قرار بده (workflow موجود در `.github/workflows/build.yml`
   این کار را خودکار انجام می‌دهد). یعنی آدرس نهایی درسنامه‌ها می‌شود:
   `https://mmr363637-afk.github.io/med-library/lib/`
3. فایل `docs/.nojekyll` را حتماً نگه دار.
4. اگر workflow را نگه داشتی، در Settings → Actions → General،
   **Workflow permissions** را روی *Read and write* بگذار.
5. اولین اجرا: Actions → `build-library` → *Run workflow*.

## مرحله ۳ — بررسی سلامت انتشار
این چهار آدرس باید `200` بدهند و محتوای درست برگردانند:
```bash
for u in \
  https://mmr363637-afk.github.io/med-library/lib/index.html \
  https://mmr363637-afk.github.io/med-library/lib/manifest.json \
  https://mmr363637-afk.github.io/med-library/lib/subject/surgery.html \
  https://mmr363637-afk.github.io/med-library/lib/assets/theme/base.css \
  https://mmr363637-afk.github.io/med-library/lib/qbank/index.html \
  https://mmr363637-afk.github.io/med-library/lib/qbank/sur-1.html \
  https://mmr363637-afk.github.io/med-library/lib/qbank/data/sur-1.json ; do
  printf "%s → " "$u"; curl -s -o /dev/null -w "%{http_code}\n" "$u"
done
```
و بررسی کن که `manifest.json` این اعداد را داشته باشد:
`counts.lessons = 156`، `counts.subjects = 8`، `qbank.total = 790`، `qbank.parts` دقیقاً ۸ عضو،
و `subjects[].key` شامل `surgery` و `heme` باشد (و `onco` **نباشد**).

> ⚠️ اگر `base.css` مقدار ۴۰۴ داد، یعنی پوشهٔ `assets` در `lib/` کپی نشده —
> مطمئن شو `content/assets/` هم منتقل شده است.
> ⚠️ اگر `qbank/data/sur-1.json` مقدار ۴۰۴ داد ولی صفحهٔ آزمون باز شد،
> پوشهٔ `content/qbank/data/` در انتشار جا افتاده؛ آزمون بدون داده سفید می‌ماند.

## مرحله ۴ — اتصال به اپ planner
1. فایل `integration/lessonLinks.ts` را در ریپوی `planner` در مسیر `src/lib/lessonLinks.ts` بگذار.
2. مطمئن شو مقدار ثابت `LESSON_BASE` دقیقاً برابر است با:
   `https://mmr363637-afk.github.io/med-library/lib/`
3. یک PR بساز با عنوان `feat(planner): lesson library link` و فقط این فایل را تغییر بده.
   هیچ کامپوننتی را تغییر نده — اتصال UI را خودم بعداً انجام می‌دهم.
4. **اپ را دوباره دیپلوی نکن** مگر اینکه من بگویم.

## مرحله ۵ — تحویل
در پایان یک گزارش کوتاه بده شامل:
- لینک مخزن
- لینک کتابخانه (`.../lib/index.html`)
- خروجی چهار `curl` بالا
- اعداد `manifest.json`
- لینک PR در `planner`
- هر چیزی که شکست خورد و چرا

---

## قواعد سخت (نقض نکن)
- ❌ محتوای فایل‌های HTML را ویرایش، خلاصه یا ترجمه نکن.
- ❌ فایل‌های درسنامه را در ریپوی `planner` کپی نکن (۴۰ مگابایت است؛ ریپوی اپ سنگین می‌شود).
- ❌ `docs/` ریپوی `planner` را دست نزن؛ PR فقط `src/lib/lessonLinks.ts`.
- ❌ فایل‌های `raw_src/` و `qbank/raw/` را پابلیک نکن (متن منبع اصلی‌اند؛ فقط `content/` منتشر می‌شود).
  نسخهٔ نرمال‌شدهٔ `qbank/data/` هنگام ساخت داخل `content/qbank/data/` کپی می‌شود و همان منتشر می‌شود.
- ❌ Secret یا توکن در مخزن نگذار.
- ✅ اگر مخزن از قبل وجود دارد، overwrite نکن؛ فقط تفاوت‌ها را کامیت کن.
- ✅ اگر دسترسی `gh` نداری، بگو و از API استفاده کن؛ حدس نزن.

## معیار پذیرش
- [ ] `.../lib/index.html` باز می‌شود و ۸ کارت درس + ۶ کارت «به‌زودی» دارد
- [ ] `.../lib/surgery/23-cardiothoracic-surgery.html` با رنگ ناوی و فونت وزیرمتن باز می‌شود
- [ ] `.../lib/manifest.json` اعداد بالا را دارد (شامل `qbank.total = 790`)
- [ ] `.../lib/qbank/index.html` ۸ کارت آزمون دارد و شمارش هر کارت با manifest می‌خورد
- [ ] یک آزمون در مرورگر باز می‌شود، با کلیک روی گزینه بازخورد («چرا؟»، «چرا بقیه غلط‌اند»، «نکتهٔ کلیدی») ظاهر می‌شود
- [ ] نسخهٔ تک‌فایلی (`.../qbank/sur-1-standalone.html`) بدون اینترنت هم کار می‌کند
- [ ] PR اتصال در `planner` باز است
- [ ] هیچ فایلی از `raw_src/` منتشر نشده

---

## پرامپت پیگیری (برای بعد از هر مجموعهٔ فایل جدید)
```
در ریپوی med-library، پوشهٔ raw_src/ را به‌روز کن: فایل‌های HTML جدیدی که در
پیوست می‌فرستم را اضافه کن (نام فارسی و انگلیسی هر دو مجاز است، ولی نام فایل را عوض نکن).
سپس به ترتیب اجرا کن:
  python3 build/make_map.py
  python3 build/build.py
  python3 build/gen_library.py
اگر build.py هشدار «محتوا کم شد؟» چاپ کرد، متوقف شو و همان فایل را گزارش کن.
اگر درسی با اطمینان پایین تشخیص داده شد (needsReview)، فقط گزارش کن — خودت تغییری در
نگاشت نده. بعد خروجی content/ را در docs/lib/ کپی و کامیت کن با پیام
"build: افزودن N درسنامهٔ جدید" و اعداد جدید manifest را گزارش کن.
```

---

## پرامپت پیگیری — افزودن بانک سؤال جدید
```
یک یا چند فایل آزمون جدید فرستاده‌ام. آنها فایل HTML با آرایهٔ questions در JS هستند.

۱) از هر فایل، آرایهٔ سؤال‌ها را با node/node vm یا با برش رشته‌ای تا انتهای آرایه
   استخراج کن و به qbank/raw/<part>.json تبدیل کن (نه کل HTML — فقط آرایه).
   نام فایل را کوتاه و لاتین بگذار: <درس>-qb-<شماره>.json
   (درس‌ها: obgyn | cardio | imaging | surgery | ...)

۲) در build/qb_normalize.py یک سطر به BUNDLES اضافه کن:
   ("<درس>", "<نام‌بخش>", "<عنوان فارسی>", ["<نام فایل>.json"])

۳) اجرا کن:
   python3 build/qb_normalize.py
   python3 build/gen_library.py
   python3 build/qb_build.py

۴) بررسی‌ها (همه باید درست باشند، وگرنه متوقف شو و گزارش بده):
   - جمع سؤال‌های چاپ‌شده = تعداد سؤال‌های استخراج‌شده از فایل (هیچ سؤالی نباید دور ریخته شود)
   - برای هر سؤال: options = ۴، correct بین ۰ تا ۳، explanation غیرخالی
   - هیچ سوالتکراری (stem تکراری) در کل بانک نباشد
   - صفحهٔ هر بخش باز می‌شود و با کلیک روی گزینه، بازخورد ظاهر می‌شود
   - manifest.qbank.total با جمع بخش‌ها بخورد

۵) docs/lib/ را به‌روز کن و کامیت بزن با پیام:
   "build: افزودن <N> سؤال در <M> بخش"
   سپس هر بخش جدید را با شمارشش گزارش کن.
```
