// ============================================================================
//  lessonLinks.ts — اتصال درسنامه‌ها به برنامه‌ریز
//  ----------------------------------------------------------------------------
//  این فایل را در ریپوی planner در مسیر  src/lib/lessonLinks.ts  بگذارید.
//  صفر وابستگی اضافه دارد، آفلاین‌پسند است و اگر محتوای درسنامه در دسترس
//  نباشد، اپ مثل قبل کار می‌کند (فقط دکمهٔ «درسنامه» نمایش داده نمی‌شود).
//
//  قاعدهٔ اتصال:
//    مبحث (Topic) → با subjectKey به درسنامه‌های همان درس وصل می‌شود.
//    کلیدهای درس در درسنامه‌ها همان کلیدهای پک‌های فلش‌کارت خودت است
//    (cardiology-nematpour، pediatrics-nelson، gynecology-beckmann …).
// ============================================================================

import type { Topic } from "../types";

/** آدرس مخزن محتوا — GitHub Pages همان ریپوی جدا */
//  ⚠️ پس از ساخت ریپو، فقط همین یک خط را به آدرس Pages خودت تغییر بده.
//  (اگر workflow موجود در .github/workflows/build.yml را فعال کنی، مسیر
//   https://<user>.github.io/<repo>/lib/  می‌شود)
export const LESSON_BASE =
  "https://mmr363637-afk.github.io/DATA/lib/";

export interface LessonMeta {
  id: string;
  subject: string;
  /** کلیدهای درس در خود اپ که این درسنامه به آن‌ها وصل می‌شود */
  appSubjectKeys?: string[];
  title: string;
  path: string;
  sections: number;
  words: number;
  minutes: number;
  flashcards: number;
  tables: number;
  mcq: number;
  source: string;
}

export interface LessonManifest {
  version: number;
  schema: string;
  updatedAt: string;
  basePath: string;
  index: string;
  counts: { subjects: number; lessons: number; minutes: number };
  subjects: {
    key: string;
    name: string;
    nameEn: string;
    hue: number;
    chroma: number;
    appSubjectKeys: string[];
    page: string;
    count: number;
    minutes: number;
  }[];
  lessons: LessonMeta[];
}

const CACHE_KEY = "ml-lesson-manifest-v1";
const TTL_MS = 6 * 60 * 60 * 1000; // ۶ ساعت

/** manifest را از کش یا شبکه می‌خواند؛ در حالت آفلاین از کش می‌آید. */
export async function loadLessonManifest(force = false): Promise<LessonManifest | null> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw && !force) {
      const cached = JSON.parse(raw) as { at: number; data: LessonManifest };
      if (Date.now() - cached.at < TTL_MS) return cached.data;
    }
  } catch {
    /* کش خراب → نادیده بگیر */
  }
  try {
    const res = await fetch(`${LESSON_BASE}manifest.json`, { cache: "no-cache" });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as LessonManifest;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
    return data;
  } catch {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? (JSON.parse(raw).data as LessonManifest) : null;
    } catch {
      return null;
    }
  }
}

/** درسنامه‌های مرتبط با یک مبحث بر اساس کلید درس. */
export function lessonsForTopic(manifest: LessonManifest | null, topic: Topic): LessonMeta[] {
  if (!manifest) return [];
  const key = (topic as unknown as { subjectKey?: string }).subjectKey;
  if (!key) return [];
  return manifest.lessons.filter((l) => l.appSubjectKeys?.includes(key));
}

/** درسنامه‌های یک درس. */
export function lessonsForSubject(manifest: LessonManifest | null, subjectKey: string): LessonMeta[] {
  if (!manifest) return [];
  return manifest.lessons.filter((l) => l.appSubjectKeys?.includes(subjectKey));
}

/** آدرس کامل یک درسنامه */
export function lessonUrl(lesson: LessonMeta): string {
  return LESSON_BASE + lesson.path;
}

/** صفحهٔ یک درس در کتابخانه */
export function subjectUrl(manifest: LessonManifest | null, subjectKey: string): string {
  const s = manifest?.subjects.find((x) => x.appSubjectKeys?.includes(subjectKey));
  return LESSON_BASE + (s ? s.page : "index.html");
}

// ---------------------------------------------------------------------------
//  نمونهٔ استفاده در یک کامپوننت (بعد از انتخاب مبحث):
//
//  const [manifest, setManifest] = useState<LessonManifest | null>(null);
//  useEffect(() => { loadLessonManifest().then(setManifest); }, []);
//  const lessons = lessonsForTopic(manifest, currentTopic);
//
//  {lessons.length > 0 && (
//    <a href={lessonUrl(lessons[0])} target="_blank" rel="noopener"
//       className="rounded-xl border px-3 py-2 text-sm">
//      📖 درسنامه: {lessons[0].title} · {lessons[0].minutes} دقیقه
//    </a>
//  )}
// ---------------------------------------------------------------------------
