ALTER TABLE phieudexuat ALTER COLUMN madexuat TYPE VARCHAR(80);
ALTER TABLE phieudexuat ADD COLUMN IF NOT EXISTS mabandoc VARCHAR(50) REFERENCES bandoc(mabandoc);
ALTER TABLE phieudexuat ALTER COLUMN manhanvien DROP NOT NULL;

CREATE TABLE chitietdexuat (
  machitietdexuat VARCHAR(20) PRIMARY KEY,
  madexuat VARCHAR(80) NOT NULL REFERENCES phieudexuat(madexuat) ON DELETE CASCADE,
  tensach VARCHAR(500) NOT NULL,
  tacgia VARCHAR(500),
  nhaxuatban VARCHAR(255),
  namxuatban INT CHECK (namxuatban > 0),
  soluongdexuat INT NOT NULL CHECK (soluongdexuat > 0),
  lydodexuat TEXT,
  lanxuatban VARCHAR(100),
  isbn VARCHAR(32),
  anhbia TEXT
);

CREATE INDEX chitietdexuat_phieu_idx ON chitietdexuat(madexuat);
CREATE INDEX phieudexuat_bandoc_idx ON phieudexuat(mabandoc, ngaydexuat DESC);

ALTER TABLE ixs_reader_book_suggestions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

INSERT INTO phieudexuat (madexuat, mabandoc, thongtinsach, ngaydexuat, trangthaiduyet, lydotuchoi)
SELECT s.id, b.mabandoc, LEFT(s.title, 255), s.submitted_at, s.status, LEFT(s.rejection_reason, 255)
FROM ixs_reader_book_suggestions s
JOIN bandoc b ON b.mabandoc = s.reader_id;

INSERT INTO chitietdexuat (
  machitietdexuat, madexuat, tensach, tacgia, nhaxuatban, namxuatban,
  soluongdexuat, lydodexuat, lanxuatban, isbn, anhbia
)
SELECT LEFT(MD5(s.id), 20), s.id, s.title, s.author, s.publisher,
       CASE WHEN s.publication_year > 0 THEN s.publication_year END,
       GREATEST(COALESCE(s.requested_quantity, 1), 1),
       s.reason, s.edition, s.isbn, s.cover_url
FROM ixs_reader_book_suggestions s
JOIN bandoc b ON b.mabandoc = s.reader_id;
