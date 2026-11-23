CREATE TABLE library_code_counters (
  prefix VARCHAR(2) PRIMARY KEY,
  last_number BIGINT NOT NULL CHECK (last_number > 0)
);

CREATE FUNCTION next_library_code(code_prefix VARCHAR, code_table REGCLASS, code_column NAME)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE next_number BIGINT;
BEGIN
  EXECUTE format(
    'SELECT COALESCE(MAX(substring(%1$I FROM 3)::bigint),0)+1 FROM %2$s WHERE %1$I ~ $1',
    code_column, code_table
  ) INTO next_number USING '^' || code_prefix || '[0-9]{3,}$';

  INSERT INTO library_code_counters (prefix,last_number) VALUES (code_prefix,next_number)
  ON CONFLICT (prefix) DO UPDATE
    SET last_number=GREATEST(library_code_counters.last_number+1,EXCLUDED.last_number)
  RETURNING last_number INTO next_number;
  RETURN code_prefix || LPAD(next_number::text,GREATEST(3,LENGTH(next_number::text)),'0');
END;
$$;

-- Defer the original foreign keys while rewriting both sides of each reference.
CREATE TEMP TABLE leaf_code_foreign_keys ON COMMIT DROP AS
SELECT conrelid::regclass AS relation, conname, condeferred
FROM pg_constraint
WHERE contype='f' AND NOT condeferrable
  AND conrelid IN (SELECT oid FROM pg_class WHERE relnamespace='public'::regnamespace);

DO $$
DECLARE item RECORD;
BEGIN
  FOR item IN SELECT * FROM leaf_code_foreign_keys LOOP
    EXECUTE format('ALTER TABLE %s ALTER CONSTRAINT %I DEFERRABLE INITIALLY DEFERRED',item.relation,item.conname);
  END LOOP;
END;
$$;
SET CONSTRAINTS ALL DEFERRED;
ALTER TABLE phieumuon DISABLE TRIGGER phieumuon_sync_detail;

CREATE FUNCTION rewrite_library_codes(root_table REGCLASS, root_column NAME, code_prefix VARCHAR, row_condition TEXT DEFAULT 'TRUE')
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE item RECORD;
DECLARE ref RECORD;
DECLARE new_code TEXT;
BEGIN
  FOR item IN EXECUTE format('SELECT %1$I AS old_code FROM %2$s WHERE (%3$s) AND %1$I !~ $1 ORDER BY %1$I',
                             root_column,root_table,row_condition) USING '^' || code_prefix || '[0-9]{3,}$' LOOP
    new_code := next_library_code(code_prefix,root_table,root_column);
    FOR ref IN
      WITH RECURSIVE refs(rel,col) AS (
        SELECT root_table::oid,a.attnum FROM pg_attribute a WHERE a.attrelid=root_table AND a.attname=root_column
        UNION
        SELECT fk.conrelid,fk.conkey[1] FROM refs r
        JOIN pg_constraint fk ON fk.contype='f' AND fk.confrelid=r.rel AND cardinality(fk.confkey)=1 AND fk.confkey[1]=r.col
      )
      SELECT r.rel::regclass AS relation,a.attname FROM refs r
      JOIN pg_attribute a ON a.attrelid=r.rel AND a.attnum=r.col
    LOOP
      EXECUTE format('UPDATE %s SET %I=$1 WHERE %I=$2',ref.relation,ref.attname,ref.attname)
        USING new_code,item.old_code;
    END LOOP;
    IF root_table='nguoidung'::regclass THEN
      UPDATE ixs_nhatky SET manguoidung=new_code WHERE manguoidung=item.old_code;
      UPDATE ixs_reader_book_suggestions SET reader_id=new_code WHERE reader_id=item.old_code;
    ELSIF root_table='nhacungcap'::regclass THEN
      UPDATE phieunhap SET nhacungcap=new_code WHERE nhacungcap=item.old_code;
    END IF;
  END LOOP;
END;
$$;

SELECT rewrite_library_codes('nguoidung','manguoidung','NV','EXISTS (SELECT 1 FROM nhanvien WHERE manhanvien=manguoidung)');
SELECT rewrite_library_codes('nguoidung','manguoidung','BD','EXISTS (SELECT 1 FROM bandoc WHERE mabandoc=manguoidung) AND NOT EXISTS (SELECT 1 FROM nhanvien WHERE manhanvien=manguoidung)');
SELECT rewrite_library_codes('nhacungcap','manhacungcap','NC');
SELECT rewrite_library_codes('nhaxuatban','manhaxuatban','XB');
SELECT rewrite_library_codes('danhmuc','madanhmuc','DM');
SELECT rewrite_library_codes('dausach','madausach','DS');
SELECT rewrite_library_codes('cuonsach','macuonsach','CS');
SELECT rewrite_library_codes('phieunhap','maphieunhap','PN');
SELECT rewrite_library_codes('phieumuon','maphieumuon','PM');
SELECT rewrite_library_codes('yeucaumuon','mayeucau','YM');
SELECT rewrite_library_codes('yeucaugiahan','magiahan','GH');
SELECT rewrite_library_codes('phieudexuat','madexuat','DX');
SELECT rewrite_library_codes('phieuphat','maphieuphat','PP');
SELECT rewrite_library_codes('chitietdexuat','machitietdexuat','CD');
SELECT rewrite_library_codes('chitietphieumuon','machitietmuon','CM');
SELECT rewrite_library_codes('chitietphieuphat','machitietphat','CP');

DROP FUNCTION rewrite_library_codes(REGCLASS,NAME,VARCHAR,TEXT);
SET CONSTRAINTS ALL IMMEDIATE;
DO $$
DECLARE item RECORD;
BEGIN
  FOR item IN SELECT * FROM leaf_code_foreign_keys LOOP
    EXECUTE format('ALTER TABLE %s ALTER CONSTRAINT %I NOT DEFERRABLE',item.relation,item.conname);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION sync_legacy_loan_detail() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' THEN
    UPDATE chitietphieumuon SET macuonsach=NEW.macuonsach,
      ngayhentra=COALESCE(NEW.ngayhentra::date,NEW.ngaymuon::date),
      ngaytrathucte=NEW.ngaytrathucte::date,trangthai=COALESCE(NEW.trangthai,'Đang mượn')
    WHERE maphieumuon=OLD.maphieumuon AND macuonsach=OLD.macuonsach;
    IF FOUND THEN RETURN NEW; END IF;
  END IF;

  INSERT INTO chitietphieumuon (machitietmuon,maphieumuon,macuonsach,ngayhentra,ngaytrathucte,trangthai)
  VALUES (next_library_code('CM','chitietphieumuon','machitietmuon'),NEW.maphieumuon,NEW.macuonsach,
    COALESCE(NEW.ngayhentra::date,NEW.ngaymuon::date),NEW.ngaytrathucte::date,COALESCE(NEW.trangthai,'Đang mượn'));
  RETURN NEW;
END;
$$;
ALTER TABLE phieumuon ENABLE TRIGGER phieumuon_sync_detail;
