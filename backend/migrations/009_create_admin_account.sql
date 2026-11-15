-- Migration 009: Add admin account with password admin123

INSERT INTO taikhoan (tendangnhap, matkhau, vaitro, trangthai)
VALUES 
  ('admin', 'pbkdf2-sha256$210000$39fb984e19f9e268c478444f92738244$8f891875f2bf9c82324bd7777b6f196fecb5ce65de20c8a963f498363a660435', 'QUẢN TRỊ VIÊN', 'HOẠT ĐỘNG')
ON CONFLICT (tendangnhap) DO UPDATE 
SET matkhau = EXCLUDED.matkhau, vaitro = EXCLUDED.vaitro, trangthai = EXCLUDED.trangthai;

INSERT INTO nguoidung (manguoidung, tendangnhap, hoten, email, sodienthoai, cccd, gioitinh, ngaysinh, diachi)
VALUES 
  ('12026001', 'admin', 'Quản trị viên', 'admin@leaflibrary.vn', '0909123456', '079201000001', 'Nam', '1995-01-01', 'TP. Hồ Chí Minh')
ON CONFLICT (manguoidung) DO UPDATE 
SET tendangnhap = EXCLUDED.tendangnhap, hoten = EXCLUDED.hoten, email = EXCLUDED.email, sodienthoai = EXCLUDED.sodienthoai;

INSERT INTO nhanvien (manhanvien, chucvu, trangthailamviec)
VALUES 
  ('12026001', 'QUẢN TRỊ VIÊN', 'ĐANG LÀM')
ON CONFLICT (manhanvien) DO UPDATE 
SET chucvu = EXCLUDED.chucvu, trangthailamviec = EXCLUDED.trangthailamviec;
