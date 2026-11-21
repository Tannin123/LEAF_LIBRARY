INSERT INTO cuonsach (
  macuonsach, madausach, mavach, tinhtrangvatly, trangthai,
  vitriluutru, gia, anhbia
)
SELECT
  'CS' || lpad((COALESCE((SELECT MAX(substring(macuonsach FROM '^CS([0-9]+)$')::int) FROM cuonsach WHERE macuonsach ~ '^CS[0-9]+$'), 0) + row_number() OVER (ORDER BY d.madausach, copy_number))::text, 3, '0'),
  d.madausach,
  NULL,
  'TỐT',
  'SẴN SÀNG',
  'A1 - Ngăn 1',
  d.gia,
  d.anhbia
FROM dausach d
CROSS JOIN LATERAL generate_series(1, GREATEST(COALESCE(d.soluongtong, 0), 0)) AS copies(copy_number)
WHERE d.madausach ~ '^DS[0-9]{3,}$'
  AND NOT EXISTS (
    SELECT 1 FROM cuonsach existing
    WHERE existing.madausach = d.madausach
  )
ON CONFLICT (macuonsach) DO NOTHING;

CREATE TABLE IF NOT EXISTS ixs_borrow_requests (
  madangky VARCHAR(80) PRIMARY KEY,
  mabandoc VARCHAR(50) NOT NULL,
  madausach VARCHAR(50) NOT NULL REFERENCES dausach(madausach),
  macuonsach VARCHAR(50) NOT NULL REFERENCES cuonsach(macuonsach),
  ngaydangky TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trangthai VARCHAR(50) NOT NULL DEFAULT 'CHO DUYET'
);

CREATE INDEX IF NOT EXISTS ixs_borrow_requests_reader_status_idx
  ON ixs_borrow_requests (mabandoc, trangthai);