-- QA: Task codes sequential (m-XX)
-- Replace <ORG_ID> when filtering for a specific org

-- 1) invalid / missing
SELECT COUNT(*) AS invalid_codes
FROM "Task"
WHERE code IS NULL OR code !~ '^m-[0-9]+$';

-- 2) duplicates per organization (should return 0 rows)
SELECT "organizationId", code, COUNT(*) AS cnt
FROM "Task"
GROUP BY "organizationId", code
HAVING COUNT(*) > 1
ORDER BY cnt DESC;

-- 3) rough contiguity check per org (min/max/range)
WITH per_org AS (
  SELECT
    "organizationId",
    COUNT(*) AS total,
    MIN(CAST(substring(code from 3) AS INT)) AS min_n,
    MAX(CAST(substring(code from 3) AS INT)) AS max_n
  FROM "Task"
  WHERE code ~ '^m-[0-9]+$'
  GROUP BY "organizationId"
)
SELECT *,
       (max_n - min_n + 1) AS range_size,
       (total = (max_n - min_n + 1)) AS looks_contiguous
FROM per_org
ORDER BY total DESC;

-- 4) sample oldest tasks for an org
SELECT id, "createdAt", code, title
FROM "Task"
WHERE "organizationId" = '<ORG_ID>'
ORDER BY "createdAt" ASC, id ASC
LIMIT 30;


