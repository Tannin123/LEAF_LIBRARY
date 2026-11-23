UPDATE taikhoan a
SET vaitro = CASE WHEN LOWER(TRANSLATE(TRIM(a.vaitro), 'ẢỊÊảịê', 'AIEaie')) IN ('admin', 'quan tri vien')
                  THEN 'QUẢN TRỊ VIÊN' ELSE 'THỦ THƯ' END
FROM nguoidung u JOIN nhanvien n ON n.manhanvien = u.manguoidung
WHERE a.tendangnhap = u.tendangnhap;
