# ארכיטקטורת משתמשים - הצעה לשיפור

## 🎯 עקרונות מנחים

1. **אימייל הוא המזהה** - כל אדם מזוהה לפי האימייל שלו
2. **קישור אוטומטי** - כשמשתמש נכנס, הוא מקושר אוטומטית
3. **ללא כפילויות** - אדם אחד = רשומה אחת
4. **הרשאות ברורות** - מי יכול לעשות מה

---

## 📊 מבנה DB מוצע

### 1. User (משתמש מחובר)
```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique  // המזהה העיקרי
  googleId      String?  @unique  // אם התחבר עם Google
  name          String
  picture       String?
  isActive      Boolean  @default(true)
  isSuperAdmin  Boolean  @default(false)
  
  // Relations
  memberships   Membership[]  // הארגונים שהוא חבר בהם
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### 2. Membership (חברות בארגון)
**מאחד את TeamMember + OrganizationMember + AllowedEmail**

```prisma
model Membership {
  id              String   @id @default(uuid())
  
  // Who
  email           String   // האימייל (תמיד קיים)
  name            String   // השם (לתצוגה)
  userId          String?  // קישור ל-User (אחרי שהתחבר)
  user            User?    @relation(fields: [userId], references: [id])
  
  // Where
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  
  // What
  role            MemberRole @default(VIEWER)
  jobTitle        String?    // תפקיד (מנכ"ל, מפתח, וכו')
  capacity        Int?       // נקודות לספרינט
  isActive        Boolean    @default(true)
  
  // Owned items
  ownedRocks      Rock[]
  ownedStories    Story[]
  ownedTasks      Task[]
  ownedObjectives Objective[]
  
  // Audit
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  invitedBy       String?  // מי הזמין
  joinedAt        DateTime? // מתי התחבר בפועל
  
  @@unique([email, organizationId])  // אדם יכול להיות פעם אחת בארגון
  @@index([organizationId])
  @@index([userId])
  @@index([email])
}

enum MemberRole {
  VIEWER      // צופה בלבד
  MEMBER      // יכול לעדכן את שלו
  MANAGER     // יכול לנהל אחרים
  ADMIN       // מנהל מלא
  OWNER       // בעלים (לא ניתן להסיר)
}
```

---

## 🔄 תהליכים

### 1. הוספת חבר צוות (Admin)

```
Admin יוצר Membership:
  ├─ email: "david@company.com"
  ├─ name: "דוד כהן"
  ├─ role: MEMBER
  ├─ organizationId: "org-123"
  └─ userId: null (עדיין לא התחבר)
```

**אוטומטית:**
- ✅ האימייל מורשה להתחבר
- ✅ לא צריך ליצור AllowedEmail נפרד
- ✅ לא צריך לקשר ידנית

### 2. משתמש מתחבר לראשונה

```
User logs in with Google:
  ├─ email: "david@company.com"
  │
  └─ System checks:
      ├─ Find Membership where email = "david@company.com"
      ├─ If found:
      │   ├─ Create User record
      │   ├─ Link: membership.userId = user.id
      │   └─ ✅ Auto-connected!
      └─ If not found:
          └─ ❌ Login rejected
```

### 3. שינוי הרשאה

```
Admin changes role:
  ├─ membership.role = ADMIN
  └─ ✅ Immediate effect
```

### 4. יצירת ארגון חדש

```
User creates organization:
  ├─ Create Organization
  ├─ Create Membership:
  │   ├─ email: user.email
  │   ├─ name: user.name
  │   ├─ role: OWNER
  │   ├─ userId: user.id (כבר מחובר)
  │   └─ organizationId: new-org-id
  └─ ✅ User is owner
```

---

## 🆚 השוואה: לפני ואחרי

### לפני (המצב הנוכחי)
| פעולה | צעדים נדרשים |
|-------|-------------|
| הוספת חבר צוות | 1. צור TeamMember 2. צור AllowedEmail 3. המתן שיתחבר 4. קשר ידנית |
| התחברות | 1. בדוק AllowedEmail 2. צור User 3. **אין קישור אוטומטי** |
| שינוי הרשאה | 1. עדכן OrganizationMember 2. עדכן AllowedEmail (?) |

### אחרי (המוצע)
| פעולה | צעדים נדרשים |
|-------|-------------|
| הוספת חבר צוות | 1. צור Membership ← **זהו!** |
| התחברות | 1. בדוק Membership 2. צור User 3. **קישור אוטומטי** |
| שינוי הרשאה | 1. עדכן Membership ← **זהו!** |

---

## 📋 תוכנית מיגרציה

### שלב 1: יצירת הסכמה החדשה
- הוסף model Membership
- שמור את הישנים (TeamMember, OrganizationMember, AllowedEmail)

### שלב 2: מיגרציה של נתונים
```javascript
// For each organization:
//   For each TeamMember:
//     Find matching AllowedEmail
//     Find matching OrganizationMember
//     Create Membership with combined data
```

### שלב 3: עדכון הקוד
- עדכן routes להשתמש ב-Membership
- עדכן passport להשתמש ב-Membership
- עדכן frontend

### שלב 4: מחיקת הישן
- הסר TeamMember
- הסר OrganizationMember  
- הסר AllowedEmail

---

## ❓ שאלות לדיון

1. **האם לשמור היסטוריית הרשאות?** 
   - כן: צריך טבלת MembershipHistory
   - לא: פשוט יותר

2. **האם לתמוך במספר אימיילים לאדם?**
   - כן: טבלת UserEmail נפרדת
   - לא: אימייל אחד = אדם אחד

3. **מה קורה כשמוחקים Membership?**
   - Soft delete (isActive = false)
   - Hard delete + orphan items

---

## 🎯 יתרונות

1. ✅ **פשטות** - טבלה אחת במקום 3
2. ✅ **קישור אוטומטי** - אין עבודה ידנית
3. ✅ **ללא כפילויות** - אדם אחד = רשומה אחת
4. ✅ **הרשאות ברורות** - role אחד לכל ארגון
5. ✅ **קל לניהול** - מסך אחד לכל הפעולות

