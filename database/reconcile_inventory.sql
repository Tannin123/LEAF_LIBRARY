-- Safe reconciliation after reviewing inventory-before.json and taking a database backup.
-- Keep loan history; only remove availability from copies with active loans.
BEGIN;
UPDATE cuonsach c SET trangthai='ĐANG MƯỢN'
WHERE UPPER(COALESCE(c.trangthai,'')) IN ('SẴN SÀNG','SAN SANG','CÓ SẴN')
AND EXISTS (SELECT 1 FROM phieumuon p WHERE p.macuonsach=c.macuonsach
  AND (LOWER(COALESCE(p.trangthai,'')) LIKE '%đang mượn%' OR LOWER(COALESCE(p.trangthai,'')) LIKE '%quá hạn%'));
UPDATE dausach d SET
soluongtong=(SELECT COUNT(*) FROM cuonsach c WHERE c.madausach=d.madausach),
soluongsan=(SELECT COUNT(*) FROM cuonsach c WHERE c.madausach=d.madausach
  AND UPPER(COALESCE(c.trangthai,'')) IN ('SẴN SÀNG','SAN SANG','CÓ SẴN')
  AND NOT EXISTS(SELECT 1 FROM phieumuon p WHERE p.macuonsach=c.macuonsach
    AND (LOWER(COALESCE(p.trangthai,'')) LIKE '%đang mượn%' OR LOWER(COALESCE(p.trangthai,'')) LIKE '%quá hạn%')));
COMMIT;
