ALTER TABLE phieuphat ADD COLUMN phuongthucthanhtoan VARCHAR(30);
ALTER TABLE phieuphat ADD COLUMN ngaythanhtoan DATE;

CREATE TABLE chitietphieuphat (
  machitietphat VARCHAR(20) PRIMARY KEY,
  maphieuphat VARCHAR(50) NOT NULL REFERENCES phieuphat(maphieuphat) ON DELETE CASCADE,
  machitietmuon VARCHAR(20) NOT NULL REFERENCES chitietphieumuon(machitietmuon),
  loaivipham VARCHAR(255) NOT NULL,
  songayquahan INT NOT NULL DEFAULT 0 CHECK (songayquahan >= 0),
  mucdohuhong VARCHAR(50),
  sotienphat NUMERIC(12,2) NOT NULL CHECK (sotienphat >= 0)
);

CREATE INDEX chitietphieuphat_phieu_idx ON chitietphieuphat(maphieuphat);
CREATE INDEX chitietphieuphat_muon_idx ON chitietphieuphat(machitietmuon);

INSERT INTO chitietphieuphat (machitietphat,maphieuphat,machitietmuon,loaivipham,sotienphat)
SELECT LEFT(MD5(fp.maphieuphat),20), fp.maphieuphat, ct.machitietmuon,
       COALESCE(fp.loaivipham,'Vi phạm'), fp.sotien
FROM phieuphat fp JOIN chitietphieumuon ct ON ct.maphieumuon=fp.maphieumuon;
