#!/usr/bin/env bash
# ============================================================================
#  آماده‌سازی و انتشار کتابخانهٔ med-library
#  ----------------------------------------------------------------------------
#  این اسکریپت همان کارهایی را می‌کند که در سندباکس انجام و راستی‌آزمایی شد.
#  ورودی: آرشیو med-library.zip (یا پوشهٔ بازشدهٔ آن)
#  خروجی: مخزن آمادهٔ push با پوشهٔ docs/ منتشرشونده
#
# 用法:  bash prepare-med-library.sh /path/to/med-library.zip
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
    ('counts.lessons == 156',  m['counts']['lessons'] == 156),
    ('counts.subjects == 8',   m['counts']['subjects'] == 8),
    ('qbank.total == 790',     q['total'] == 790),
    ('len(qbank.parts) == 8',  len(q['parts']) == 8),
    ('جمع بخش‌ها == total',      sum(p['count'] for p in q['parts']) == q['total']),
    ('surgery در کلیدها',        'surgery' in keys),
    ('heme در کلیدها',           'heme' in keys),
    ('onco در کلیدها نباشد',     'onco' not in keys),
    ('docs/lib/manifest.json', pathlib.Path('docs/lib/manifest.json').is_file()),
    ('docs/lib/assets/theme/base.css', pathlib.Path('docs/lib/assets/theme/base.css').is_file()),
    ('docs/assets/theme/base.css', pathlib.Path('docs/assets/theme/base.css').is_file()),
    ('docs/lib/qbank/data/sur-1.json', pathlib.Path('docs/lib/qbank/data/sur-1.json').is_file()),
    ('docs/.nojekyll', pathlib.Path('docs/.nojekyll').is_file()),
    ('raw_src منتشر نشده', not pathlib.Path('raw_src').exists()),
]
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
git commit -q -m "init: کتابخانهٔ درسنامه‌های پزشکی — ۱۵۶ درسنامه، ۸ بخش، ۷۹۰ سؤال"
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
