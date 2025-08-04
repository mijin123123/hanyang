-- 팝업 관리 테이블 생성
CREATE TABLE IF NOT EXISTS popups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사이트 설정 테이블 생성
CREATE TABLE IF NOT EXISTS site_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사이트 설정 기본값 삽입
INSERT INTO site_settings (setting_key, setting_value, description) VALUES
('company_name', '한양에너지협동조합', '회사명'),
('account_number', '농협 123-456-789-10', '계좌번호'),
('account_holder', '한양에너지협동조합', '예금주'),
('contact_phone', '02-1234-5678', '대표 전화번호'),
('contact_email', 'info@hanyang-energy.co.kr', '대표 이메일'),
('address', '서울특별시 강남구 테헤란로 123길 45', '회사 주소')
ON CONFLICT (setting_key) DO NOTHING;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_popups_status ON popups(status);
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key);

-- RLS 정책 설정 (필요시)
ALTER TABLE popups ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책 (팝업은 모든 사용자가 볼 수 있어야 함)
CREATE POLICY "Enable read access for all users" ON popups FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON site_settings FOR SELECT USING (true);

-- 관리자만 수정 가능 정책 (실제 운영시에는 역할 기반으로 수정)
CREATE POLICY "Enable all access for authenticated users" ON popups FOR ALL USING (true);
CREATE POLICY "Enable all access for authenticated users" ON site_settings FOR ALL USING (true);
