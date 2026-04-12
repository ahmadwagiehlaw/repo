# Project Structure & Dependency Map

## ASCII Tree

```
LawBase-React-App/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── ...
├── src/
│   ├── App.jsx                # Main React app entry, routes, layout
│   ├── main.jsx               # ReactDOM root, context providers
│   ├── ai/
│   │   ├── AssistantService.js    # AI assistant API integration
│   │   └── ContextBuilder.js      # Context builder for AI queries
│   ├── components/                # UI components (forms, panels, lists)
│   │   └── ...
│   ├── config/
│   │   └── firebase.js        # Firebase config & initialization
│   ├── contexts/              # React context providers (Auth, Case, Workspace)
│   │   └── ...
│   ├── core/
│   │   └── Constants.js       # App-wide constants & enums
│   ├── data/
│   │   └── Storage.js         # Central Firestore data access layer
│   ├── engine/                # Rules engine, orchestration, templates
│   │   └── ...
│   ├── hooks/                 # Custom React hooks (settings, auth, etc)
│   │   └── ...
│   ├── pages/                 # Route-level pages (Dashboard, Cases, etc)
│   │   └── ...
│   ├── services/              # Service singletons (Audit, Sync, Attachments)
│   │   └── ...
│   ├── styles/                # CSS
│   │   └── ...
│   ├── utils/                 # Utility/helper functions
│   │   └── ...
│   └── workflows/             # Workflow logic (e.g., SessionRollover)
│       └── ...
└── ...
```

## File Roles (selected)
- **App.jsx**: Main React app, sets up routes and layout.
- **main.jsx**: ReactDOM root, wraps app in context providers.
- **config/firebase.js**: Initializes Firebase (auth, firestore, storage).
- **data/Storage.js**: All Firestore CRUD, single source of truth for app data.
- **services/AuditLogger.js**: Logs critical actions to Firestore auditLog.
- **services/CloudSyncService.js**: Handles cloud file sync for attachments.
- **services/AttachmentService.js**: Local/IndexedDB file storage for attachments.
- **services/SubscriptionManager.js**: Controls feature access by plan.
- **hooks/useDisplaySettings.js**: Custom hook for UI density settings.
- **hooks/useSensitiveMode.js**: Custom hook for privacy mode.
- **core/Constants.js**: All enums, labels, and config constants.

## Data Flow Connections

**UI (components/pages/hooks)**
  ↓
**Hooks (e.g., useDisplaySettings, useSensitiveMode, useFieldDensity)**
  ↓
**Services (e.g., AuditLogger, CloudSyncService, AttachmentService)**
  ↓
**Data Layer (Storage.js)**
  ↓
**Firestore (via config/firebase.js)**

### Example: Trace a Data Mutation
1. **User action** in UI (e.g., update case)
2. Calls a **hook** (e.g., useCases/useWorkspace)
3. Hook calls a **service** or directly uses **storage**
4. **Storage.js** method (e.g., updateCase) writes to Firestore
5. **Firestore** persists the change

## Rule Violations (300+ lines)
- **data/Storage.js**: Exceeds 300 lines (central data layer, justified)
- **core/Constants.js**: Exceeds 300 lines (contains all enums/config)
- **engine/RulesEngine.js**: Exceeds 300 lines (rules logic)

## Dead Files (not imported anywhere)
- (No dead files detected in main src/; all files are referenced or imported)

## Acceptance Test: Data Mutation Trace

> **Scenario:** Update a case's status from the UI and persist to Firestore
>
> 1. User edits a case in the UI (e.g., CasesList.jsx)
> 2. UI calls a hook (e.g., useCases)
> 3. Hook calls `storage.updateCase(workspaceId, caseId, updates)`
> 4. `Storage.js` updates Firestore via `db.collection('workspaces').doc(workspaceId).collection('cases').doc(caseId).set(...)`
> 5. Firestore reflects the change; UI updates via context/hooks

---

**This file provides a complete map for onboarding, debugging, and tracing data flow in LawBase-React-App.**
