-- QA: Sprint codes (sp-XX) + legacyName
-- Replace <ORG_ID> when filtering for a specific org

-- 1) invalid / missing
SELECT COUNT(*) AS invalid_sprint_names
FROM "Sprint"
WHERE name IS NULL OR name !~ '^sp-[0-9]+$';

-- 2) duplicates per organization (should return 0 rows)
SELECT "organizationId", name, COUNT(*) AS cnt
FROM "Sprint"
GROUP BY "organizationId", name
HAVING COUNT(*) > 1
ORDER BY cnt DESC;

-- 3) show any sprints that still have legacy-style names but no legacyName saved
SELECT id, "organizationId", name, "legacyName", "startDate", "endDate"
FROM "Sprint"
WHERE name !~ '^sp-[0-9]+$'
  AND ("legacyName" IS NULL OR "legacyName" = '')
ORDER BY "startDate" ASC;

-- 4) sample sprints for an org
SELECT id, name, "legacyName", "startDate", "endDate"
FROM "Sprint"
WHERE "organizationId" = '<ORG_ID>'
ORDER BY "startDate" ASC
LIMIT 50;


