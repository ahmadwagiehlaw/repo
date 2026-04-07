# LAWBASE_EXECUTION_BLUEPRINT+INVITE.md
**الإصدار:** 2.0  
**تاريخ الإنشاء:** 2026-04-04  
**الحالة:** مرجع تنفيذي وحيد — يحل محل كل الوثائق السابقة  
**الـ Stack:** React 18.3.1 + Vite 8 + Firebase Compat v9 + React Router v6

---

## جدول المحتويات

1. [ملخص المشروع](#1-ملخص-المشروع)
2. [المعمارية الفعلية](#2-المعمارية-الفعلية)
3. [ما تم إنجازه](#3-ما-تم-إنجازه)
4. [ما يجب تنفيذه — الخريطة الكاملة](#4-ما-يجب-تنفيذه)
5. [المرحلة A: تنظيف المشروع وتحديث الوثائق](#5-المرحلة-a)
6. [المرحلة B: تجزئة Giant Components](#6-المرحلة-b)
7. [المرحلة C: إصلاح P4 — Tasks UI Sync](#7-المرحلة-c)
8. [المرحلة D: إصلاح P6 — Print CSS](#8-المرحلة-d)
9. [المرحلة E: إكمال P11 — Mobile PWA](#9-المرحلة-e)
10. [المرحلة F: بناء P12 — Firebase Storage](#10-المرحلة-f)
11. [Invite Flow – Design Spec (MVP)](#invite-flow--design-spec-mvp)
12. [المرحلة G: بناء P13 — Subscription + Audit](#12-المرحلة-g)
13. [المرحلة H: Unit Tests](#13-المرحلة-h)
14. [المرحلة I: Performance + Launch Prep](#14-المرحلة-i)
15. [Firebase Schema Updates](#15-firebase-schema)
16. [قواعد العمل الذهبية](#16-قواعد-العمل)
17. [Acceptance Tests الشاملة](#17-acceptance-tests)

---

## 1. ملخص المشروع

**LawBase** هو نظام إدارة قضايا قانونية مصري، يعمل بالكامل كـ SPA (Single Page Application) باستخدام React + Firebase. المشروع انتقل بنجاح من Vanilla JS إلى React/Vite، وتم تنفيذ الـ Patches من P0 حتى P11 بدرجات متفاوتة.

**الهدف من هذا الملف:** مرجع تنفيذي واحد لإكمال كل شيء متبقي — من تنظيف الكود حتى الإطلاق.

---

## 2. المعمارية الفعلية

### هيكل المجلدات

```
LawBase/
├── .legacy/                    ← [يُنقل هنا] js/ + css/ + index.html القديم
├── LawBase-React-App/          ← المشروع الفعّال الوحيد
│   ├── public/
│   │   ├── manifest.json       ← [يحتاج إنشاء/تحديث] PWA
│   │   ├── sw.js               ← [يحتاج إنشاء] Service Worker
│   │   └── icons/              ← [يحتاج إنشاء] PWA icons
│   ├── src/
│   │   ├── main.jsx            ← نقطة الدخول
│   │   ├── App.jsx             ← Root + Routes + Layout
│   │   ├── config/
│   │   │   └── firebase.js     ← Firebase compat v9 config
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── CaseContext.jsx
│   │   │   └── WorkspaceContext.jsx
│   │   ├── engine/
│   │   │   ├── RulesEngine.js      ← 1370+ سطر — لا تعدل إلا بحذر
│   │   │   └── TemplateParser.js   ← [✅ تم تطويره] 22 tag + conditionals
│   │   ├── data/
│   │   │   └── Storage.js          ← Firestore abstraction (~20K سطر)
│   │   ├── workflows/
│   │   │   └── SessionRollover.js
│   │   ├── ai/
│   │   │   └── [AI integration files]
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Cases/
│   │   │   │   └── CaseDetails.jsx ← [⚠️ Giant] يحتاج تجزئة
│   │   │   ├── Sessions.jsx        ← [⚠️ Giant 61KB] يحتاج تجزئة
│   │   │   ├── Judgments.jsx       ← [⚠️ Giant 51KB] يحتاج تجزئة
│   │   │   ├── Tasks.jsx           ← [🟡] يحتاج مراجعة UI Sync
│   │   │   ├── Archive.jsx
│   │   │   ├── Templates.jsx       ← [✅ تم تطويره]
│   │   │   └── Settings.jsx
│   │   ├── components/
│   │   │   ├── AIPanel.jsx
│   │   │   ├── MobileNav.jsx
│   │   │   ├── sessions/           ← [يحتاج إنشاء] بعد التجزئة
│   │   │   ├── judgments/           ← [يحتاج إنشاء] بعد التجزئة
│   │   │   └── cases/
│   │   ├── hooks/                   ← [يحتاج إنشاء] Custom Hooks
│   │   ├── services/                ← [يحتاج إنشاء]
│   │   │   ├── SubscriptionManager.js  ← P13
│   │   │   └── AuditLogger.js          ← P13
│   │   └── utils/
│   │       ├── DateUtils.js
│   │       └── ArabicUtils.js
│   ├── package.json
│   └── vite.config.js
├── LAWBASE_EXECUTION_BLUEPRINT+INVITE.md  ← هذا الملف
├── MIGRATION_STATUS.md
└── FIREBASE_SCHEMA.md
```

### المبادئ المعمارية

```
1. React-first: لا نعدل أي شيء في مجلد .legacy
2. Context Pattern: AuthContext + CaseContext + WorkspaceContext = مصدر الحقيقة
3. Storage Abstraction: كل تعامل مع Firestore عبر Storage.js فقط
4. RulesEngine مستقل: يستقبل data ويُرجع نتائج — لا يعدل state مباشرة
5. RTL-first: كل CSS يبدأ من direction: rtl
6. Mobile-first: كل UI يُصمم للموبايل أولاً ثم يتوسع
```

---

## 3. ما تم إنجازه

| Patch | الاسم | النسبة | ملاحظة |
|-------|-------|--------|--------|
| P0 | الأساس + Storage | 100% | Firebase compat v9 + Contexts |
| P1 | Attachments | 100% | مكتمل |
| PIVOT | React Migration | 100% | نقطة تحول المشروع |
| PH0-2 | Vite + Data + Layout | 100% | بنية React كاملة |
| P2 | بادجات القضية | 100% | Flags + React State |
| P3 | أجندة الأحكام | 100% | Judgment Cards + Deadline Calc |
| P4 | Tasks + Smart Log | **90%** | UI Sync يحتاج مراجعة |
| P5 | Workspace Switcher | 100% | Context Pattern |
| P6 | Sessions + Print | **90%** | Print CSS يحتاج إصلاح |
| P7 | الأرشيف الذكي | 100% | مكتمل |
| P8 | Session Rollover | 100% | Workflow مستقل |
| P9 | Smart Templates | **95%** | ✅ تم التطوير — يحتاج اختبار Export |
| P10 | AI Assistant | 100% | AIPanel جاهز |
| P11 | Mobile PWA | **50%** | MobileNav فقط |
| DESIGN | Design Pass | 100% | مكتمل |
| P12 | Firebase Storage | **0%** | لم يبدأ |
| P13 | Subscription + Audit | **0%** | لم يبدأ |

---

## 4. ما يجب تنفيذه — الخريطة الكاملة

```
المرحلة A: تنظيف المشروع (يوم واحد)
   ├── A1: نقل Legacy لـ .legacy/
   ├── A2: تحديث MIGRATION_STATUS
   └── A3: تحديث README

المرحلة B: تجزئة Giant Components (3-4 أيام)
   ├── B1: تجزئة Sessions.jsx (61KB)
   ├── B2: تجزئة Judgments.jsx (51KB)
   └── B3: تجزئة CaseDetails.jsx

المرحلة C: إصلاح P4 — Tasks UI Sync (يوم واحد)
   ├── C1: أيقونة ⚙️ للمهام الآلية
   ├── C2: فلتر يدوي/آلي
   └── C3: Tooltip شرح القاعدة

المرحلة D: إصلاح P6 — Print CSS (يوم واحد)
   ├── D1: @media print كامل RTL
   ├── D2: Dialog اختيار الحقول
   └── D3: إخفاء UI عند الطباعة

المرحلة E: إكمال P11 — Mobile PWA (3-4 أيام)
   ├── E1: manifest.json + icons
   ├── E2: Service Worker + Offline
   ├── E3: Install prompt
   ├── E4: Camera Upload + Offline Queue
   ├── E5: Bottom Navigation
   └── E6: Responsive breakpoints

المرحلة F: بناء P12 — Firebase Storage (3-4 أيام)
   ├── F1: تفعيل Firebase Storage provider
   ├── F2: Security Rules
   ├── F3: Upload/Download في Storage.js
   ├── F4: Signed URLs
   └── F5: Migration path من Drive

المرحلة G: بناء P13 — Subscription + Audit (4-5 أيام)
   ├── G1: SubscriptionManager
   ├── G2: Feature Gating
   ├── G3: AuditLogger
   ├── G4: Audit UI في Settings
   └── G5: Plan/Billing UI

المرحلة H: Unit Tests (3 أيام)
   ├── H1: Setup Vitest
   ├── H2: RulesEngine tests
   ├── H3: TemplateParser tests
   └── H4: Storage tests

المرحلة I: Performance + Launch (2-3 أيام)
   ├── I1: React.lazy + Suspense
   ├── I2: React.memo + useMemo
   ├── I3: Error Boundary
   ├── I4: Build optimization
   └── I5: Soft launch checklist
```

**الجدول الزمني التقديري: 20-25 يوم عمل**

---

## 5. المرحلة A: تنظيف المشروع وتحديث الوثائق

### A1: نقل Legacy

**Prompt لـ Copilot:**

```
في مشروع LawBase (المجلد الرئيسي الذي يحتوي على LawBase-React-App/):

1. أنشئ مجلد `.legacy/` في الجذر
2. انقل المجلدات والملفات التالية إلى `.legacy/`:
   - js/
   - css/
   - index.html (الملف الذي في الجذر، ليس الذي في LawBase-React-App/)
   - أي ملفات HTML أخرى في الجذر

3. أضف `.legacy/` إلى `.gitignore`

4. لا تنقل أو تعدل أي شيء داخل LawBase-React-App/

الهدف: عزل الكود القديم نهائياً حتى لا يخطئ أي AI Agent أو مطور ويعدّل فيه.
```

### A2: تحديث README

**Prompt لـ Copilot:**

```
أنشئ ملف README.md في جذر المشروع بالمحتوى التالي:

# LawBase — نظام إدارة القضايا القانونية

## التشغيل
cd LawBase-React-App
npm install
npm run dev

## هيكل المشروع
- `LawBase-React-App/src/` — الكود الفعّال (React + Vite)
- `.legacy/` — كود Vanilla JS القديم (مُجمَّد — لا تعدّل)
- `LAWBASE_EXECUTION_BLUEPRINT+INVITE.md` — المرجع التنفيذي الشامل
- `MIGRATION_STATUS.md` — حالة التقدم

## القاعدة الذهبية
كل التعديلات تتم فقط داخل `LawBase-React-App/src/`.
لا تعدّل أبداً أي شيء في `.legacy/`.
```

---

## 6. المرحلة B: تجزئة Giant Components

### المشكلة
ملفات `Sessions.jsx` (61KB) و `Judgments.jsx` (51KB) و `CaseDetails.jsx` هي "God Components" — كل شيء في ملف واحد. هذا يعني:
- صعب الصيانة والتعديل
- أي خطأ يكسر الصفحة كاملة
- الـ AI Agents تفشل في التعامل معها بسبب حجمها

### B1: تجزئة Sessions.jsx

**الهيكل المستهدف:**

```
src/pages/Sessions/
├── index.jsx                  ← Re-export
├── Sessions.jsx               ← المكون الرئيسي (orchestrator فقط)
├── SessionsList.jsx           ← عرض قائمة الجلسات
├── SessionForm.jsx            ← إنشاء/تعديل جلسة
├── SessionDetails.jsx         ← عرض تفاصيل جلسة واحدة
├── SessionPrint.jsx           ← مكون الطباعة المنفصل
└── useSessionsData.js         ← Custom Hook لـ data fetching + state
```

**Prompt لـ Copilot:**

```
أقرأ الملف src/pages/Sessions.jsx بالكامل (61KB).

المطلوب تجزئته إلى المكونات التالية — بدون تغيير أي سلوك:

1. `src/pages/Sessions/useSessionsData.js`
   - Custom Hook يحتوي على:
     - كل useState و useEffect الخاصة بالبيانات
     - loadSessions, saveSesion, deleteSession
     - أي filtering/sorting logic
   - يُرجع: { sessions, loading, error, filters, actions }

2. `src/pages/Sessions/SessionsList.jsx`
   - يستقبل props: { sessions, onSelect, onDelete, selectedId }
   - يعرض القائمة الجانبية أو الجدول

3. `src/pages/Sessions/SessionForm.jsx`
   - يستقبل props: { session, onSave, onCancel, cases }
   - فورم الإنشاء والتعديل

4. `src/pages/Sessions/SessionDetails.jsx`
   - يستقبل props: { session, caseData }
   - عرض تفاصيل جلسة واحدة

5. `src/pages/Sessions/SessionPrint.jsx`
   - يستقبل props: { sessions, filters }
   - مكون الطباعة المنفصل مع @media print

6. `src/pages/Sessions/Sessions.jsx`
   - المكون الرئيسي — يستخدم useSessionsData + يُركب المكونات الفرعية
   - لا يحتوي على business logic مباشر

7. `src/pages/Sessions/index.jsx`
   - export { default } from './Sessions'

قواعد:
- لا تغيّر أي سلوك أو منطق
- حافظ على نفس الـ CSS styles
- حافظ على كل الـ imports من contexts و Storage
- اختبر إن الصفحة تعمل بنفس الطريقة تماماً بعد التجزئة
```

### B2: تجزئة Judgments.jsx

**نفس النمط:**

```
src/pages/Judgments/
├── index.jsx
├── Judgments.jsx              ← Orchestrator
├── JudgmentsList.jsx          ← عرض القائمة
├── JudgmentForm.jsx           ← إنشاء/تعديل حكم
├── JudgmentDetails.jsx        ← تفاصيل حكم + ميعاد طعن
├── AppealTracker.jsx          ← متابعة مواعيد الطعن
└── useJudgmentsData.js        ← Custom Hook
```

**Prompt لـ Copilot:**

```
أقرأ الملف src/pages/Judgments.jsx بالكامل (51KB).

المطلوب تجزئته بنفس نمط Sessions/:

1. `src/pages/Judgments/useJudgmentsData.js` — Hook للبيانات
2. `src/pages/Judgments/JudgmentsList.jsx` — عرض القائمة
3. `src/pages/Judgments/JudgmentForm.jsx` — فورم الإنشاء/التعديل
4. `src/pages/Judgments/JudgmentDetails.jsx` — تفاصيل الحكم
5. `src/pages/Judgments/AppealTracker.jsx` — متابعة مواعيد الطعن
6. `src/pages/Judgments/Judgments.jsx` — المكون الرئيسي (orchestrator)
7. `src/pages/Judgments/index.jsx` — re-export

قواعد:
- لا تغيّر أي سلوك أو منطق
- حافظ على نفس الـ CSS
- حافظ على الـ imports
- المكون الرئيسي يستخدم الـ Hook ويُركب المكونات
```

### B3: تجزئة CaseDetails.jsx

```
src/pages/Cases/
├── CaseDetails.jsx            ← Orchestrator
├── CaseHeader.jsx             ← عنوان القضية + البادجات
├── CaseInfo.jsx               ← بيانات القضية الأساسية
├── CaseParties.jsx            ← أطراف الدعوى
├── CaseTimeline.jsx           ← الجدول الزمني
├── CaseActions.jsx            ← الأزرار والإجراءات
├── CaseForm.jsx               ← فورم التعديل
└── useCaseDetails.js          ← Custom Hook
```

**Prompt لـ Copilot:**

```
أقرأ الملف src/pages/Cases/CaseDetails.jsx بالكامل.

المطلوب تجزئته:

1. `useCaseDetails.js` — Hook يحتوي على:
   - تحميل بيانات القضية
   - حساب Badges (من RulesEngine)
   - actions (save, delete, archive)

2. `CaseHeader.jsx` — عنوان + badges + status
3. `CaseInfo.jsx` — بيانات القضية الأساسية (read-only view)
4. `CaseParties.jsx` — أطراف الدعوى
5. `CaseTimeline.jsx` — timeline بالجلسات والأحكام
6. `CaseActions.jsx` — action buttons
7. `CaseForm.jsx` — فورم التعديل
8. `CaseDetails.jsx` — orchestrator يجمع كل شيء

لا تغيّر أي سلوك. حافظ على الـ CSS والـ imports.
```

---

## 7. المرحلة C: إصلاح P4 — Tasks UI Sync

### المشكلة
المهام الآلية (المُنشأة من RulesEngine) يجب تمييزها بوضوح عن اليدوية.

### المطلوب

**Prompt لـ Copilot:**

```
في ملف src/pages/Tasks.jsx:

1. أضف أيقونة ⚙️ بجانب كل مهمة لها `createdByRuleId` أو `isAutoGenerated: true`
   - المهام اليدوية تعرض أيقونة ✏️
   - الأيقونة تظهر في بداية عنوان المهمة

2. أضف فلتر في شريط الفلاتر العلوي:
   - "الكل" | "يدوية ✏️" | "آلية ⚙️"
   - الفلتر يعمل بـ useState ويُطبق على القائمة المعروضة

3. أضف Tooltip (title attribute) على أيقونة ⚙️:
   - النص: `أُنشئت تلقائياً بواسطة: {اسم القاعدة}` 
   - اسم القاعدة من `task.ruleDisplayName` أو `task.createdByRuleId`

4. تأكد إن ترتيب المهام: الأحدث أولاً (sortBy createdAt desc)

لا تغيّر أي منطق آخر في الملف.
```

---

## 8. المرحلة D: إصلاح P6 — Print CSS

### المطلوب

**Prompt لـ Copilot:**

```
في مشروع LawBase-React-App، أنشئ/عدّل ما يلي:

1. أنشئ ملف `src/styles/print.css` بالمحتوى:

@media print {
  /* إخفاء كل عناصر التنقل */
  nav, .sidebar, .mobile-nav, .page-header button,
  .filter-chip, .badge-btn, [role="navigation"] {
    display: none !important;
  }

  /* إعدادات الصفحة */
  @page {
    size: A4;
    margin: 1.5cm;
  }

  body {
    direction: rtl;
    font-family: 'Cairo', sans-serif;
    font-size: 13px;
    line-height: 1.8;
    color: #000;
    background: #fff;
  }

  /* منع قطع الجداول */
  table { page-break-inside: avoid; }
  tr { page-break-inside: avoid; }

  /* منع قطع العناوين */
  h1, h2, h3 {
    page-break-after: avoid;
    page-break-inside: avoid;
  }

  /* إخفاء العناصر التفاعلية */
  input, select, textarea, button {
    display: none !important;
  }

  /* الروابط */
  a { color: #000; text-decoration: none; }

  /* Cards تتحول لـ borders بسيطة */
  .dashboard-widget-card {
    box-shadow: none !important;
    border: 1px solid #ccc !important;
    page-break-inside: avoid;
  }
}

2. في `src/main.jsx`، أضف:
   import './styles/print.css';

3. في Sessions.jsx — أضف زر "طباعة" يستخدم window.print()
   مع class خاص .print-only يظهر فقط عند الطباعة ويحتوي على:
   - اسم مساحة العمل
   - تاريخ الطباعة
   - عنوان "جدول الجلسات"
```

---

## 9. المرحلة E: إكمال P11 — Mobile PWA

### E1: manifest.json

**Prompt لـ Copilot:**

```
أنشئ/عدّل الملف LawBase-React-App/public/manifest.json:

{
  "name": "LawBase — إدارة القضايا",
  "short_name": "LawBase",
  "description": "نظام إدارة القضايا القانونية",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "dir": "rtl",
  "lang": "ar",
  "background_color": "#ffffff",
  "theme_color": "#1e293b",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}

ثم أنشئ مجلد public/icons/ وضع فيه placeholder icons (يمكن استبدالها لاحقاً).
تأكد إن index.html في LawBase-React-App يحتوي على:
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#1e293b">
```

### E2: Service Worker

**Prompt لـ Copilot:**

```
في مشروع LawBase-React-App:

1. ثبّت vite-plugin-pwa:
   npm install -D vite-plugin-pwa

2. عدّل vite.config.js لإضافة PWA plugin:

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'firestore-cache', expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 } }
          }
        ]
      },
      manifest: false // نستخدم manifest.json الخاص بنا
    })
  ]
});
```

### E3: Install Prompt

**Prompt لـ Copilot:**

```
أنشئ ملف src/hooks/usePWAInstall.js:

import { useState, useEffect } from 'react';

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!installPrompt) return false;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    setInstallPrompt(null);
    setIsInstallable(false);
    return result.outcome === 'accepted';
  };

  return { isInstallable, install };
}

ثم في App.jsx أو MobileNav.jsx، أضف:
- زر "تثبيت التطبيق 📲" يظهر فقط لو isInstallable === true
- عند الضغط: await install()
```

### E4: Camera Upload

**Prompt لـ Copilot:**

```
أنشئ ملف src/components/CameraUpload.jsx:

مكون React يعمل كالتالي:
1. زر "📷 التقاط صورة" يفتح الكاميرا
2. يستخدم <input type="file" accept="image/*" capture="environment">
3. بعد الالتقاط: يعرض preview
4. زر "رفع" يحفظ الصورة عبر Storage.js
5. لو offline: يخزن في state محلي (in-memory queue) ويرفع لاحقاً عند العودة online

المكون يستقبل props:
- onUpload(file, metadata) — callback بعد الرفع
- caseId — لربط الصورة بالقضية
- label — نص الزر (default: "التقاط صورة")
```

### E5: Bottom Navigation

**Prompt لـ Copilot:**

```
عدّل ملف src/components/MobileNav.jsx ليكون Bottom Navigation كامل:

1. يظهر فقط على الشاشات أقل من 768px
2. 5 tabs ثابتة في الأسفل:
   - الرئيسية (Dashboard) — أيقونة 🏠
   - القضايا (Cases) — أيقونة ⚖️
   - الجلسات (Sessions) — أيقونة 📅
   - المهام (Tasks) — أيقونة ✅
   - المزيد (More) — أيقونة ☰ → يفتح drawer بباقي الصفحات

3. الـ tab النشط يتميز بلون مختلف
4. يستخدم react-router-dom useLocation() لتحديد الـ active tab
5. الـ drawer يحتوي على: الأحكام، الأرشيف، النماذج، الإعدادات، AI

Style:
- position: fixed; bottom: 0; width: 100%; z-index: 1000
- background: #fff; border-top: 1px solid #e2e8f0
- height: 60px; padding-bottom: env(safe-area-inset-bottom)
```

### E6: Responsive Breakpoints

**Prompt لـ Copilot:**

```
أنشئ/عدّل ملف src/styles/responsive.css:

/* Mobile: < 768px */
@media (max-width: 767px) {
  .page-layout-grid {
    grid-template-columns: 1fr !important;
  }
  .sidebar { display: none; }
  .mobile-only { display: block; }
  .desktop-only { display: none; }
  body { padding-bottom: 70px; } /* space for bottom nav */
}

/* Tablet: 768px - 1024px */
@media (min-width: 768px) and (max-width: 1024px) {
  .page-layout-grid {
    grid-template-columns: 240px 1fr !important;
  }
}

/* Desktop: > 1024px */
@media (min-width: 1025px) {
  .mobile-only { display: none; }
  .desktop-only { display: block; }
}

ثم import هذا الملف في main.jsx.
```

---

## 10. المرحلة F: بناء P12 — Firebase Storage

### الهدف
تفعيل Firebase Storage كمزود تخزين للمرفقات بدلاً من أو بالإضافة إلى Google Drive.

### F1: تفعيل Provider

**Prompt لـ Copilot:**

```
في ملف src/config/firebase.js:

أضف import لـ Firebase Storage:
import 'firebase/compat/storage';

وصدّر instance:
export const firebaseStorage = firebase.storage();

---

في ملف src/data/Storage.js:

أضف section جديد لـ File Storage:

// ─── File Storage (Firebase Storage) ────────────────────
async uploadFile(workspaceId, caseId, file, metadata = {}) {
  // المسار: workspaces/{wid}/cases/{cid}/attachments/{filename}
  const path = `workspaces/${workspaceId}/cases/${caseId}/attachments/${Date.now()}_${file.name}`;
  const ref = firebaseStorage.ref(path);
  const snapshot = await ref.put(file, { customMetadata: metadata });
  const url = await snapshot.ref.getDownloadURL();
  return { path, url, name: file.name, size: file.size, type: file.type };
}

async deleteFile(path) {
  await firebaseStorage.ref(path).delete();
}

async getFileUrl(path) {
  return await firebaseStorage.ref(path).getDownloadURL();
}

async listFiles(workspaceId, caseId) {
  const ref = firebaseStorage.ref(`workspaces/${workspaceId}/cases/${caseId}/attachments`);
  const result = await ref.listAll();
  return Promise.all(result.items.map(async (item) => ({
    name: item.name,
    path: item.fullPath,
    url: await item.getDownloadURL(),
  })));
}
```

### F2: Security Rules

**الملف:** `storage.rules` (في Firebase Console)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /workspaces/{workspaceId}/cases/{caseId}/attachments/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.resource.size < 10 * 1024 * 1024  // 10MB max
                   && request.resource.contentType.matches('image/.*|application/pdf|application/msword|application/vnd.openxmlformats.*');
      allow delete: if request.auth != null;
    }
  }
}
```

---

## Invite Flow – Design Spec (MVP)

### 1. Schema Changes

- إضافة subcollection جديدة لكل مساحة عمل:
  - `workspaces/{workspaceId}/invitations/{invitationId}`
- الحقول المقترحة في كل وثيقة دعوة:
  - `id`
  - `workspaceId`
  - `workspaceName`
  - `invitedEmail`
  - `invitedEmailNormalized`
  - `role` (`admin | lawyer | secretary | readonly`)
  - `status` (`pending | accepted | revoked | expired`)
  - `invitedByUid`
  - `invitedByName`
  - `createdAt`
  - `updatedAt`
  - `expiresAt`
  - `acceptedAt`
  - `acceptedByUid`
  - `note`
- قرار v1:
  - لا نستخدم `token` في النسخة الأولى.
  - الاعتماد على مطابقة البريد بعد تسجيل الدخول.
- الهدف من هذا القرار:
  - تقليل الاتساع.
  - عدم الحاجة إلى `email delivery` أو روابط دعوات معقدة في v1.

### 2. Storage / API Surface

أقل سطح دوال لازم في `Storage.js` مستقبلاً:

- `listWorkspaceInvitations(workspaceId)`
- `createWorkspaceInvitation(workspaceId, invitationData)`
- `revokeWorkspaceInvitation(workspaceId, invitationId)`
- `findPendingInvitationsForEmail(emailNormalized)`
- `acceptWorkspaceInvitation(workspaceId, invitationId, user)`

المسؤوليات باختصار:

- `listWorkspaceInvitations`: إرجاع دعوات `workspace` معينة.
- `createWorkspaceInvitation`: إنشاء دعوة جديدة بعد فحص:
  - أن البريد ليس عضوًا فعّالًا بالفعل.
  - عدم وجود دعوة `pending` أخرى لنفس البريد في نفس `workspace`.
- `revokeWorkspaceInvitation`: تغيير `status` إلى `revoked`.
- `findPendingInvitationsForEmail`: تستخدم بعد login للعثور على دعوات `pending` لبريد معيّن.
- `acceptWorkspaceInvitation`:
  - إنشاء/تحديث `members/{uid}`.
  - تحديث `users/{uid}.workspaceIds`.
  - ضبط `primaryWorkspaceId` فقط إذا كان فارغًا.

قواعد الوصول:

- الإنشاء والإلغاء: `owner/admin` فقط.
- القبول: المستخدم صاحب البريد المدعو فقط.

خارج هذا السطح في v1:

- `billing`.
- `email sending`.
- `owner transfer`.
- `advanced permissions`.

### 3. UI Scope

- مكان الواجهة في v1:
  - داخل تبويب `members` في صفحة الإعدادات الحالية.
- شروط إظهار واجهة الدعوات:
  - `hasTeamFeatures === true`.
  - و`canManageWorkspaceMembers === true`.

سلوك الخطط:

- على `free` أو `pro`:
  - قائمة `members` تبقى مرئية كما هي.
  - قسم الدعوات يظهر كرسالة توضيحية فقط:
    - الدعوات متاحة في خطة الفريق.
  - لا يظهر form فعلي لإنشاء دعوة.

- على `team` + `non-admin`:
  - يرى قائمة الأعضاء والدعوات إن عُرضت بشكل `read-only`.
  - لا يرى controls الإنشاء أو الإلغاء.

- على `team` + `owner/admin`:
  - form بسيطة لإنشاء دعوة:
    - حقل البريد.
    - اختيار الدور.
    - زر "إنشاء دعوة".
  - قائمة بالدعوات المعلقة `pending`.
  - زر لإلغاء الدعوة.

Microcopy أساسية:

- الدعوات متاحة في `team plan only`.
- إدارة الدعوات متاحة لـ `owner/admin` فقط.
- النسخة الأولى لا تتضمن إرسال بريد إلكتروني فعلي.

### 4. Acceptance Flow

القرار الرسمي في v1:

- القبول يتم عبر `auto-detect after login`.
- لا نستخدم route مخصص لقبول الدعوات في النسخة الأولى.

التسلسل:

1. `owner/admin` على خطة `team` ينشئ دعوة لبريد + `role`.
2. المدعو يسجل الدخول بحساب يطابق البريد.
3. النظام يبحث عن دعوات `pending` لبريد المستخدم بعد التطبيع.
4. إذا وجدت دعوة صالحة:
   - إنشاء أو تحديث `members/{uid}` بالدور المناسب و`isActive = true`.
   - إضافة `workspaceId` إلى `users/{uid}.workspaceIds`.
   - ضبط `primaryWorkspaceId` فقط إذا كان فارغًا.
   - تحويل حالة الدعوة إلى `accepted`.

شروط القبول:

- الدعوة في حالة `pending`.
- لم تنتهِ (`expiresAt` لم يمر).
- ليست `revoked`.
- البريد يطابق المستخدم الحالي.

### 5. State Machine

حالات الدعوة الرسمية في v1:

- `pending`
- `accepted`
- `revoked`
- `expired`

الانتقالات:

- `pending -> accepted`
- `pending -> revoked`
- `pending -> expired`

قواعد:

- `accepted` حالة نهائية.
- `revoked` حالة نهائية.
- `expired` حالة نهائية.
- لا يوجد "إعادة تفعيل" لدعوة في v1.
- لا تُنشأ دعوة `pending` جديدة إذا وجدت دعوة `pending` لنفس البريد ونفس `workspace`.

### 6. Acceptance Tests

أمثلة حالات قبول يجب تغطيتها باختبارات عند التنفيذ:

- مالك/مدير (`owner/admin`) على خطة `team` يستطيع إنشاء دعوة جديدة بنجاح.
- `owner/admin` على `free` أو `pro` لا يرى form إنشاء الدعوة، بل رسالة `plan gate` واضحة.
- `non-admin` على `team` لا يستطيع إنشاء أو إلغاء الدعوات، حتى لو رأى القائمة.
- لا يمكن إنشاء دعوة لبريد عضو فعّال موجود بالفعل في `members`.
- لا يمكن إنشاء دعوتين `pending` لنفس البريد في نفس `workspace`.
- عند تسجيل دخول مستخدم يحمل بريدًا مطابقًا لدعوة `pending`، تُقبل الدعوة وفقًا للتسلسل أعلاه.
- قبول الدعوة ينشئ أو يحدث سجل `members/{uid}` بالقيم الصحيحة.
- قبول الدعوة يحدّث `users/{uid}.workspaceIds`.
- قبول الدعوة لا يغيّر `primaryWorkspaceId` إذا كان مضبوطًا مسبقًا.
- دعوة في حالة `revoked` لا تُقبل.
- دعوة في حالة `expired` لا تُقبل.
- واجهة الدعوات لا توحي بوجود `email delivery` أو `billing` في v1.

### 7. Out of Scope

خارج نطاق Invite Flow MVP:

- أي منطق `billing` أو دفع.
- `email delivery` الفعلي.
- routes مخصصة لقبول الدعوات.
- `token-based invite links` ويمكن إضافتها في نسخة لاحقة.
- `owner transfer`.
- `advanced permissions matrix`.
- `audit logs`.
- `system admin console`.
- `invite reminders`.
- `bulk invitations`.

---

## 12. المرحلة G: بناء P13 — Subscription + Audit

### G1: SubscriptionManager

**Prompt لـ Copilot:**

```
أنشئ ملف src/services/SubscriptionManager.js:

/**
 * SubscriptionManager — يدير خطط الاشتراك وصلاحيات الميزات
 */

const PLANS = {
  free: {
    name: 'مجاني',
    maxCases: 10,
    maxUsers: 1,
    maxStorageMB: 100,
    features: {
      cases: true,
      sessions: true,
      judgments: true,
      tasks: true,
      templates: false,
      ai: false,
      archive: true,
      audit: false,
      firebaseStorage: false,
      teamMembers: false,
    }
  },
  pro: {
    name: 'احترافي',
    maxCases: 500,
    maxUsers: 1,
    maxStorageMB: 5000,
    features: {
      cases: true,
      sessions: true,
      judgments: true,
      tasks: true,
      templates: true,
      ai: true,
      archive: true,
      audit: false,
      firebaseStorage: true,
      teamMembers: false,
    }
  },
  team: {
    name: 'فريق',
    maxCases: -1, // unlimited
    maxUsers: 20,
    maxStorageMB: 50000,
    features: {
      cases: true,
      sessions: true,
      judgments: true,
      tasks: true,
      templates: true,
      ai: true,
      archive: true,
      audit: true,
      firebaseStorage: true,
      teamMembers: true,
    }
  }
};

export class SubscriptionManager {
  constructor(workspaceData) {
    this.plan = workspaceData?.plan || 'free';
    this.planData = PLANS[this.plan] || PLANS.free;
    this.expiresAt = workspaceData?.subscriptionExpiresAt || null;
  }

  isFeatureEnabled(featureName) {
    if (this.isExpired()) return PLANS.free.features[featureName] || false;
    return this.planData.features[featureName] || false;
  }

  isExpired() {
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  }

  canAddCase(currentCount) {
    if (this.planData.maxCases === -1) return true;
    return currentCount < this.planData.maxCases;
  }

  canAddUser(currentCount) {
    return currentCount < this.planData.maxUsers;
  }

  getPlanInfo() {
    return { ...this.planData, planId: this.plan, isExpired: this.isExpired() };
  }
}

export default SubscriptionManager;
```

### G2: Feature Gating Component

**Prompt لـ Copilot:**

```
أنشئ ملف src/components/FeatureGate.jsx:

import { useWorkspace } from '@/contexts/WorkspaceContext';
import { SubscriptionManager } from '@/services/SubscriptionManager';

/**
 * يخفي المحتوى لو الميزة غير متاحة في الخطة الحالية
 * Usage: <FeatureGate feature="ai"><AIPanel /></FeatureGate>
 */
export default function FeatureGate({ feature, children, fallback = null }) {
  const { currentWorkspace } = useWorkspace();
  const sub = new SubscriptionManager(currentWorkspace);

  if (!sub.isFeatureEnabled(feature)) {
    return fallback || (
      <div style={{
        padding: '40px 20px', textAlign: 'center', color: '#94a3b8',
        fontFamily: "'Cairo', sans-serif"
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔒</div>
        <div style={{ fontSize: '15px', fontWeight: 600 }}>هذه الميزة غير متاحة في خطتك الحالية</div>
        <div style={{ fontSize: '13px', marginTop: '4px' }}>
          قم بالترقية لخطة {sub.plan === 'free' ? 'احترافي' : 'فريق'} لتفعيلها
        </div>
      </div>
    );
  }

  return children;
}
```

### G3: AuditLogger

**Prompt لـ Copilot:**

```
أنشئ ملف src/services/AuditLogger.js:

import storage from '@/data/Storage.js';

/**
 * AuditLogger — يسجل كل العمليات المهمة (Team Plan فقط)
 * 
 * Firestore path: workspaces/{wid}/auditLog/{logId}
 */

const LOG_ACTIONS = {
  CASE_CREATE: 'case.create',
  CASE_UPDATE: 'case.update',
  CASE_DELETE: 'case.delete',
  CASE_ARCHIVE: 'case.archive',
  SESSION_CREATE: 'session.create',
  SESSION_UPDATE: 'session.update',
  JUDGMENT_CREATE: 'judgment.create',
  TASK_COMPLETE: 'task.complete',
  TEMPLATE_USE: 'template.use',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  SETTINGS_CHANGE: 'settings.change',
  FILE_UPLOAD: 'file.upload',
  FILE_DELETE: 'file.delete',
};

class AuditLogger {
  constructor() {
    this.enabled = false;
    this.workspaceId = null;
  }

  init(workspaceId, isTeamPlan) {
    this.workspaceId = workspaceId;
    this.enabled = isTeamPlan;
  }

  async log(action, details = {}, userId = null) {
    if (!this.enabled || !this.workspaceId) return;

    const entry = {
      action,
      details,
      userId: userId || 'unknown',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent || '',
    };

    try {
      await storage.addAuditLog(this.workspaceId, entry);
    } catch (err) {
      console.warn('[AuditLogger] Failed to log:', err);
    }
  }

  async getRecentLogs(limit = 50) {
    if (!this.enabled || !this.workspaceId) return [];
    return await storage.getAuditLogs(this.workspaceId, limit);
  }
}

export const auditLogger = new AuditLogger();
export { LOG_ACTIONS };
export default AuditLogger;
```

### G4: Storage.js — دوال Audit

**Prompt لـ Copilot:**

```
في ملف src/data/Storage.js أضف الدوال التالية:

async addAuditLog(workspaceId, entry) {
  const ref = db.collection('workspaces').doc(workspaceId)
    .collection('auditLog');
  return await ref.add(entry);
}

async getAuditLogs(workspaceId, limit = 50) {
  const ref = db.collection('workspaces').doc(workspaceId)
    .collection('auditLog')
    .orderBy('timestamp', 'desc')
    .limit(limit);
  const snap = await ref.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
```

### G5: Audit UI في Settings

**Prompt لـ Copilot:**

```
أنشئ ملف src/components/settings/AuditLogViewer.jsx:

مكون يعرض سجل العمليات في صفحة الإعدادات:

1. يستخدم auditLogger.getRecentLogs(50)
2. يعرض جدول بالأعمدة:
   - التاريخ والوقت
   - العملية (مترجمة للعربية)
   - المستخدم
   - التفاصيل
3. فلتر بالنوع (كل العمليات / قضايا / جلسات / أحكام / ملفات)
4. فلتر بالتاريخ (اليوم / آخر 7 أيام / آخر 30 يوم)
5. يظهر فقط لـ Team Plan عبر FeatureGate

ثم أضفه في Settings.jsx داخل tab "سجل العمليات".
```

---

## 13. المرحلة H: Unit Tests

### H1: Setup Vitest

**Prompt لـ Copilot:**

```
في مشروع LawBase-React-App:

1. ثبّت Vitest:
   npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom

2. أضف في vite.config.js:
   test: {
     globals: true,
     environment: 'jsdom',
     setupFiles: './src/test/setup.js',
   }

3. أنشئ src/test/setup.js:
   import '@testing-library/jest-dom';

4. أضف في package.json scripts:
   "test": "vitest",
   "test:run": "vitest run"
```

### H2: RulesEngine Tests

**Prompt لـ Copilot:**

```
أنشئ ملف src/engine/__tests__/RulesEngine.test.js:

اكتب tests للسيناريوهات التالية:

1. حساب ميعاد الطعن بالاستئناف (40 يوم من تاريخ الحكم)
2. حساب ميعاد الطعن بالنقض (60 يوم)
3. التعامل مع العطلات الرسمية المصرية
4. توليد مهمة آلية عند تغير حالة القضية
5. تقييم قاعدة مخصصة (custom rule)
6. التعامل مع بيانات ناقصة (missing fields)
7. التعامل مع تواريخ غير صالحة

اقرأ RulesEngine.js أولاً لفهم الـ API ثم اكتب الـ tests.
كل test يجب أن يكون مستقل (isolated) ولا يعتمد على Firebase.
```

### H3: TemplateParser Tests

**Prompt لـ Copilot:**

```
أنشئ ملف src/engine/__tests__/TemplateParser.test.js:

import { parseTemplate, getAvailableTags, getAvailableTagsGrouped, getAvailableConditions } from '../TemplateParser.js';

اكتب tests للسيناريوهات التالية:

1. استبدال tag عادي بقيمة موجودة
2. tag بدون قيمة يبقى كما هو
3. Conditional block يظهر لما الشرط متحقق
4. Conditional block يختفي لما الشرط غير متحقق
5. تاريخ يتفرمت بالعربية
6. حساب ميعاد الطعن من judgmentDate + appealDeadlineDays
7. template فاضي يرجع string فاضي
8. caseData فاضي — كل الـ tags تبقى
9. getAvailableTags ترجع array غير فاضي
10. getAvailableTagsGrouped ترجع categories صحيحة
11. getAvailableConditions ترجع 8 شروط
12. nested conditions (condition داخل condition)
```

---

## 14. المرحلة I: Performance + Launch Prep

### I1: Lazy Loading

**Prompt لـ Copilot:**

```
في ملف src/App.jsx:

استبدل كل الـ imports المباشرة للصفحات بـ lazy imports:

import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Cases = lazy(() => import('./pages/Cases'));
const Sessions = lazy(() => import('./pages/Sessions'));
const Judgments = lazy(() => import('./pages/Judgments'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Archive = lazy(() => import('./pages/Archive'));
const Templates = lazy(() => import('./pages/Templates'));
const Settings = lazy(() => import('./pages/Settings'));

وغلّف الـ Routes بـ Suspense:
<Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', fontFamily: "'Cairo'" }}>جاري التحميل...</div>}>
  <Routes>
    ...
  </Routes>
</Suspense>
```

### I2: Error Boundary

**Prompt لـ Copilot:**

```
أنشئ ملف src/components/ErrorBoundary.jsx:

import { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[LawBase Error]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '60px 20px', textAlign: 'center',
          fontFamily: "'Cairo', sans-serif", direction: 'rtl'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: '#1e293b', marginBottom: '8px' }}>حدث خطأ غير متوقع</h2>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>
            {this.state.error?.message || 'خطأ غير معروف'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{
              padding: '10px 24px', borderRadius: '8px', border: 'none',
              background: '#1e293b', color: '#fff', cursor: 'pointer',
              fontFamily: "'Cairo', sans-serif", fontSize: '14px'
            }}
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

ثم في App.jsx، غلّف كل شيء بـ ErrorBoundary:
<ErrorBoundary>
  <AuthProvider>
    ...
  </AuthProvider>
</ErrorBoundary>
```

### I3: Build Optimization

**Prompt لـ Copilot:**

```
عدّل vite.config.js لإضافة:

build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'firebase': ['firebase/compat/app', 'firebase/compat/auth', 'firebase/compat/firestore'],
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
      }
    }
  },
  chunkSizeWarningLimit: 600,
}
```

### I4: Soft Launch Checklist

```
□ كل الصفحات تفتح بدون errors في Console
□ تسجيل الدخول يعمل (Firebase Auth)
□ إنشاء قضية جديدة + حفظ + تحميل
□ إنشاء جلسة + ربطها بقضية
□ إنشاء حكم + حساب ميعاد الطعن
□ المهام الآلية تظهر بعد تغيير حالة القضية
□ النماذج: إنشاء + معاينة + طباعة
□ الأرشيف: أرشفة قضية + استرجاعها
□ AI Panel: إرسال سؤال + استقبال رد
□ الإعدادات: تغيير Workspace + حفظ
□ Mobile: التطبيق responsive + Bottom Nav يعمل
□ Offline: الصفحات الأساسية تفتح بدون إنترنت
□ Print: طباعة الجلسات تخرج صحيحة RTL
□ لا console errors في Production build
□ Lighthouse score > 80 (Performance, PWA)
```

---

## 15. Firebase Schema Updates

### مطلوب إضافته لـ FIREBASE_SCHEMA.md

```javascript
// ─── Templates Collection ───────────────────────────────
// Path: workspaces/{wid}/templates/{templateId}
{
  name: string,           // "مذكرة دفاع — نموذج أساسي"
  type: string,           // memo | lawsuit | letter | notice | report | appeal | poa | custom
  content: string,        // HTML content with {{tags}}
  isShared: boolean,      // مشترك في الـ workspace
  createdBy: string,      // userId
  createdAt: timestamp,
  updatedAt: timestamp,
  usageCount: number,     // عدد مرات الاستخدام
}

// ─── Audit Log Collection (Team Plan only) ──────────────
// Path: workspaces/{wid}/auditLog/{logId}
{
  action: string,         // "case.create" | "session.update" | etc.
  details: object,        // { caseId: "...", changes: {...} }
  userId: string,
  timestamp: string,      // ISO 8601
  userAgent: string,
}

// ─── Workspace Subscription Fields ──────────────────────
// Added to: workspaces/{wid}
{
  plan: string,                    // "free" | "pro" | "team"
  subscriptionExpiresAt: string,   // ISO 8601 or null
  maxCases: number,
  maxUsers: number,
  maxStorageMB: number,
}
```

---

## 16. قواعد العمل الذهبية

```
قبل إغلاق أي مرحلة:
━━━━━━━━━━━━━━━━━━━━
1. ✅ الـ acceptance tests في القسم 16 كلها اجتازت
2. ✅ لا regression في الصفحات الأخرى
3. ✅ MIGRATION_STATUS.md اتحدّث
4. ✅ FIREBASE_SCHEMA.md اتحدّث لو في schema change
5. ✅ commit message واضح بالعربية

قواعد الكود:
━━━━━━━━━━━
1. كل التعديلات في LawBase-React-App/src/ فقط
2. لا تعدّل .legacy/ أبداً
3. لا تعدّل RulesEngine.js إلا بحذر شديد وبعد كتابة test
4. كل component جديد = ملف منفصل
5. لا God Components — أقصى حجم 300 سطر
6. كل Custom Hook = ملف منفصل في hooks/
7. Styles: inline objects أو CSS modules — لا styled-components
8. كل import من Storage.js عبر `import storage from '@/data/Storage.js'`
9. RTL أولاً في كل CSS
10. Arabic text في UI — English في code comments OK

قواعد AI Agent (Copilot / Codex):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. اقرأ الملف الأصلي كاملاً قبل التعديل
2. لا تحذف كود موجود إلا لو مطلوب صراحة
3. حافظ على الـ imports الموجودة
4. لا تضف dependencies بدون إذن
5. اختبر إن الصفحة تفتح بدون errors بعد كل تعديل
```

---

## 17. Acceptance Tests الشاملة

### P9 — Smart Templates (✅ مكتمل — يحتاج اختبار)

```
□ T9.1  صفحة النماذج تفتح بدون errors
□ T9.2  زر "تحميل النماذج الافتراضية" يُنشئ 3 نماذج
□ T9.3  اختيار نموذج يعرض المحتوى في المحرر
□ T9.4  Toolbar: Bold, Italic, Underline تعمل
□ T9.5  Toolbar: Alignment (يمين، وسط، يسار) تعمل
□ T9.6  إدراج متغير → Tag يظهر في المحرر
□ T9.7  إدراج شرط → Block يظهر {{#لو_مدعي}} ... {{/لو_مدعي}}
□ T9.8  معاينة مع قضية → Tags تُستبدل بالبيانات
□ T9.9  Conditional block يظهر/يختفي حسب بيانات القضية
□ T9.10 تصدير للطباعة → نافذة طباعة RTL
□ T9.11 نسخ نموذج → نسخة جديدة بدون ID
□ T9.12 حذف نموذج → يختفي من القائمة
□ T9.13 فلتر القائمة الجانبية يعمل
□ T9.14 تحذير "تعديلات غير محفوظة" يظهر
```

### المرحلة A — تنظيف المشروع

```
□ TA.1 مجلد .legacy/ موجود ويحتوي على js/ + css/
□ TA.2 لا يوجد مجلد js/ في الجذر
□ TA.3 README.md موجود وصحيح
□ TA.4 MIGRATION_STATUS.md محدّث
```

### المرحلة B — تجزئة Giant Components

```
□ TB.1 Sessions/ مجلد يحتوي على 7 ملفات
□ TB.2 صفحة الجلسات تعمل بنفس السلوك القديم
□ TB.3 Judgments/ مجلد يحتوي على 7 ملفات
□ TB.4 صفحة الأحكام تعمل بنفس السلوك القديم
□ TB.5 CaseDetails مُجزأ لـ 8 ملفات
□ TB.6 صفحة تفاصيل القضية تعمل بنفس السلوك القديم
□ TB.7 لا ملف يتجاوز 300 سطر
```

### المرحلة C — P4 Tasks

```
□ TC.1 المهام الآلية تعرض أيقونة ⚙️
□ TC.2 المهام اليدوية تعرض أيقونة ✏️
□ TC.3 فلتر "يدوية/آلية" يعمل
□ TC.4 Tooltip يعرض اسم القاعدة على ⚙️
```

### المرحلة D — P6 Print

```
□ TD.1 @media print يخفي كل الـ navigation
□ TD.2 الطباعة RTL مع خط Cairo
□ TD.3 الجداول لا تنقطع بين الصفحات
□ TD.4 print.css مستورد في main.jsx
```

### المرحلة E — P11 Mobile PWA

```
□ TE.1 manifest.json موجود وصحيح
□ TE.2 Service Worker يعمل (Network tab)
□ TE.3 Install prompt يظهر على Chrome Android
□ TE.4 Camera Upload يعمل على Mobile
□ TE.5 Bottom Navigation يظهر تحت 768px
□ TE.6 5 tabs + drawer للمزيد
□ TE.7 Active tab مُميَّز
□ TE.8 Layout responsive على 320px, 768px, 1024px
```

### المرحلة F — P12 Firebase Storage

```
□ TF.1 رفع ملف يعمل
□ TF.2 تحميل ملف يعمل
□ TF.3 حذف ملف يعمل
□ TF.4 Security rules تمنع الملفات > 10MB
□ TF.5 قائمة الملفات تعرض صح
```

### المرحلة G — P13 Subscription + Audit

```
□ TG.1 SubscriptionManager يحدد الخطة صح
□ TG.2 FeatureGate يخفي الميزة لو مش في الخطة
□ TG.3 FeatureGate يعرض رسالة "مش متاحة"
□ TG.4 AuditLogger يسجل عمليات في Firestore
□ TG.5 AuditLogViewer يعرض آخر 50 عملية
□ TG.6 فلتر النوع والتاريخ يعمل
```

### المرحلة H — Tests

```
□ TH.1 vitest يعمل بدون errors
□ TH.2 RulesEngine tests كلها pass
□ TH.3 TemplateParser tests كلها pass
□ TH.4 npm run test:run ينجح بالكامل
```

### المرحلة I — Performance

```
□ TI.1 Lazy loading يعمل (chunks منفصلة في Network)
□ TI.2 ErrorBoundary يمسك الأخطاء
□ TI.3 Build ينجح بدون warnings
□ TI.4 Lighthouse Performance > 80
□ TI.5 Lighthouse PWA > 80
□ TI.6 Soft Launch Checklist كله ✅
```

---

## نهاية الملف

```
هذا الملف هو المرجع الوحيد لإكمال مشروع LawBase.
أي تعارض مع وثائق سابقة — هذا الملف يفوز.
آخر تحديث: 2026-04-04
```


