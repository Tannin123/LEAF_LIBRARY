-- Migration 008: Seed initial demo loans and fines for testing reader data synchronization

-- 1. Ensure test reader account exists
INSERT INTO taikhoan (tendangnhap, matkhau, vaitro, trangthai)
VALUES 
  ('tannin', 'pbkdf2-sha256$210000$8e04b4c3e8031d279cf441e8c9b3e102$4bf652988fead8073fa73fdfc73ceb7b51e06fa99173dc773ad7bf7b5b7fcdd0', 'BẠN ĐỌC', 'HOẠT ĐỘNG')
ON CONFLICT (tendangnhap) DO NOTHING;

INSERT INTO nguoidung (manguoidung, tendangnhap, hoten, email, sodienthoai, cccd, gioitinh, ngaysinh, diachi)
VALUES 
  ('220260003', 'tannin', 'Lưu Tấn Nin', 'luutannin@gmail.com', '0363894957', '079206000001', 'Nam', '2006-11-10', 'Ô 17, Ấp 4, Mỹ An, Tây Ninh')
ON CONFLICT (manguoidung) DO NOTHING;

INSERT INTO bandoc (mabandoc, loaibandoc, tongnophat, ngaycapthe, ngayhetthe)
VALUES 
  ('220260003', 'Sinh viên', 50000, '2024-09-01', '2027-02-28')
ON CONFLICT (mabandoc) DO NOTHING;

-- 2. Ensure test employee exists
INSERT INTO taikhoan (tendangnhap, matkhau, vaitro, trangthai)
VALUES 
  ('admin', 'pbkdf2-sha256$210000$8e04b4c3e8031d279cf441e8c9b3e102$4bf652988fead8073fa73fdfc73ceb7b51e06fa99173dc773ad7bf7b5b7fcdd0', 'QUẢN TRỊ VIÊN', 'HOẠT ĐỘNG')
ON CONFLICT (tendangnhap) DO NOTHING;

INSERT INTO nguoidung (manguoidung, tendangnhap, hoten, email, sodienthoai, cccd, gioitinh, ngaysinh, diachi)
VALUES 
  ('12026001', 'admin', 'Quản trị viên', 'admin@leaflibrary.vn', '0909123456', '079201000001', 'Nam', '1995-01-01', 'TP. Hồ Chí Minh')
ON CONFLICT (manguoidung) DO NOTHING;

INSERT INTO nhanvien (manhanvien, chucvu, trangthailamviec)
VALUES 
  ('12026001', 'QUẢN TRỊ VIÊN', 'ĐANG LÀM')
ON CONFLICT (manhanvien) DO NOTHING;

-- 3. Seed demo loans for reader 220260003
INSERT INTO phieumuon (maphieumuon, mabandoc, manhanvien, macuonsach, ngaymuon, ngayhentra, ngaytrathucte, trangthai)
SELECT 
  'PM001', '220260003', '12026001', 'CS001', NOW() - INTERVAL '10 days', NOW() + INTERVAL '10 days', NULL, 'Đang mượn'
WHERE EXISTS (SELECT 1 FROM cuonsach WHERE macuonsach = 'CS001')
ON CONFLICT (maphieumuon) DO NOTHING;

INSERT INTO phieumuon (maphieumuon, mabandoc, manhanvien, macuonsach, ngaymuon, ngayhentra, ngaytrathucte, trangthai)
SELECT 
  'PM002', '220260003', '12026001', 'CS006', NOW() - INTERVAL '30 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', 'Đã trả'
WHERE EXISTS (SELECT 1 FROM cuonsach WHERE macuonsach = 'CS006')
ON CONFLICT (maphieumuon) DO NOTHING;

-- 4. Seed demo unpaid fine for reader 220260003
INSERT INTO phieuphat (maphieuphat, maphieumuon, mabandoc, manhanvien, loaivipham, sotien, trangthaithanhtoan)
SELECT 
  'FINE-2026-001', 'PM002', '220260003', '12026001', 'Phí trễ hạn trả sách (Giáo trình Giải tích Tập 2)', 50000, 'CHƯA THANH TOÁN'
WHERE EXISTS (SELECT 1 FROM phieumuon WHERE maphieumuon = 'PM002')
ON CONFLICT (maphieuphat) DO NOTHING;
