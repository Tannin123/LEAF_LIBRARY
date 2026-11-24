-- These tables support configuration, audit, stock categories and the wait list.
CREATE TABLE danhmuc (madanhmuc VARCHAR(50) PRIMARY KEY, tendanhmuc VARCHAR(255) NOT NULL);
CREATE TABLE IF NOT EXISTS nhaxuatban(
  manhaxuatban VARCHAR(50) PRIMARY KEY,
  tennhaxuatban VARCHAR(255) NOT NULL,
  sodienthoai VARCHAR(30),
  email VARCHAR(255),
  diachi TEXT,
  ghichu TEXT,
  trangthai VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS ixs_cauhinh (
  macauhinh VARCHAR(100) PRIMARY KEY,
  giatri JSONB NOT NULL,
  capnhatLuc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ixs_nhatky (
  manhatky BIGSERIAL PRIMARY KEY,
  thoigian TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nguoidung VARCHAR(255),
  manguoidung VARCHAR(50),
  hanhdong VARCHAR(100),
  doituong VARCHAR(255),
  chitiet TEXT
);

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

CREATE SEQUENCE import_detail_code_seq;
CREATE SEQUENCE bookshelf_code_seq;
ALTER TABLE "CHITIETPHIEUNHAP" ALTER COLUMN "maChiTietNhap" SET DEFAULT 'CN' || nextval('import_detail_code_seq');
ALTER TABLE "TUSACHCANHAN" ALTER COLUMN "maTuCaNhan" SET DEFAULT 'TC' || nextval('bookshelf_code_seq');
ALTER TABLE "TUSACHCANHAN" ALTER COLUMN "ngayThem" SET DEFAULT CURRENT_DATE;
ALTER TABLE "YEUCAUMUON" ALTER COLUMN "ngayYeuCau" SET DEFAULT CURRENT_DATE;
ALTER TABLE "PHIEUDEXUAT" ALTER COLUMN "maBanDoc" DROP NOT NULL;
ALTER TABLE "PHIEUPHAT" ALTER COLUMN "maPhieuMuon" DROP NOT NULL;
ALTER TABLE "CHITIETPHIEUPHAT" ALTER COLUMN "maChiTietMuon" DROP NOT NULL;
ALTER TABLE "CHITIETPHIEUNHAP" ADD UNIQUE ("maPhieuNhap", "maDauSach");

CREATE VIEW taikhoan AS
SELECT "tenDangNhap" AS tendangnhap, "matKhau" AS matkhau, "vaiTro" AS vaitro, "trangThai" AS trangthai FROM "TAIKHOAN";

ALTER TABLE "NGUOIDUNG"
  ADD COLUMN cccd character varying(20),
  ADD COLUMN ngaysinh date,
  ADD COLUMN gioitinh character varying(20),
  ADD COLUMN ngaycapthe date,
  ADD COLUMN ngayhetthe date,
  ADD COLUMN anhdaidien text,
  ADD COLUMN xoaluc timestamp with time zone;

CREATE VIEW nguoidung AS
SELECT "maNguoiDung" AS manguoidung, "tenDangNhap" AS tendangnhap, "hoTen" AS hoten, "email" AS email, "soDienThoai" AS sodienthoai, "cccd" AS cccd, "ngaysinh" AS ngaysinh, "diaChi" AS diachi, "gioitinh" AS gioitinh, "ngaycapthe" AS ngaycapthe, "ngayhetthe" AS ngayhetthe, "anhdaidien" AS anhdaidien, "xoaluc" AS xoaluc FROM "NGUOIDUNG";

ALTER TABLE "NHANVIEN"
  ADD COLUMN dantoc character varying(50);

CREATE VIEW nhanvien AS
SELECT "maNguoiDung" AS manhanvien, "chucVu" AS chucvu, "trangThaiLamViec" AS trangthailamviec, "dantoc" AS dantoc FROM "NHANVIEN";

ALTER TABLE "BANDOC"
  ADD COLUMN tongnophat double precision DEFAULT 0,
  ADD COLUMN ngaycapthe date,
  ADD COLUMN ngayhethanthe date,
  ADD COLUMN ngayhetthe date;

CREATE VIEW bandoc AS
SELECT "maNguoiDung" AS mabandoc, "loaiBanDoc" AS loaibandoc, "tongnophat" AS tongnophat, "ngaycapthe" AS ngaycapthe, "ngayhethanthe" AS ngayhethanthe, "ngayhetthe" AS ngayhetthe FROM "BANDOC";

ALTER TABLE "NHACUNGCAP"
  ADD COLUMN nguoilienhe character varying(255),
  ADD COLUMN trangthai character varying(50);

CREATE VIEW nhacungcap AS
SELECT "maNhaCungCap" AS manhacungcap, "tenNhaCungCap" AS tennhacungcap, "nguoilienhe" AS nguoilienhe, "soDienThoai" AS sodienthoai, "email" AS email, "diaChi" AS diachi, "trangthai" AS trangthai FROM "NHACUNGCAP";

ALTER TABLE "DAUSACH"
  ADD COLUMN madanhmuc character varying(50) NOT NULL,
  ADD COLUMN chude character varying(100),
  ADD COLUMN khoa character varying(50),
  ADD COLUMN soluongtong integer DEFAULT 0,
  ADD COLUMN soluongsan integer DEFAULT 0,
  ADD COLUMN phienban character varying(100),
  ADD COLUMN gia double precision;

CREATE VIEW dausach AS
SELECT "maDauSach" AS madausach, "madanhmuc" AS madanhmuc, "tenSach" AS tensach, "tacGia" AS tacgia, "theLoai" AS theloai, "chude" AS chude, "khoa" AS khoa, "soluongtong" AS soluongtong, "soluongsan" AS soluongsan, "nhaXuatBan" AS nhaxuatban, "phienban" AS phienban, "gia" AS gia, "hinhAnhBia" AS anhbia, "namXuatBan" AS namxuatban FROM "DAUSACH";

ALTER TABLE "PHIEUNHAP"
  ADD COLUMN tongsoluong integer,
  ADD COLUMN nguoitao character varying(255);

CREATE VIEW phieunhap AS
SELECT "maPhieuNhap" AS maphieunhap, "maNhanVien" AS manhanvien, "ngayNhap" AS ngaynhap, "tongsoluong" AS tongsoluong, "trangThai" AS trangthai, "maNhaCungCap" AS nhacungcap, "nguoitao" AS nguoitao FROM "PHIEUNHAP";

ALTER TABLE "CHITIETPHIEUNHAP"
  ADD COLUMN dongia double precision NOT NULL;

CREATE VIEW chitietphieunhap AS
SELECT "maPhieuNhap" AS maphieunhap, "maDauSach" AS madausach, "soLuongNhap" AS soluongnhap, "dongia" AS dongia, "maChiTietNhap" AS machitietnhap FROM "CHITIETPHIEUNHAP";

ALTER TABLE "CUONSACH"
  ADD COLUMN mavach character varying(100),
  ADD COLUMN gia double precision,
  ADD COLUMN anhbia text;

CREATE VIEW cuonsach AS
SELECT "maCuonSach" AS macuonsach, "maDauSach" AS madausach, "mavach" AS mavach, "tinhTrangVatLy" AS tinhtrangvatly, "trangThai" AS trangthai, "viTriLuuTru" AS vitriluutru, "gia" AS gia, "anhbia" AS anhbia, "maChiTietNhap" AS machitietnhap FROM "CUONSACH";

ALTER TABLE "TUSACHCANHAN"
  ADD COLUMN sotrangdadoc integer DEFAULT 0 NOT NULL;

CREATE VIEW tusachcanhan AS
SELECT "maBanDoc" AS mabandoc, "maDauSach" AS madausach, "ngayThem" AS ngaythem, "sotrangdadoc" AS sotrangdadoc FROM "TUSACHCANHAN";

ALTER TABLE "PHIEUDEXUAT"
  ADD COLUMN thongtinsach character varying(255) NOT NULL;

CREATE VIEW phieudexuat AS
SELECT "maDeXuat" AS madexuat, "maNhanVienDuyet" AS manhanvien, "thongtinsach" AS thongtinsach, "ngayDeXuat" AS ngaydexuat, "trangThaiDuyet" AS trangthaiduyet, "lyDoTuChoi" AS lydotuchoi, "maBanDoc" AS mabandoc FROM "PHIEUDEXUAT";

ALTER TABLE "CHITIETDEXUAT"
  ADD COLUMN lanxuatban character varying(100),
  ADD COLUMN isbn character varying(32),
  ADD COLUMN anhbia text;

CREATE VIEW chitietdexuat AS
SELECT "maChiTietDeXuat" AS machitietdexuat, "maDeXuat" AS madexuat, "tenSach" AS tensach, "tacGia" AS tacgia, "nhaXuatBan" AS nhaxuatban, "namXuatBan" AS namxuatban, "soLuongDeXuat" AS soluongdexuat, "lyDoDeXuat" AS lydodexuat, "lanxuatban" AS lanxuatban, "isbn" AS isbn, "anhbia" AS anhbia FROM "CHITIETDEXUAT";

ALTER TABLE "YEUCAUMUON"
  ADD COLUMN madausach character varying(50) NOT NULL;

CREATE VIEW yeucaumuon AS
SELECT "maYeuCau" AS mayeucau, "maBanDoc" AS mabandoc, "madausach" AS madausach, "maCuonSach" AS macuonsach, "ngayYeuCau" AS ngayyeucau, "trangThai" AS trangthai, "maNhanVienDuyet" AS manhanvienduyet, "lyDoTuChoi" AS lydotuchoi FROM "YEUCAUMUON";

ALTER TABLE "PHIEUMUON"
  ADD COLUMN macuonsach character varying(50) NOT NULL,
  ADD COLUMN ngayhentra timestamp without time zone NOT NULL,
  ADD COLUMN ngaytrathucte timestamp without time zone;

CREATE VIEW phieumuon AS
SELECT "maPhieuMuon" AS maphieumuon, "maBanDoc" AS mabandoc, "maNhanVien" AS manhanvien, "macuonsach" AS macuonsach, "ngayMuon" AS ngaymuon, "ngayhentra" AS ngayhentra, "ngaytrathucte" AS ngaytrathucte, "trangThai" AS trangthai FROM "PHIEUMUON";

CREATE VIEW chitietphieumuon AS
SELECT "maChiTietMuon" AS machitietmuon, "maPhieuMuon" AS maphieumuon, "maCuonSach" AS macuonsach, "maYeuCau" AS mayeucau, "ngayHenTra" AS ngayhentra, "ngayTraThucTe" AS ngaytrathucte, "tinhTrangKhiTra" AS tinhtrangkhitra, "trangThai" AS trangthai FROM "CHITIETPHIEUMUON";

ALTER TABLE "YEUCAUGIAHAN"
  ADD COLUMN maphieumuon character varying(50) NOT NULL;

CREATE VIEW yeucaugiahan AS
SELECT "maYeuCauGiaHan" AS magiahan, "maphieumuon" AS maphieumuon, "ngayYeuCau" AS ngayyeucau, "soNgayGiaHan" AS songaygiahan, "trangThaiDuyet" AS trangthaiduyet, "maChiTietMuon" AS machitietmuon, "maNhanVienDuyet" AS manhanvienduyet FROM "YEUCAUGIAHAN";

ALTER TABLE "PHIEUPHAT"
  ADD COLUMN mabandoc character varying(50) NOT NULL,
  ADD COLUMN loaivipham character varying(255),
  ADD COLUMN baochuyenkhoanluc timestamp with time zone;

CREATE VIEW phieuphat AS
SELECT "maPhieuPhat" AS maphieuphat, "maPhieuMuon" AS maphieumuon, "mabandoc" AS mabandoc, "maNhanVien" AS manhanvien, "loaivipham" AS loaivipham, "tongTienPhat" AS sotien, "trangThaiThanhToan" AS trangthaithanhtoan, "ngayLap" AS ngaylap, "phuongThucThanhToan" AS phuongthucthanhtoan, "ngayThanhToan" AS ngaythanhtoan, "baochuyenkhoanluc" AS baochuyenkhoanluc FROM "PHIEUPHAT";

CREATE VIEW chitietphieuphat AS
SELECT "maChiTietPhat" AS machitietphat, "maPhieuPhat" AS maphieuphat, "maChiTietMuon" AS machitietmuon, "loaiViPham" AS loaivipham, "soNgayQuaHan" AS songayquahan, "mucDoHuHong" AS mucdohuhong, "soTienPhat" AS sotienphat FROM "CHITIETPHIEUPHAT";

ALTER TABLE "DAUSACH" ADD FOREIGN KEY (madanhmuc) REFERENCES danhmuc(madanhmuc);
ALTER TABLE "PHIEUMUON" ADD FOREIGN KEY (macuonsach) REFERENCES "CUONSACH" ("maCuonSach");
ALTER TABLE "PHIEUPHAT" ADD FOREIGN KEY (mabandoc) REFERENCES "BANDOC" ("maNguoiDung");
ALTER TABLE "YEUCAUMUON" ADD FOREIGN KEY (madausach) REFERENCES "DAUSACH" ("maDauSach");
ALTER TABLE "YEUCAUGIAHAN" ADD FOREIGN KEY (maphieumuon) REFERENCES "PHIEUMUON" ("maPhieuMuon");
ALTER TABLE "TUSACHCANHAN" ADD CHECK (sotrangdadoc >= 0);

CREATE TABLE danhsachcho (
  mabandoc VARCHAR(20) REFERENCES "BANDOC" ("maNguoiDung"),
  madausach VARCHAR(20) REFERENCES "DAUSACH" ("maDauSach"),
  ngaydangky TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  thutu INTEGER,
  trangthai VARCHAR(50),
  PRIMARY KEY (mabandoc,madausach)
);

CREATE FUNCTION sync_legacy_loan_detail() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' THEN
    UPDATE chitietphieumuon SET macuonsach=NEW.macuonsach,
      ngayhentra=COALESCE(NEW.ngayhentra::date,NEW."ngayMuon"::date),
      ngaytrathucte=NEW.ngaytrathucte::date,trangthai=COALESCE(NEW."trangThai",'Đang mượn')
    WHERE maphieumuon=OLD."maPhieuMuon" AND macuonsach=OLD.macuonsach;
    IF FOUND THEN RETURN NEW; END IF;
  END IF;

  INSERT INTO chitietphieumuon (machitietmuon,maphieumuon,macuonsach,ngayhentra,ngaytrathucte,trangthai)
  VALUES (next_library_code('CM','chitietphieumuon','machitietmuon'),NEW."maPhieuMuon",NEW.macuonsach,
    COALESCE(NEW.ngayhentra::date,NEW."ngayMuon"::date),NEW.ngaytrathucte::date,COALESCE(NEW."trangThai",'Đang mượn'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER phieumuon_sync_detail
AFTER INSERT OR UPDATE OF macuonsach, ngayhentra, ngaytrathucte, "trangThai" ON "PHIEUMUON"
FOR EACH ROW EXECUTE FUNCTION sync_legacy_loan_detail();

INSERT INTO danhmuc (madanhmuc, tendanhmuc)
SELECT seed.id, seed.name
FROM (VALUES
  ('CAT-SEED-IT', 'Công nghệ thông tin'),
  ('CAT-SEED-MATH', 'Toán học'),
  ('CAT-SEED-PHILOSOPHY', 'Triết học'),
  ('CAT-SEED-HISTORY', 'Lịch sử')
) AS seed(id, name)
WHERE NOT EXISTS (
  SELECT 1 FROM danhmuc existing
  WHERE lower(existing.tendanhmuc) = lower(seed.name)
)
ON CONFLICT (madanhmuc) DO NOTHING;

INSERT INTO dausach (
  madausach, madanhmuc, tensach, tacgia, theloai, chude,
  soluongtong, soluongsan, nhaxuatban, phienban, gia, anhbia
)
SELECT
  seed.id,
  (SELECT madanhmuc FROM danhmuc WHERE lower(tendanhmuc) = lower(seed.category) ORDER BY madanhmuc LIMIT 1),
  seed.title,
  seed.author,
  seed.genre,
  seed.subject,
  5,
  5,
  seed.publisher,
  '1',
  120000,
  seed.cover
FROM (VALUES
  ('DS001', 'Công nghệ thông tin', 'Clean Code: A Handbook of Agile Software Craftsmanship', 'Robert C. Martin', 'Lập trình', 'Phát triển phần mềm', 'Prentice Hall', '../assets/images/cleancode.webp'),
  ('DS002', 'Toán học', 'Giáo trình Giải tích Tập 2', 'Trần Đức Long - ĐHQG HN', 'Giải tích', 'Toán học', 'Đại học Quốc gia Hà Nội', '../assets/images/giatich.webp'),
  ('DS003', 'Triết học', 'Triết học', 'Edward Craig', 'Triết học', 'Triết học nhập môn', 'NXB Tri Thức', '../assets/images/triethoc.jpg'),
  ('DS004', 'Lịch sử', 'Lịch sử Văn minh Thế giới', 'Đào Tuấn Thành (Chủ biên)', 'Lịch sử', 'Văn minh thế giới', 'NXB Đại học Sư phạm', '../assets/images/lichsuvanminhthegioi.jpg')
) AS seed(id, category, title, author, genre, subject, publisher, cover)
WHERE NOT EXISTS (
  SELECT 1 FROM dausach existing
  WHERE lower(existing.tensach) = lower(seed.title)
)
ON CONFLICT (madausach) DO NOTHING;

INSERT INTO danhmuc (madanhmuc, tendanhmuc)
SELECT seed.id, seed.name
FROM (VALUES
  ('CAT-SEED-LITERATURE', 'Văn học'),
  ('CAT-SEED-READING', 'Kỹ năng đọc')
) AS seed(id, name)
WHERE NOT EXISTS (
  SELECT 1 FROM danhmuc existing
  WHERE lower(existing.tendanhmuc) = lower(seed.name)
)
ON CONFLICT (madanhmuc) DO NOTHING;

INSERT INTO dausach (
  madausach, madanhmuc, tensach, tacgia, theloai, chude,
  soluongtong, soluongsan, nhaxuatban, phienban, gia, anhbia
)
SELECT
  seed.id,
  (SELECT madanhmuc FROM danhmuc WHERE lower(tendanhmuc) = lower(seed.category) ORDER BY madanhmuc LIMIT 1),
  seed.title,
  seed.author,
  seed.genre,
  seed.subject,
  5,
  5,
  seed.publisher,
  '1',
  seed.price,
  seed.cover
FROM (VALUES
  ('DS005', 'Văn học', 'Cây cam ngọt của tôi', 'José Mauro de Vasconcelos', 'Tiểu thuyết', 'Văn học nước ngoài', 'Nhã Nam', NULL::FLOAT, '../assets/images/caycamngotcuatoi.jpg'),
  ('DS006', 'Văn học', 'Chiếc lá cuối cùng', 'O. Henry', 'Truyện ngắn', 'Văn học nước ngoài', 'NXB Văn học', NULL::FLOAT, '../assets/images/chieclacuoicung.jpg'),
  ('DS007', 'Văn học', 'Dế Mèn phiêu lưu ký', 'Tô Hoài', 'Văn học thiếu nhi', 'Văn học Việt Nam', 'NXB Kim Đồng', NULL::FLOAT, '../assets/images/demenphieuluuky.jpg'),
  ('DS008', 'Văn học', 'Làm đĩ', 'Vũ Trọng Phụng', 'Tiểu thuyết', 'Văn học Việt Nam', 'NXB Văn học', NULL::FLOAT, '../assets/images/lamdi.jpg'),
  ('DS009', 'Kỹ năng đọc', 'Đọc sách cộng hưởng', 'Watanabe Yasuhiro', 'Kỹ năng đọc', 'Phương pháp đọc sách', 'NXB Lao Động', NULL::FLOAT, '../assets/images/sachconghuon.jpg'),
  ('DS010', 'Văn học', 'Suối ấm mặt trời', 'José Mauro de Vasconcelos', 'Tiểu thuyết', 'Văn học nước ngoài', NULL, NULL::FLOAT, '../assets/images/suoiammattroi.jpg'),
  ('DS011', 'Văn học', 'Số đỏ', 'Vũ Trọng Phụng', 'Tiểu thuyết trào phúng', 'Văn học Việt Nam', 'Lê Cường', NULL::FLOAT, '../assets/images/sodo.jpg')
) AS seed(id, category, title, author, genre, subject, publisher, price, cover)
WHERE NOT EXISTS (
  SELECT 1 FROM dausach existing
  WHERE lower(existing.tensach) = lower(seed.title)
)
ON CONFLICT (madausach) DO NOTHING;

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

-- Migration 009: Add admin account with password admin123

INSERT INTO taikhoan (tendangnhap, matkhau, vaitro, trangthai)
VALUES 
  ('admin', 'pbkdf2-sha256$210000$39fb984e19f9e268c478444f92738244$8f891875f2bf9c82324bd7777b6f196fecb5ce65de20c8a963f498363a660435', 'QUẢN TRỊ VIÊN', 'HOẠT ĐỘNG')
ON CONFLICT (tendangnhap) DO UPDATE 
SET matkhau = EXCLUDED.matkhau, vaitro = EXCLUDED.vaitro, trangthai = EXCLUDED.trangthai;

INSERT INTO nguoidung (manguoidung, tendangnhap, hoten, email, sodienthoai, cccd, gioitinh, ngaysinh, diachi)
VALUES 
  ('NV001', 'admin', 'Quản trị viên', 'admin@leaflibrary.vn', '0909123456', '079201000001', 'Nam', '1995-01-01', 'TP. Hồ Chí Minh')
ON CONFLICT (manguoidung) DO UPDATE 
SET tendangnhap = EXCLUDED.tendangnhap, hoten = EXCLUDED.hoten, email = EXCLUDED.email, sodienthoai = EXCLUDED.sodienthoai;

INSERT INTO nhanvien (manhanvien, chucvu, trangthailamviec)
VALUES 
  ('NV001', 'QUẢN TRỊ VIÊN', 'ĐANG LÀM')
ON CONFLICT (manhanvien) DO UPDATE 
SET chucvu = EXCLUDED.chucvu, trangthailamviec = EXCLUDED.trangthailamviec;
