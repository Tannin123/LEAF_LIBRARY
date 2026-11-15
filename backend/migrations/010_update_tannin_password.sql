-- Migration 010: Update tannin password to Nin10112006
UPDATE taikhoan 
SET matkhau = 'Nin10112006' 
WHERE tendangnhap = 'tannin';
