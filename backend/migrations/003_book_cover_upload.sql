DROP VIEW dausach;
ALTER TABLE "DAUSACH" ALTER COLUMN "hinhAnhBia" TYPE TEXT;
CREATE VIEW dausach AS
SELECT "maDauSach" AS madausach, "madanhmuc" AS madanhmuc, "tenSach" AS tensach, "tacGia" AS tacgia, "theLoai" AS theloai, "chude" AS chude, "khoa" AS khoa, "soluongtong" AS soluongtong, "soluongsan" AS soluongsan, "nhaXuatBan" AS nhaxuatban, "phienban" AS phienban, "gia" AS gia, "hinhAnhBia" AS anhbia, "namXuatBan" AS namxuatban FROM "DAUSACH";
