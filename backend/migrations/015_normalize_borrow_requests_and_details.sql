ALTER TABLE ixs_borrow_requests RENAME TO yeucaumuon;
ALTER TABLE yeucaumuon RENAME COLUMN madangky TO mayeucau;
ALTER TABLE yeucaumuon RENAME COLUMN ngaydangky TO ngayyeucau;
ALTER TABLE yeucaumuon ADD COLUMN manhanvienduyet VARCHAR(50) REFERENCES nhanvien(manhanvien);
ALTER TABLE yeucaumuon ADD COLUMN lydotuchoi VARCHAR(255);
ALTER TABLE yeucaumuon ADD CONSTRAINT yeucaumuon_bandoc_fk
  FOREIGN KEY (mabandoc) REFERENCES bandoc(mabandoc);

CREATE TABLE chitietphieumuon (
  machitietmuon VARCHAR(20) PRIMARY KEY,
  maphieumuon VARCHAR(50) NOT NULL REFERENCES phieumuon(maphieumuon) ON DELETE CASCADE,
  macuonsach VARCHAR(50) NOT NULL REFERENCES cuonsach(macuonsach),
  mayeucau VARCHAR(80) UNIQUE REFERENCES yeucaumuon(mayeucau),
  ngayhentra DATE NOT NULL,
  ngaytrathucte DATE,
  tinhtrangkhitra VARCHAR(50),
  trangthai VARCHAR(50) NOT NULL,
  UNIQUE (maphieumuon, macuonsach)
);

INSERT INTO chitietphieumuon (
  machitietmuon, maphieumuon, macuonsach, ngayhentra, ngaytrathucte, trangthai
)
SELECT LEFT(MD5(maphieumuon), 20), maphieumuon, macuonsach,
       COALESCE(ngayhentra::date, ngaymuon::date), ngaytrathucte::date, COALESCE(trangthai, 'Đang mượn')
FROM phieumuon;

-- Keep the existing single-copy entry points in sync while moving circulation to loan details.
CREATE FUNCTION sync_legacy_loan_detail() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO chitietphieumuon (
    machitietmuon, maphieumuon, macuonsach, ngayhentra, ngaytrathucte, trangthai
  )
  VALUES (
    LEFT(MD5(NEW.maphieumuon),20), NEW.maphieumuon, NEW.macuonsach,
    COALESCE(NEW.ngayhentra::date,NEW.ngaymuon::date), NEW.ngaytrathucte::date,
    COALESCE(NEW.trangthai,'Đang mượn')
  )
  ON CONFLICT (machitietmuon) DO UPDATE SET macuonsach=EXCLUDED.macuonsach,
    ngayhentra=EXCLUDED.ngayhentra, ngaytrathucte=EXCLUDED.ngaytrathucte, trangthai=EXCLUDED.trangthai;
  RETURN NEW;
END;
$$;

CREATE TRIGGER phieumuon_sync_detail
AFTER INSERT OR UPDATE OF macuonsach, ngayhentra, ngaytrathucte, trangthai ON phieumuon
FOR EACH ROW EXECUTE FUNCTION sync_legacy_loan_detail();

ALTER TABLE yeucaugiahan ADD COLUMN machitietmuon VARCHAR(20) REFERENCES chitietphieumuon(machitietmuon);
ALTER TABLE yeucaugiahan ADD COLUMN manhanvienduyet VARCHAR(50) REFERENCES nhanvien(manhanvien);
UPDATE yeucaugiahan y SET machitietmuon=ct.machitietmuon
FROM chitietphieumuon ct WHERE ct.maphieumuon=y.maphieumuon;
ALTER TABLE yeucaugiahan ALTER COLUMN machitietmuon SET NOT NULL;
