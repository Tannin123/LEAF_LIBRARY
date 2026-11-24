
BEGIN;

-- 1. Tai khoan
CREATE TABLE IF NOT EXISTS "TAIKHOAN" (
    "tenDangNhap" VARCHAR(50) PRIMARY KEY,
    "matKhau"     VARCHAR(255) NOT NULL,
    "vaiTro"      VARCHAR(30) NOT NULL,
    "trangThai"   VARCHAR(30) NOT NULL
);

-- 2. Nguoi dung
CREATE TABLE IF NOT EXISTS "NGUOIDUNG" (
    "maNguoiDung" VARCHAR(20) PRIMARY KEY,
    "tenDangNhap" VARCHAR(50) NOT NULL UNIQUE,
    "hoTen"       VARCHAR(150) NOT NULL,
    "email"       VARCHAR(150),
    "soDienThoai" VARCHAR(20),
    "diaChi"      VARCHAR(255),
    CONSTRAINT "fk_nguoidung_taikhoan"
        FOREIGN KEY ("tenDangNhap") REFERENCES "TAIKHOAN" ("tenDangNhap")
);

-- 3. Nhan vien (ke thua nguoi dung)
CREATE TABLE IF NOT EXISTS "NHANVIEN" (
    "maNguoiDung"     VARCHAR(20) PRIMARY KEY,
    "chucVu"           VARCHAR(100),
    "trangThaiLamViec" VARCHAR(30),
    CONSTRAINT "fk_nhanvien_nguoidung"
        FOREIGN KEY ("maNguoiDung") REFERENCES "NGUOIDUNG" ("maNguoiDung")
);

-- 4. Ban doc (ke thua nguoi dung)
CREATE TABLE IF NOT EXISTS "BANDOC" (
    "maNguoiDung" VARCHAR(20) PRIMARY KEY,
    "loaiBanDoc"   VARCHAR(50),
    "trangThaiThe"  VARCHAR(30),
    CONSTRAINT "fk_bandoc_nguoidung"
        FOREIGN KEY ("maNguoiDung") REFERENCES "NGUOIDUNG" ("maNguoiDung")
);

-- 5. Nha cung cap
CREATE TABLE IF NOT EXISTS "NHACUNGCAP" (
    "maNhaCungCap"  VARCHAR(20) PRIMARY KEY,
    "tenNhaCungCap" VARCHAR(150) NOT NULL,
    "soDienThoai"    VARCHAR(20),
    "diaChi"         VARCHAR(255),
    "email"          VARCHAR(150)
);

-- 6. Dau sach
CREATE TABLE IF NOT EXISTS "DAUSACH" (
    "maDauSach"   VARCHAR(20) PRIMARY KEY,
    "tenSach"     VARCHAR(255) NOT NULL,
    "tacGia"      VARCHAR(150),
    "nhaXuatBan"  VARCHAR(150),
    "namXuatBan"  INTEGER,
    "theLoai"     VARCHAR(100),
    "hinhAnhBia"  VARCHAR(500),
    CONSTRAINT "chk_dausach_nam" CHECK ("namXuatBan" IS NULL OR "namXuatBan" > 0)
);

-- 7. Phieu nhap
CREATE TABLE IF NOT EXISTS "PHIEUNHAP" (
    "maPhieuNhap"  VARCHAR(20) PRIMARY KEY,
    "maNhaCungCap" VARCHAR(20) NOT NULL,
    "maNhanVien"   VARCHAR(20) NOT NULL,
    "ngayNhap"     DATE NOT NULL,
    "trangThai"    VARCHAR(30),
    CONSTRAINT "fk_phieunhap_ncc"
        FOREIGN KEY ("maNhaCungCap") REFERENCES "NHACUNGCAP" ("maNhaCungCap"),
    CONSTRAINT "fk_phieunhap_nhanvien"
        FOREIGN KEY ("maNhanVien") REFERENCES "NHANVIEN" ("maNguoiDung")
);

-- 8. Chi tiet phieu nhap
CREATE TABLE IF NOT EXISTS "CHITIETPHIEUNHAP" (
    "maChiTietNhap" VARCHAR(20) PRIMARY KEY,
    "maPhieuNhap"   VARCHAR(20) NOT NULL,
    "maDauSach"     VARCHAR(20) NOT NULL,
    "soLuongNhap"   INTEGER NOT NULL,
    CONSTRAINT "fk_ctpn_phieunhap"
        FOREIGN KEY ("maPhieuNhap") REFERENCES "PHIEUNHAP" ("maPhieuNhap"),
    CONSTRAINT "fk_ctpn_dausach"
        FOREIGN KEY ("maDauSach") REFERENCES "DAUSACH" ("maDauSach"),
    CONSTRAINT "chk_ctpn_soluong" CHECK ("soLuongNhap" > 0)
);

-- 9. Cuon sach
CREATE TABLE IF NOT EXISTS "CUONSACH" (
    "maCuonSach"    VARCHAR(20) PRIMARY KEY,
    "maDauSach"     VARCHAR(20) NOT NULL,
    "maChiTietNhap" VARCHAR(20),
    "tinhTrangVatLy" VARCHAR(100),
    "trangThai"     VARCHAR(30),
    "viTriLuuTru"   VARCHAR(100),
    CONSTRAINT "fk_cuonsach_dausach"
        FOREIGN KEY ("maDauSach") REFERENCES "DAUSACH" ("maDauSach"),
    CONSTRAINT "fk_cuonsach_chitietnhap"
        FOREIGN KEY ("maChiTietNhap") REFERENCES "CHITIETPHIEUNHAP" ("maChiTietNhap")
);

-- 10. Tu sach ca nhan
CREATE TABLE IF NOT EXISTS "TUSACHCANHAN" (
    "maTuCaNhan" VARCHAR(20) PRIMARY KEY,
    "maBanDoc"    VARCHAR(20) NOT NULL,
    "maDauSach"   VARCHAR(20) NOT NULL,
    "ngayThem"    DATE NOT NULL,
    CONSTRAINT "fk_tusach_bandoc"
        FOREIGN KEY ("maBanDoc") REFERENCES "BANDOC" ("maNguoiDung"),
    CONSTRAINT "fk_tusach_dausach"
        FOREIGN KEY ("maDauSach") REFERENCES "DAUSACH" ("maDauSach"),
    CONSTRAINT "uq_tusach_bandoc_dausach" UNIQUE ("maBanDoc", "maDauSach")
);

-- 11. Phieu de xuat sach
CREATE TABLE IF NOT EXISTS "PHIEUDEXUAT" (
    "maDeXuat"       VARCHAR(20) PRIMARY KEY,
    "maBanDoc"       VARCHAR(20) NOT NULL,
    "maNhanVienDuyet" VARCHAR(20),
    "ngayDeXuat"     DATE NOT NULL,
    "trangThaiDuyet"  VARCHAR(30),
    "lyDoTuChoi"     VARCHAR(500),
    CONSTRAINT "fk_phieudexuat_bandoc"
        FOREIGN KEY ("maBanDoc") REFERENCES "BANDOC" ("maNguoiDung"),
    CONSTRAINT "fk_phieudexuat_nhanvienduyet"
        FOREIGN KEY ("maNhanVienDuyet") REFERENCES "NHANVIEN" ("maNguoiDung")
);

-- 12. Chi tiet de xuat sach
CREATE TABLE IF NOT EXISTS "CHITIETDEXUAT" (
    "maChiTietDeXuat" VARCHAR(20) PRIMARY KEY,
    "maDeXuat"        VARCHAR(20) NOT NULL,
    "tenSach"         VARCHAR(255) NOT NULL,
    "tacGia"          VARCHAR(150),
    "nhaXuatBan"      VARCHAR(150),
    "namXuatBan"      INTEGER,
    "soLuongDeXuat"   INTEGER,
    "lyDoDeXuat"      VARCHAR(500),
    CONSTRAINT "fk_ctdx_phieudexuat"
        FOREIGN KEY ("maDeXuat") REFERENCES "PHIEUDEXUAT" ("maDeXuat"),
    CONSTRAINT "chk_ctdx_soluong" CHECK ("soLuongDeXuat" IS NULL OR "soLuongDeXuat" > 0)
);

-- 13. Yeu cau muon sach
CREATE TABLE IF NOT EXISTS "YEUCAUMUON" (
    "maYeuCau"       VARCHAR(20) PRIMARY KEY,
    "maBanDoc"       VARCHAR(20) NOT NULL,
    "maCuonSach"     VARCHAR(20) NOT NULL,
    "maNhanVienDuyet" VARCHAR(20),
    "ngayYeuCau"     DATE NOT NULL,
    "trangThai"       VARCHAR(30),
    "lyDoTuChoi"      VARCHAR(500),
    CONSTRAINT "fk_ycm_bandoc"
        FOREIGN KEY ("maBanDoc") REFERENCES "BANDOC" ("maNguoiDung"),
    CONSTRAINT "fk_ycm_cuonsach"
        FOREIGN KEY ("maCuonSach") REFERENCES "CUONSACH" ("maCuonSach"),
    CONSTRAINT "fk_ycm_nhanvienduyet"
        FOREIGN KEY ("maNhanVienDuyet") REFERENCES "NHANVIEN" ("maNguoiDung")
);

-- 14. Phieu muon
CREATE TABLE IF NOT EXISTS "PHIEUMUON" (
    "maPhieuMuon" VARCHAR(20) PRIMARY KEY,
    "maBanDoc"    VARCHAR(20) NOT NULL,
    "maNhanVien"  VARCHAR(20) NOT NULL,
    "ngayMuon"    DATE NOT NULL,
    "trangThai"   VARCHAR(30),
    CONSTRAINT "fk_phieumuon_bandoc"
        FOREIGN KEY ("maBanDoc") REFERENCES "BANDOC" ("maNguoiDung"),
    CONSTRAINT "fk_phieumuon_nhanvien"
        FOREIGN KEY ("maNhanVien") REFERENCES "NHANVIEN" ("maNguoiDung")
);

-- 15. Chi tiet phieu muon (tung cuon sach)
CREATE TABLE IF NOT EXISTS "CHITIETPHIEUMUON" (
    "maChiTietMuon"   VARCHAR(20) PRIMARY KEY,
    "maPhieuMuon"    VARCHAR(20) NOT NULL,
    "maCuonSach"     VARCHAR(20) NOT NULL,
    "maYeuCau"       VARCHAR(20),
    "ngayHenTra"     DATE NOT NULL,
    "ngayTraThucTe"  DATE,
    "tinhTrangKhiTra" VARCHAR(100),
    "trangThai"      VARCHAR(30),
    CONSTRAINT "fk_ctpm_phieumuon"
        FOREIGN KEY ("maPhieuMuon") REFERENCES "PHIEUMUON" ("maPhieuMuon"),
    CONSTRAINT "fk_ctpm_cuonsach"
        FOREIGN KEY ("maCuonSach") REFERENCES "CUONSACH" ("maCuonSach"),
    CONSTRAINT "fk_ctpm_yeucaumuon"
        FOREIGN KEY ("maYeuCau") REFERENCES "YEUCAUMUON" ("maYeuCau")
);

-- 16. Yeu cau gia han
CREATE TABLE IF NOT EXISTS "YEUCAUGIAHAN" (
    "maYeuCauGiaHan"  VARCHAR(20) PRIMARY KEY,
    "maChiTietMuon"   VARCHAR(20) NOT NULL,
    "maNhanVienDuyet" VARCHAR(20),
    "ngayYeuCau"      DATE NOT NULL,
    "soNgayGiaHan"    INTEGER NOT NULL,
    "trangThaiDuyet"  VARCHAR(30),
    CONSTRAINT "fk_ycgh_chitietmuon"
        FOREIGN KEY ("maChiTietMuon") REFERENCES "CHITIETPHIEUMUON" ("maChiTietMuon"),
    CONSTRAINT "fk_ycgh_nhanvienduyet"
        FOREIGN KEY ("maNhanVienDuyet") REFERENCES "NHANVIEN" ("maNguoiDung"),
    CONSTRAINT "chk_ycgh_songay" CHECK ("soNgayGiaHan" > 0)
);

-- 17. Phieu phat
CREATE TABLE IF NOT EXISTS "PHIEUPHAT" (
    "maPhieuPhat"          VARCHAR(20) PRIMARY KEY,
    "maPhieuMuon"          VARCHAR(20) NOT NULL,
    "maNhanVien"           VARCHAR(20) NOT NULL,
    "ngayLap"              DATE NOT NULL,
    "tongTienPhat"         NUMERIC(12,2) NOT NULL DEFAULT 0,
    "trangThaiThanhToan"   VARCHAR(30),
    "phuongThucThanhToan"  VARCHAR(50),
    "ngayThanhToan"        DATE,
    CONSTRAINT "fk_phieuphat_phieumuon"
        FOREIGN KEY ("maPhieuMuon") REFERENCES "PHIEUMUON" ("maPhieuMuon"),
    CONSTRAINT "fk_phieuphat_nhanvien"
        FOREIGN KEY ("maNhanVien") REFERENCES "NHANVIEN" ("maNguoiDung"),
    CONSTRAINT "chk_phieuphat_tongtien" CHECK ("tongTienPhat" >= 0)
);

-- 18. Chi tiet phieu phat
CREATE TABLE IF NOT EXISTS "CHITIETPHIEUPHAT" (
    "maChiTietPhat" VARCHAR(20) PRIMARY KEY,
    "maPhieuPhat"   VARCHAR(20) NOT NULL,
    "maChiTietMuon" VARCHAR(20) NOT NULL,
    "loaiViPham"    VARCHAR(100),
    "soNgayQuaHan"  INTEGER,
    "mucDoHuHong"   VARCHAR(100),
    "soTienPhat"    NUMERIC(12,2) NOT NULL DEFAULT 0,
    "ghiChu"        VARCHAR(500),
    CONSTRAINT "fk_ctpp_phieuphat"
        FOREIGN KEY ("maPhieuPhat") REFERENCES "PHIEUPHAT" ("maPhieuPhat"),
    CONSTRAINT "fk_ctpp_chitietmuon"
        FOREIGN KEY ("maChiTietMuon") REFERENCES "CHITIETPHIEUMUON" ("maChiTietMuon"),
    CONSTRAINT "chk_ctpp_songay" CHECK ("soNgayQuaHan" IS NULL OR "soNgayQuaHan" >= 0),
    CONSTRAINT "chk_ctpp_sotien" CHECK ("soTienPhat" >= 0)
);

-- Chi muc cho cac truy van nghiep vu thong dung.
CREATE INDEX IF NOT EXISTS "idx_cuonsach_madausach"
    ON "CUONSACH" ("maDauSach");
CREATE INDEX IF NOT EXISTS "idx_phieumuon_mabandoc"
    ON "PHIEUMUON" ("maBanDoc");
CREATE INDEX IF NOT EXISTS "idx_ctpm_macuonsach"
    ON "CHITIETPHIEUMUON" ("maCuonSach");
CREATE INDEX IF NOT EXISTS "idx_yeucaumuon_mabandoc"
    ON "YEUCAUMUON" ("maBanDoc");
CREATE INDEX IF NOT EXISTS "idx_phieuphat_mapmh"
    ON "PHIEUPHAT" ("maPhieuMuon");
CREATE INDEX IF NOT EXISTS "idx_phieunhap_manhacungcap"
    ON "PHIEUNHAP" ("maNhaCungCap");

COMMIT;


-- Luu y: cac FK maBanDoc / maNhanVien tham chieu maNguoiDung
-- tuong ung trong BANDOC / NHANVIEN, vi do la khoa chinh tren ERD.
