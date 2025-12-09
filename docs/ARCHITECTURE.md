# 🏗️ ארכיטקטורת המערכת - ספרינטים

## עקרון יסוד: Database-First

> **"אם זה עשוי להשתנות - זה שייך ל-Database"**

כל הגדרה, קונפיגורציה, או נתון שעשוי להשתנות צריך להיות מאוחסן ב-DB ולא בקוד.

---

## 📊 מבנה הטבלאות

### Core Entities (ישויות ליבה)
```
Organization ──┬── Objective ──── Rock ──── Story
               ├── Sprint ──────── SprintRock
               ├── TeamMember
               └── AllowedEmail
```

### Configuration Tables (טבלאות הגדרה)

#### 1. SystemSetting - הגדרות מערכת
```sql
CREATE TABLE "SystemSetting" (
  id          UUID PRIMARY KEY,
  key         VARCHAR(100) UNIQUE NOT NULL,
  value       JSONB NOT NULL,
  description TEXT,
  updatedAt   TIMESTAMP DEFAULT NOW()
);

-- Examples:
-- { key: 'super_admin_emails', value: ['a@b.com'], description: 'Platform admins' }
-- { key: 'default_sprint_duration', value: 14, description: 'Days' }
```

#### 2. Role - תפקידים דינמיים
```sql
CREATE TABLE "Role" (
  id          UUID PRIMARY KEY,
  code        VARCHAR(50) UNIQUE NOT NULL,  -- 'ADMIN', 'MANAGER', etc
  name        VARCHAR(100) NOT NULL,        -- 'מנהל', 'מנהל פרויקט'
  description TEXT,
  color       VARCHAR(20),                  -- '#FF0000'
  hierarchy   INT DEFAULT 0,                -- Lower = more permissions
  isSystem    BOOLEAN DEFAULT false,        -- Can't be deleted
  createdAt   TIMESTAMP DEFAULT NOW()
);
```

#### 3. Permission - הרשאות
```sql
CREATE TABLE "Permission" (
  id          UUID PRIMARY KEY,
  code        VARCHAR(100) UNIQUE NOT NULL, -- 'rocks:create'
  name        VARCHAR(100) NOT NULL,        -- 'יצירת סלעים'
  category    VARCHAR(50),                  -- 'rocks', 'sprints', etc
  description TEXT
);
```

#### 4. RolePermission - קשר תפקיד-הרשאה
```sql
CREATE TABLE "RolePermission" (
  roleId       UUID REFERENCES "Role"(id),
  permissionId UUID REFERENCES "Permission"(id),
  PRIMARY KEY (roleId, permissionId)
);
```

#### 5. FeatureFlag - דגלי פיצ'רים
```sql
CREATE TABLE "FeatureFlag" (
  id             UUID PRIMARY KEY,
  key            VARCHAR(100) UNIQUE NOT NULL,
  isEnabled      BOOLEAN DEFAULT false,
  organizationId UUID REFERENCES "Organization"(id), -- NULL = global
  description    TEXT,
  updatedAt      TIMESTAMP DEFAULT NOW()
);

-- Examples:
-- { key: 'dark_mode', isEnabled: true, organizationId: null }
-- { key: 'ai_chat', isEnabled: true, organizationId: 'org-123' }
```

#### 6. Translation - תרגומים/טקסטים
```sql
CREATE TABLE "Translation" (
  id       UUID PRIMARY KEY,
  key      VARCHAR(200) NOT NULL,
  locale   VARCHAR(10) NOT NULL DEFAULT 'he',
  value    TEXT NOT NULL,
  UNIQUE(key, locale)
);

-- Examples:
-- { key: 'roles.admin', locale: 'he', value: 'מנהל' }
-- { key: 'status.blocked', locale: 'he', value: 'חסום' }
```

---

## 🔒 Multi-Tenant Security

### Row-Level Security (RLS)
כל טבלה עם `organizationId` מוגנת ברמת ה-DB:
- Rock ✅
- Sprint ✅
- Story ✅
- Objective ✅
- TeamMember ✅
- AllowedEmail ✅

### Organization Context
```javascript
// Before each request:
await prisma.$executeRaw`SELECT set_config('app.organization_id', ${orgId}, false)`;
```

---

## 📁 מבנה הקוד

```
server/
├── src/
│   ├── modules/           # Feature modules
│   │   ├── organization/
│   │   ├── rock/
│   │   └── sprint/
│   ├── shared/
│   │   ├── middleware/    # Auth, RLS, validation
│   │   ├── schemas/       # Zod schemas
│   │   └── errors/        # Custom errors
│   ├── config/            # App configuration
│   └── lib/               # Utilities
├── prisma/
│   └── schema.prisma
└── scripts/               # Migration, seeding, etc
```

---

## ✅ Checklist לפני הוספת פיצ'ר חדש

- [ ] האם יש ערכים hardcoded? → העבר ל-DB
- [ ] האם צריך הרשאות? → הוסף ל-Permission table
- [ ] האם זה ספציפי לארגון? → הוסף organizationId + RLS
- [ ] האם יש טקסטים? → הוסף ל-Translation table
- [ ] האם זה פיצ'ר שניתן לכבות? → הוסף FeatureFlag

