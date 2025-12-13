## QA Checklist (SPRINTS)

### Big Data
- [ ] כל endpoint שמחזיר רשימה: `limit/take` + pagination (cursor/skip) + סדר ברור.
- [ ] חיפוש בשרת (לא לטעון “הכל” ללקוח).
- [ ] ב־Prisma: `select` מינימלי, אין `include` עמוק בלי צורך.

### Multi‑tenant / Team scope
- [ ] כל query כולל `organizationId`.
- [ ] רלוונטי? מופעל `applyTeamReadScope(where, req)`.
- [ ] אין “דליפת נתונים” בין ארגונים/צוותים.

### UX / RTL
- [ ] Flow A בטפסים: יצירת parent → נשארים בעריכה → יצירה/קישור children.
- [ ] Deep-link: `?new=1`, `?edit=<id>`, `returnTo=...` עובד.
- [ ] רשימות ארוכות: collapsible + “טען עוד”.
- [ ] טווחי תאריכים מוצגים `dir="ltr"`.

### Stability
- [ ] אין `console.log` רועש בפרודקשן.
- [ ] טיפול ב־loading/error states בכל מסך.
- [ ] אין N+1 / אין `findMany()` לא מוגבל.


