-- Extend the existing reader/book relation; retain its primary key and all existing rows.
ALTER TABLE tusachcanhan
  ADD COLUMN IF NOT EXISTS ghichu TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS trangthaidoc VARCHAR(30) NOT NULL DEFAULT 'Chưa đọc',
  ADD COLUMN IF NOT EXISTS sotranghientai INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sotrangtong INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tusachcanhan ADD CONSTRAINT chk_tusach_progress
  CHECK (sotranghientai >= 0 AND sotrangtong >= 0 AND (sotrangtong = 0 OR sotranghientai <= sotrangtong));
ALTER TABLE tusachcanhan ADD CONSTRAINT chk_tusach_reading_status
  CHECK (trangthaidoc IN ('Chưa đọc','Đang đọc','Đã đọc'));
