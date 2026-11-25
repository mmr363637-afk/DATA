#!/usr/bin/env bash
# ============================================================================
#  آماده‌سازی و انتشار کتابخانهٔ med-library
#  ----------------------------------------------------------------------------
#  این اسکریپت همان کارهایی را می‌کند که در سندباکس انجام و راستی‌آزمایی شد.
#  ورودی: آرشیو med-library.zip (یا پوشهٔ بازشدهٔ آن)
#  خروجی: مخزن آمادهٔ push با پوشهٔ docs/ منتشرشونده
#
# کاربرد: bash prepare-med-library.sh /path/to/med-library.zip
#  یا:    bash prepare-med-library.sh /path/to/med-library
# ============================================================================
set -euo pipefail

IN="${1:?کاربرد: bash prepare-med-library.sh <med-library.zip | پوشهٔ بازشده>}"
WORK="$(pwd)/med-library"

echo "── ۱) بازکردن آرشیو ─────────────────────────────────────"
rm -rf "$WORK"
if [ -f "$IN" ]; then
  TMP="$(mktemp -d)"
  unzip -q "$IN" -d "$TMP"
  # آرشیو پوشهٔ med-library/ در ریشه دارد
  if [ -d "$TMP/med-library" ]; then mv "$TMP/med-library" "$WORK"; else mv "$TMP" "$WORK"; fi
else
  cp -a "$IN" "$WORK"
fi
cd "$WORK"

echo "── ۲) ساخت docs/lib (کپی بی‌کم‌وکاست content/) ───────────"
rm -rf docs/lib docs/assets
mkdir -p docs/lib
cp -r content/. docs/lib/

echo "── ۳) کپی assets در ریشهٔ سایت (docs/assets) ────────────"
# ⚠ لازم است: هر ۱۵۶ درسنامه از ../../assets ارجاع می‌دهند. چون درسنامه در
#   /lib/<subject>/x.html است، ../../assets به ریشهٔ سایت می‌رسد نه به lib/.
#   بدون این کپی، base.css و فونت وزیرمتن ۴۰۴ می‌شوند و درسنامه بی‌رنگ می‌ماند.
#   با این راه هیچ فایل HTML دست نمی‌خورد.
cp -r content/assets docs/assets

echo "── ۳٫۵) بخش اسکچ‌نوت: بازسازی از زیپ‌های ریشه ───────────"
# بخش اسکچ‌نوت (content/sketches/) از زیپ‌های ریشه ساخته می‌شود و تصاویرش
# در content/sketches/img/ است. چون docs/lib با cp -r content/. کپی می‌شود،
# این بخش خودبه‌خود منتشر می‌شود؛ فقط مطمئن می‌شویم ساخته شده است.
if [ -f build/build_sketch_library.py ]; then
  python3 build/build_sketch_library.py
fi
[ -d docs/lib/sketches/img ] || { echo "خطا: docs/lib/sketches/img ساخته نشد"; exit 1; }

echo "── ۳٫۶) بخش آزمایشگاه تعاملی ───────────────────────────"
if [ -f build/build_labs.py ]; then
  python3 build/build_labs.py
fi
[ -f docs/lib/labs/cardiac/simulator.html ] || { echo "خطا: شبیه‌ساز قلب در docs/lib/labs ساخته نشد"; exit 1; }
# بستهٔ PulmoLab باید کامل و بایت‌به‌بایت از زیپ ریشه بیرون آمده باشد؛ build_labs.py
# خودش --check دارد و فایل جاافتاده/ناهمسان را با کد خروج ۱ گزارش می‌کند.
python3 build/build_labs.py --check || { echo "خطا: بستهٔ آزمایشگاه ریه کامل نیست"; exit 1; }
[ -f docs/lib/labs/pulmolab/index.html ] || { echo "خطا: آزمایشگاه ریه در docs/lib/labs ساخته نشد"; exit 1; }
[ -f docs/lib/labs/pulmolab/data/manifest.json ] || { echo "خطا: manifest بستهٔ ریه ساخته نشد"; exit 1; }
[ "$(find docs/lib/labs/pulmolab -type f | wc -l)" -eq 122 ] || { echo "خطا: بستهٔ ریه ۱۲۲ فایل نیست"; exit 1; }
grep -q 'labs/pulmolab/index.html' docs/lib/index.html || { echo "خطا: نوار آزمایشگاه در صفحهٔ خانه به ریه پیوند نمی‌دهد"; exit 1; }

echo "── ۳٫۷) راستی‌آزمایی مشتق‌های اسکچ‌نوت ────────────────────"
# ⚠ اگر thumb/ و mid/ ساخته نشوند، گالری‌ها روی Pages آیکون شکسته می‌دهند.
#   این مرحله سخت‌گیرانه است و در صورت نبودِ فایل، انتشار را متوقف می‌کند.
python3 tests/check-sketch-refs.py || { echo "خطا: مشتق‌های اسکچ‌نوت کامل نیست"; exit 1; }

echo "── ۴) docs/.nojekyll ───────────────────────────────────"
touch docs/.nojekyll

echo "── ۵) اصلاح .gitignore (خط docs/lib/ باید برود) ─────────"
# ⚠ .gitignore اصلی «docs/lib/» را نادیده می‌گرفت؛ در نتیجه خروجی منتشرشده
#   هرگز کامیت نمی‌شد و Pages خالی می‌ماند.
sed -i '/^docs\/lib\/$/d' .gitignore
grep -q '^docs/lib/' .gitignore && { echo "خطا: docs/lib/ هنوز در .gitignore است"; exit 1; } || true

echo "── ۶) جایگذاری workflow نگهبان‌دار ──────────────────────"
# ⚠ workflow اصلی خطرناک بود: raw_src/ در آرشیو نیست. آزمایش شد که در این حالت
#   make_map.py نقشه را خالی می‌کند (خروجی: «0 فایل → {}») و build.py با کد ۰
#   تمام ۱۸۲ فایل HTML موجود در content/ را پاک می‌کند؛ سپس گام انتشار
#   «rm -rf docs/lib» کتابخانهٔ منتشرشده را نابود می‌کرد.
if [ -f .github/workflows/build.yml ] && ! grep -q "id: gate" .github/workflows/build.yml; then
  cp "$(dirname "$0")/build.yml" .github/workflows/build.yml
  echo "   workflow نگهبان‌دار جایگذاری شد."
else
  echo "   workflow از قبل نگهبان دارد یا وجود ندارد."
fi

echo "── ۷) راستی‌آزمایی ─────────────────────────────────────"
python3 - <<'PY'
import json, pathlib, sys
m = json.load(open('content/manifest.json'))
q = m['qbank']
keys = [s['key'] for s in m['subjects']]
checks = [
    ('counts.lessons == 320',  m['counts']['lessons'] == 320),
    ('counts.subjects == 14',  m['counts']['subjects'] == 14),
    ('qbank.total == 1990',    q['total'] == 1990),
    ('len(qbank.parts) == 14', len(q['parts']) == 14),
    ('جمع بخش‌ها == total',      sum(p['count'] for p in q['parts']) == q['total']),
    ('surgery در کلیدها',        'surgery' in keys),
    ('heme در کلیدها',           'heme' in keys),
    ('ophthalmology در کلیدها',  'ophthalmology' in keys),
    ('orthopedics در کلیدها',    'orthopedics' in keys),
    ('infectious در کلیدها',     'infectious' in keys),
    ('urology در کلیدها',        'urology' in keys),
    ('ent در کلیدها',            'ent' in keys),
    ('neuro در کلیدها',          'neuro' in keys),
    ('کلید اپ اورولوژی زیر جراحی نباشد',
     not any('urology-simforoush' in (x.get('appSubjectKeys') or [])
             for x in m['subjects'] if x['key'] != 'urology')),
    ('onco در کلیدها نباشد',     'onco' not in keys),
    ('کلید رزرو id نباشد',       'id' not in keys),
    ('docs/lib/manifest.json', pathlib.Path('docs/lib/manifest.json').is_file()),
    ('docs/lib/assets/theme/base.css', pathlib.Path('docs/lib/assets/theme/base.css').is_file()),
    ('docs/lib/assets/theme/qbank.js', pathlib.Path('docs/lib/assets/theme/qbank.js').is_file()),
    ('docs/lib/assets/theme/marks-lite.js', pathlib.Path('docs/lib/assets/theme/marks-lite.js').is_file()),
    ('docs/lib/assets/theme/marks-lite.css', pathlib.Path('docs/lib/assets/theme/marks-lite.css').is_file()),
    ('docs/assets/theme/marks-lite.js', pathlib.Path('docs/assets/theme/marks-lite.js').is_file()),
    ('docs/assets/theme/base.css', pathlib.Path('docs/assets/theme/base.css').is_file()),
    ('docs/assets/theme/qbank.js', pathlib.Path('docs/assets/theme/qbank.js').is_file()),
    ('docs/lib/qbank/data/sur-1.json', pathlib.Path('docs/lib/qbank/data/sur-1.json').is_file()),
    ('docs/lib/qbank/data/ortho.json', pathlib.Path('docs/lib/qbank/data/ortho.json').is_file()),
    ('docs/lib/qbank/data/inf.json', pathlib.Path('docs/lib/qbank/data/inf.json').is_file()),
    ('docs/lib/qbank/data/uro.json', pathlib.Path('docs/lib/qbank/data/uro.json').is_file()),
    ('docs/lib/qbank/data/ent.json', pathlib.Path('docs/lib/qbank/data/ent.json').is_file()),
    ('docs/lib/qbank/data/neuro.json', pathlib.Path('docs/lib/qbank/data/neuro.json').is_file()),
    ('docs/lib/qbank/neuro-standalone.html', pathlib.Path('docs/lib/qbank/neuro-standalone.html').is_file()),
    ('docs/lib/orthopedics/chapter-01.html', pathlib.Path('docs/lib/orthopedics/chapter-01.html').is_file()),
    ('docs/lib/ophthalmology/chapter-01.html', pathlib.Path('docs/lib/ophthalmology/chapter-01.html').is_file()),
    ('docs/lib/infectious/183-tuberculosis.html', pathlib.Path('docs/lib/infectious/183-tuberculosis.html').is_file()),
    ('docs/lib/subject/infectious-exam.html', pathlib.Path('docs/lib/subject/infectious-exam.html').is_file()),
    ('docs/lib/subject/urology.html', pathlib.Path('docs/lib/subject/urology.html').is_file()),
    ('docs/lib/subject/ent.html', pathlib.Path('docs/lib/subject/ent.html').is_file()),
    ('docs/lib/urology/chapter-01.html', pathlib.Path('docs/lib/urology/chapter-01.html').is_file()),
    ('docs/lib/urology/chapter-47.html', pathlib.Path('docs/lib/urology/chapter-47.html').is_file()),
    ('docs/lib/urology/manifest.json', pathlib.Path('docs/lib/urology/manifest.json').is_file()),
    ('docs/lib/ent/manifest.json', pathlib.Path('docs/lib/ent/manifest.json').is_file()),
    ('docs/lib/ent/32-appendix-c-ent-emergencies.html',
     pathlib.Path('docs/lib/ent/32-appendix-c-ent-emergencies.html').is_file()),
    ('docs/lib/subject/neuro.html', pathlib.Path('docs/lib/subject/neuro.html').is_file()),
    ('docs/lib/neurology/manifest.json', pathlib.Path('docs/lib/neurology/manifest.json').is_file()),
    ('docs/lib/neurology/cerebrovascular-diseases.html',
     pathlib.Path('docs/lib/neurology/cerebrovascular-diseases.html').is_file()),
    ('docs/lib/labs/pulmolab/index.html', pathlib.Path('docs/lib/labs/pulmolab/index.html').is_file()),
    ('docs/lib/labs/pulmolab/media/cxr/ATTRIBUTION.json',
     pathlib.Path('docs/lib/labs/pulmolab/media/cxr/ATTRIBUTION.json').is_file()),
    ('docs/.nojekyll', pathlib.Path('docs/.nojekyll').is_file()),
    ('raw_src منتشر نشده', not pathlib.Path('raw_src').exists()),
    # qbank/raw ورودی محلیِ git-ignore است (با qb_extract.py از بانک تک‌فایلی ساخته
    # می‌شود و در مخزن نمی‌ماند)؛ مهم این است که داخل درخت انتشار نرود.
    ('qbank/raw منتشر نشده', not pathlib.Path('docs/lib/qbank/raw').exists()),
]

# ---- هایلایت و اعتبار نویسنده در همهٔ صفحه‌های منتشرشده ----
import re
AUTHOR = 'مهدی محمدرحیمی'
# دو ابزار بخش «آزمایشگاه تعاملی» خودبسنده‌اند و عمداً دست نمی‌خورند (مثل
# tests/audit-library.py که آن‌ها را VENDORED می‌شناسد). اعتبار نویسندهٔ هر دو در
# صفحهٔ میزبان docs/lib/labs/index.html و در labs-manifest.json آمده است.
VENDORED = {'docs/lib/labs/cardiac/simulator.html'}
VENDORED_DIRS = ('docs/lib/labs/pulmolab/',)
no_credit, no_mark = [], []
for f in sorted(pathlib.Path('docs/lib').rglob('*.html')):
    rel = f.as_posix()
    if rel in VENDORED or rel.startswith(VENDORED_DIRS):
        continue
    t = f.read_text(encoding='utf-8', errors='replace')
    if not (re.search(r'نویسنده\s*[:：]', t) and AUTHOR in t) and not re.search(r'name="author"[^>]*' + AUTHOR, t):
        no_credit.append(str(f))
    # موتور خواننده یا با <script src> لینک می‌شود یا (درسنامه‌های مغز و اعصاب)
    # کامل درون خود فایل است؛ هر دو قبول است.
    has_reader = bool(re.search(r'<script[^>]+src="[^"]*medx-reader\.js', t)
                      or re.search(r'function\s+ensureMarksUI\b', t))
    has_lite = 'marks-lite' in t
    has_text = bool(re.search(r'class="sec__body"|class="sec-body"|class="content-section"'
                              r'|data-bank|qx__q|questionStem', t))
    if has_text and not (has_reader or has_lite):
        no_mark.append(str(f))
host = pathlib.Path('docs/lib/labs/index.html').read_text(encoding='utf-8', errors='replace') \
    if pathlib.Path('docs/lib/labs/index.html').is_file() else ''
checks += [
    (f'اعتبار نویسنده در همهٔ docs/lib ({len(no_credit)} جاافتاده)', not no_credit),
    (f'هایلایت در همهٔ صفحه‌های متنی ({len(no_mark)} جاافتاده)', not no_mark),
    ('اعتبار نویسندهٔ صفحهٔ میزبان آزمایشگاه‌ها', ('نویسنده' in host and AUTHOR in host)),
]
for extra in (no_credit + no_mark)[:6]:
    print('    · ' + extra)
bad = [n for n, ok in checks if not ok]
for n, ok in checks:
    print(('  ✓ ' if ok else '  ✗ ') + n)
if bad:
    sys.exit('\nمتوقف شد — این‌ها درست نبودند: ' + ', '.join(bad))
print('\n  همهٔ بررسی‌ها پاس شد.')
PY

echo "── ۸) کامیت ────────────────────────────────────────────"
git init -q -b main 2>/dev/null || git checkout -q -b main
# اگر هویت git تنظیم نشده باشد، به‌صورت محلی ست می‌شود تا کامیت شکست نخورد.
git config user.name  >/dev/null 2>&1 || git config user.name  "${GIT_AUTHOR_NAME:-mmr363637-afk}"
git config user.email >/dev/null 2>&1 || git config user.email "${GIT_AUTHOR_EMAIL:-mmr363637-afk@users.noreply.github.com}"
git add -A
git commit -q -m "init: کتابخانهٔ درسنامه‌های پزشکی — ۳۲۰ درسنامه، ۱۴ بخش آزمون، ۱٬۹۹۰ سؤال، ۲ آزمایشگاه"
echo "   $(git rev-list --count HEAD) کامیت، $(git ls-tree -r --name-only HEAD | wc -l) فایل"

cat <<'EOF'

── مراحل بعدی (دستی) ────────────────────────────────────
  gh repo create mmr363637-afk/med-library --public \
    --description "کتابخانهٔ درسنامه‌های پزشکی — قالب واحد، هویت رنگی هر درس" \
    --homepage "https://mmr363637-afk.github.io/med-library/lib/"

  cd med-library
  git remote add origin https://github.com/mmr363637-afk/med-library.git
  git push -u origin main

  # Pages: Source = Deploy from a branch, Branch = main, Folder = /docs
  gh api -X POST repos/mmr363637-afk/med-library/pages \
    -f "source[branch]=main" -f "source[path]=/docs"

  # Actions → General → Workflow permissions = Read and write
  gh api -X PUT repos/mmr363637-afk/med-library/actions/permissions/workflow \
    -f default_workflow_permissions=write -F can_approve_pull_request_reviews=false

⚠ workflow را با «Run workflow» اجرا نکن تا وقتی raw_src/ را در مخزن نگذاشته‌ای.
  با نگهبان فعلی بی‌خطر است (بازسازی را رد می‌کند و docs/lib کامیت‌شده دست‌نخورده
  می‌ماند)، ولی بازسازی واقعی نیاز به raw_src/ دارد.
EOF
