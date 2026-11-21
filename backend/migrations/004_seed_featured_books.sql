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