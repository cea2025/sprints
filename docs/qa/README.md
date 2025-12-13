## QA Runbook (SPRINTS)

המטרה: תהליך QA עקבי שחוזר על עצמו בכל שינוי (במיוחד Big Data + Multi‑tenant).

### איך משתמשים בזה
- **שינויים ב־DB/Prisma**: להריץ בדיקות SQL מתוך `docs/qa/sql/`.
- **שינויים ב־API**: לוודא org-scoping + pagination + select מינימלי.
- **שינויים ב־UI**: לוודא Flow A, מודאלים דרך `?new=1` / `?edit=id`, RTL, loading/error states.

### פקודות שימושיות
- `npm run migrate:task-codes` (מה־root): ממספר מחדש משימות ל־`m-XX` לפי `createdAt`.
- `npm run migrate:sprint-codes` (מה־root): ממיר שמות ספרינטים ל־`sp-XX` ושומר `legacyName`.

### צ’קליסט קצר לכל שינוי
- **Data safety**: אין data-loss בלי אישור.
- **Org scoping**: כל query כולל `organizationId`.
- **Big Data**: רשימות עם `limit/take` + cursor + חיפוש.
- **UX**: ברירת מחדל סגור לרשימות ארוכות, “טען עוד”, תיקון RTL בתאריכים.


