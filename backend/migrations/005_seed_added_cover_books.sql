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
  ('SEED0005', 'Văn học', 'Cây cam ngọt của tôi', 'José Mauro de Vasconcelos', 'Tiểu thuyết', 'Văn học nước ngoài', 'Nhã Nam', NULL::FLOAT, '../assets/images/caycamngotcuatoi.jpg'),
  ('SEED0006', 'Văn học', 'Chiếc lá cuối cùng', 'O. Henry', 'Truyện ngắn', 'Văn học nước ngoài', 'NXB Văn học', NULL::FLOAT, '../assets/images/chieclacuoicung.jpg'),
  ('SEED0007', 'Văn học', 'Dế Mèn phiêu lưu ký', 'Tô Hoài', 'Văn học thiếu nhi', 'Văn học Việt Nam', 'NXB Kim Đồng', NULL::FLOAT, '../assets/images/demenphieuluuky.jpg'),
  ('SEED0008', 'Văn học', 'Làm đĩ', 'Vũ Trọng Phụng', 'Tiểu thuyết', 'Văn học Việt Nam', 'NXB Văn học', NULL::FLOAT, '../assets/images/lamdi.jpg'),
  ('SEED0009', 'Kỹ năng đọc', 'Đọc sách cộng hưởng', 'Watanabe Yasuhiro', 'Kỹ năng đọc', 'Phương pháp đọc sách', 'NXB Lao Động', NULL::FLOAT, '../assets/images/sachconghuon.jpg'),
  ('SEED0010', 'Văn học', 'Suối ấm mặt trời', 'José Mauro de Vasconcelos', 'Tiểu thuyết', 'Văn học nước ngoài', NULL, NULL::FLOAT, '../assets/images/suoiammattroi.jpg'),
  ('SEED0011', 'Văn học', 'Số đỏ', 'Vũ Trọng Phụng', 'Tiểu thuyết trào phúng', 'Văn học Việt Nam', 'Lê Cường', NULL::FLOAT, '../assets/images/sodo.jpg')
) AS seed(id, category, title, author, genre, subject, publisher, price, cover)
WHERE NOT EXISTS (
  SELECT 1 FROM dausach existing
  WHERE lower(existing.tensach) = lower(seed.title)
)
ON CONFLICT (madausach) DO NOTHING;