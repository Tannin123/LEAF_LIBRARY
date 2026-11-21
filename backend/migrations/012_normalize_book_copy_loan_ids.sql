-- Migration 012: Chuẩn hóa toàn bộ mã Đầu sách (DS00..), Cuốn sách (CS00..), Phiếu mượn (PM...) trong CSDL hiện có
DO $$
DECLARE
  r RECORD;
  new_id TEXT;
  next_num INT;
BEGIN
  -- 1. Chuẩn hóa DAUSACH (madausach -> DS001, DS002, ...)
  SELECT COALESCE(MAX(substring(madausach FROM '^DS([0-9]+)$')::int), 0)
  INTO next_num
  FROM dausach
  WHERE madausach ~ '^DS[0-9]{3,}$';

  FOR r IN
    SELECT madausach AS old_id
    FROM dausach
    WHERE madausach !~ '^DS[0-9]{3,}$'
    ORDER BY
      CASE
        WHEN madausach ~ '^SEED[0-9]+$' THEN 0
        WHEN madausach ~ '^DSIT[0-9]+$' THEN 1
        ELSE 2
      END,
      madausach ASC
  LOOP
    LOOP
      next_num := next_num + 1;
      new_id := 'DS' || lpad(next_num::text, 3, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM dausach WHERE madausach = new_id);
    END LOOP;

    INSERT INTO dausach (
      madausach, madanhmuc, tensach, tacgia, theloai, chude, khoa,
      soluongtong, soluongsan, nhaxuatban, namxuatban, phienban, gia, anhbia
    )
    SELECT
      new_id, madanhmuc, tensach, tacgia, theloai, chude, khoa,
      soluongtong, soluongsan, nhaxuatban, namxuatban, phienban, gia, anhbia
    FROM dausach
    WHERE madausach = r.old_id;

    UPDATE cuonsach SET madausach = new_id WHERE madausach = r.old_id;

    IF to_regclass('public.chitietphieunhap') IS NOT NULL THEN
      UPDATE chitietphieunhap SET madausach = new_id WHERE madausach = r.old_id;
    END IF;

    IF to_regclass('public.tusachcanhan') IS NOT NULL THEN
      DELETE FROM tusachcanhan t_old
      WHERE t_old.madausach = r.old_id
        AND EXISTS (
          SELECT 1 FROM tusachcanhan t_new
          WHERE t_new.mabandoc = t_old.mabandoc AND t_new.madausach = new_id
        );
      UPDATE tusachcanhan SET madausach = new_id WHERE madausach = r.old_id;
    END IF;

    IF to_regclass('public.danhsachcho') IS NOT NULL THEN
      DELETE FROM danhsachcho d_old
      WHERE d_old.madausach = r.old_id
        AND EXISTS (
          SELECT 1 FROM danhsachcho d_new
          WHERE d_new.mabandoc = d_old.mabandoc AND d_new.madausach = new_id
        );
      UPDATE danhsachcho SET madausach = new_id WHERE madausach = r.old_id;
    END IF;

    IF to_regclass('public.ixs_borrow_requests') IS NOT NULL THEN
      UPDATE ixs_borrow_requests SET madausach = new_id WHERE madausach = r.old_id;
    END IF;

    DELETE FROM dausach WHERE madausach = r.old_id;
  END LOOP;

  -- 2. Chuẩn hóa CUONSACH (macuonsach -> CS001, CS002, ...)
  SELECT COALESCE(MAX(substring(macuonsach FROM '^CS([0-9]+)$')::int), 0)
  INTO next_num
  FROM cuonsach
  WHERE macuonsach ~ '^CS[0-9]{3,}$';

  FOR r IN
    SELECT macuonsach AS old_id
    FROM cuonsach
    WHERE macuonsach !~ '^CS[0-9]{3,}$'
    ORDER BY madausach ASC, macuonsach ASC
  LOOP
    LOOP
      next_num := next_num + 1;
      new_id := 'CS' || lpad(next_num::text, 3, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM cuonsach WHERE macuonsach = new_id);
    END LOOP;

    UPDATE cuonsach SET mavach = NULL WHERE macuonsach = r.old_id;

    INSERT INTO cuonsach (
      macuonsach, madausach, mavach, tinhtrangvatly, trangthai, vitriluutru, gia, anhbia
    )
    SELECT
      new_id, madausach, new_id, tinhtrangvatly, trangthai, vitriluutru, gia, anhbia
    FROM cuonsach
    WHERE macuonsach = r.old_id;

    UPDATE phieumuon SET macuonsach = new_id WHERE macuonsach = r.old_id;

    IF to_regclass('public.ixs_borrow_requests') IS NOT NULL THEN
      UPDATE ixs_borrow_requests SET macuonsach = new_id WHERE macuonsach = r.old_id;
    END IF;

    DELETE FROM cuonsach WHERE macuonsach = r.old_id;
  END LOOP;

  -- 3. Chuẩn hóa PHIEUMUON (maphieumuon -> PM001, PM002, ...)
  SELECT COALESCE(MAX(substring(maphieumuon FROM '^PM([0-9]+)$')::int), 0)
  INTO next_num
  FROM phieumuon
  WHERE maphieumuon ~ '^PM[0-9]{3,}$';

  FOR r IN
    SELECT maphieumuon AS old_id
    FROM phieumuon
    WHERE maphieumuon !~ '^PM[0-9]{3,}$'
    ORDER BY ngaymuon ASC NULLS LAST, maphieumuon ASC
  LOOP
    LOOP
      next_num := next_num + 1;
      new_id := 'PM' || lpad(next_num::text, 3, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM phieumuon WHERE maphieumuon = new_id);
    END LOOP;

    INSERT INTO phieumuon (
      maphieumuon, mabandoc, manhanvien, macuonsach, ngaymuon, ngayhentra, ngaytrathucte, trangthai
    )
    SELECT
      new_id, mabandoc, manhanvien, macuonsach, ngaymuon, ngayhentra, ngaytrathucte, trangthai
    FROM phieumuon
    WHERE maphieumuon = r.old_id;

    IF to_regclass('public.yeucaugiahan') IS NOT NULL THEN
      UPDATE yeucaugiahan SET maphieumuon = new_id WHERE maphieumuon = r.old_id;
    END IF;

    IF to_regclass('public.phieuphat') IS NOT NULL THEN
      UPDATE phieuphat SET maphieumuon = new_id WHERE maphieumuon = r.old_id;
    END IF;

    DELETE FROM phieumuon WHERE maphieumuon = r.old_id;
  END LOOP;
END $$;
