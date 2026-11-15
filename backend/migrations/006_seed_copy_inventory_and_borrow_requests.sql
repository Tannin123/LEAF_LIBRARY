INSERT INTO cuonsach (
  macuonsach, madausach, mavach, tinhtrangvatly, trangthai,
  vitriluutru, gia, anhbia
)
SELECT
  d.madausach || '-' || lpad(copy_number::text, 2, '0'),
  d.madausach,
  NULL,
  'TỐT',
  'SẴN SÀNG',
  'A1 - Ngăn 1',
  d.gia,
  d.anhbia
FROM dausach d
CROSS JOIN LATERAL generate_series(1, GREATEST(COALESCE(d.soluongtong, 0), 0)) AS copies(copy_number)
WHERE d.madausach LIKE 'SEED%'
  AND NOT EXISTS (
    SELECT 1 FROM cuonsach existing
    WHERE existing.macuonsach = d.madausach || '-' || lpad(copy_number::text, 2, '0')
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