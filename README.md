# 🎯 ספרינטים - מערכת ניהול משימות צוות

מערכת פנימית לניהול עבודת צוות המשלבת:
- **אבני דרך (Rocks)** - יעדים רבעוניים אסטרטגיים
- **ספרינטים** - מחזורי עבודה של 1-2 שבועות
- **משימות (Stories)** - פריטי עבודה קונקרטיים
- **צוות** - ניהול חברי הצוות והקיבולת שלהם

## 🛠️ טכנולוגיות

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** Google OAuth 2.0

## 🚀 התקנה מקומית

### 1. התקנת Dependencies

```bash
npm run install:all
```

### 2. הגדרת משתני סביבה

צור קובץ `.env` בתיקיית `server`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/sprints"
SESSION_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3001/api/auth/google/callback"
CLIENT_URL="http://localhost:5173"
```

### 3. הגדרת Google OAuth

1. לך ל-[Google Cloud Console](https://console.cloud.google.com)
2. צור פרויקט חדש או בחר קיים
3. הפעל את Google+ API
4. צור OAuth 2.0 Credentials
5. הוסף Authorized redirect URI: `http://localhost:3001/api/auth/google/callback`

### 4. הקמת מסד נתונים

```bash
npm run db:push
npm run db:seed  # אופציונלי - נתוני דוגמה
```

### 5. הפעלה

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## 🌐 פריסה ל-Render

### 1. חיבור ל-GitHub

ודא שהפרויקט נמצא ב-GitHub repository.

### 2. יצירת שירותים ב-Render

**אפשרות א' - Blueprint (מומלץ):**
1. לך ל-Render Dashboard → New → Blueprint
2. חבר את ה-GitHub repo
3. Render יזהה את `render.yaml` ויצור הכל אוטומטית

**אפשרות ב' - ידני:**
1. צור PostgreSQL database
2. צור Web Service מה-repo
3. הגדר את משתני הסביבה

### 3. משתני סביבה ב-Render

הוסף ב-Environment:
- `GOOGLE_CLIENT_ID` - מ-Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - מ-Google Cloud Console  
- `GOOGLE_CALLBACK_URL` - `https://YOUR-APP.onrender.com/api/auth/google/callback`

### 4. עדכון Google OAuth

ב-Google Cloud Console, הוסף את ה-Redirect URI של Render:
`https://YOUR-APP.onrender.com/api/auth/google/callback`

## 📁 מבנה הפרויקט

```
sprints/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # קומפוננטות
│   │   ├── pages/         # דפים
│   │   └── App.jsx        # ראוטינג ראשי
│   └── index.html
├── server/                 # Express Backend
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── middleware/    # Authentication
│   │   ├── config/        # Passport config
│   │   └── index.js       # Server entry
│   └── prisma/
│       ├── schema.prisma  # DB schema
│       └── seed.js        # Sample data
├── render.yaml            # Render deployment
└── package.json           # Root scripts
```

## 📝 License

Private - Internal Use Only
