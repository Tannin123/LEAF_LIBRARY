-- Migration 013: Dọn dẹp bản ghi mồ côi/test cũ và đồng bộ tồn kho DAUSACH - CUONSACH

-- 1. Xóa yêu cầu mượn sách mồ côi (bạn đọc không còn trong bandoc)
DELETE FROM ixs_borrow_requests
WHERE mabandoc NOT IN (SELECT mabandoc FROM bandoc);

-- 2. Xóa các đề xuất sách test cũ được tạo bởi mã không phải bạn đọc (vd: 12026001)
DELETE FROM ixs_reader_book_suggestions
WHERE reader_id NOT IN (SELECT mabandoc FROM bandoc);

-- 3. Dọn các yêu cầu gia hạn còn trạng thái CHO DUYET nhưng phiếu mượn đã trả/kết thúc
DELETE FROM yeucaugiahan y
USING phieumuon pm
WHERE y.maphieumuon = pm.maphieumuon
  AND UPPER(COALESCE(y.trangthaiduyet, '')) IN ('CHO DUYET', 'CHỜ DUYỆT')
  AND (LOWER(COALESCE(pm.trangthai, '')) LIKE '%đã trả%' OR LOWER(COALESCE(pm.trangthai, '')) LIKE '%da tra%');

-- 4. Khôi phục các cuốn sách kẹt ở trạng thái 'ĐANG MƯỢN' nhưng không có phiếu mượn hoạt động tương ứng
UPDATE cuonsach c
SET trangthai = 'SẴN SÀNG'
WHERE c.trangthai = 'ĐANG MƯỢN'
  AND NOT EXISTS (
    SELECT 1 FROM phieumuon pm
    WHERE pm.macuonsach = c.macuonsach
      AND (LOWER(COALESCE(pm.trangthai, '')) LIKE '%đang mượn%' OR LOWER(COALESCE(pm.trangthai, '')) LIKE '%quá hạn%')
  );

-- 5. Đồng bộ lại soluongtong & soluongsan của dausach theo thực tế cuonsach
UPDATE dausach d
SET
  soluongtong = COALESCE(stats.total_cnt, 0),
  soluongsan = COALESCE(stats.ready_cnt, 0)
FROM (
  SELECT
    d2.madausach,
    COUNT(c.macuonsach)::int AS total_cnt,
    COUNT(c.macuonsach) FILTER (WHERE c.trangthai = 'SẴN SÀNG')::int AS ready_cnt
  FROM dausach d2
  LEFT JOIN cuonsach c ON c.madausach = d2.madausach
  GROUP BY d2.madausach
) stats
WHERE d.madausach = stats.madausach;
