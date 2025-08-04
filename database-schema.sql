-- 한양에너지 Supabase 데이터베이스 스키마
-- 실행 순서: 이 파일의 SQL을 Supabase SQL Editor에서 실행
-- 
-- 데이터베이스 연결 정보:
-- Project URL: https://aqcewkutnssgrioxlqba.supabase.co
-- API Key (anon): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxY2V3a3V0bnNzZ3Jpb3hscWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyOTAxNDgsImV4cCI6MjA2OTg2NjE0OH0.CdU2UhkIu6Wcyl4GWTg4a0z9eovgkFSSNn9sZfUKSAw
-- Direct Connection URL: postgresql://postgres:dkdlfltm1640@db.aqcewkutnssgrioxlqba.supabase.co:5432/postgres
--

-- 1. 회원 테이블 (members)
CREATE TABLE IF NOT EXISTS members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    birth_date DATE,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES members(id)
);

-- 2. 투자 기록 테이블 (investments)
CREATE TABLE IF NOT EXISTS investments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    product_name VARCHAR(200) NOT NULL,
    investment_amount DECIMAL(15,2) NOT NULL,
    investment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 회원가입 승인 로그 테이블 (approval_logs)
CREATE TABLE IF NOT EXISTS approval_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected')),
    admin_id UUID REFERENCES members(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 공지사항 테이블 (notices)
CREATE TABLE IF NOT EXISTS notices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 문의사항 테이블 (inquiries)
CREATE TABLE IF NOT EXISTS inquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'closed')),
    admin_reply TEXT,
    replied_at TIMESTAMP WITH TIME ZONE,
    replied_by UUID REFERENCES members(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 팝업 관리 테이블 (popups)
CREATE TABLE IF NOT EXISTS popups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 사이트 설정 테이블 (site_settings)
CREATE TABLE IF NOT EXISTS site_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 사이트 설정 기본값 삽입
INSERT INTO site_settings (setting_key, setting_value, description) VALUES
('company_name', '한양에너지협동조합', '회사명'),
('account_number', '농협 123-456-789-10', '계좌번호'),
('account_holder', '한양에너지협동조합', '예금주'),
('contact_phone', '02-1234-5678', '대표 전화번호'),
('contact_email', 'info@hanyang-energy.co.kr', '대표 이메일'),
('address', '서울특별시 강남구 테헤란로 123길 45', '회사 주소')
ON CONFLICT (setting_key) DO NOTHING;

-- 9. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_members_username ON members(username);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_investments_member_id ON investments(member_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_member_id ON approval_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_member_id ON inquiries(member_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_popups_status ON popups(status);
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key);

-- 10. RLS (Row Level Security) 정책 설정
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE popups ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- 11. 기본 관리자 계정 삽입 (비밀번호: minj0010)
-- 비밀번호 해시는 JavaScript의 hashPassword 함수와 동일한 방식으로 계산됨
INSERT INTO members (username, password_hash, name, email, role, status, approved_at) 
VALUES (
    'minj0010', 
    'd05672fe1c4d9ebcdd97b921de9dae17d038891b8041ee92e8f1b3b4f71b3c71', -- minj0010 + hanyang_salt 실제 해시값
    '김민정', 
    'minj0010@hanyang.com', 
    'admin', 
    'approved',
    NOW()
) ON CONFLICT (username) DO NOTHING;

-- 추가 관리자 계정 (admin/admin123)
INSERT INTO members (username, password_hash, name, email, role, status, approved_at) 
VALUES (
    'admin', 
    '5ffcb6afb34f53e143b48b4081aab173dd4d18442498e44f66a77646b3ce4be6', -- admin123 + hanyang_salt 실제 해시값
    '시스템관리자', 
    'admin@hanyang.com', 
    'admin', 
    'approved',
    NOW()
) ON CONFLICT (username) DO NOTHING;

-- 12. 샘플 공지사항 데이터 삽입
INSERT INTO notices (title, content, is_pinned) VALUES 
('[중요] 2024년 투자수익 정산 안내', '2024년 투자수익 정산이 완료되었습니다. 마이페이지에서 상세 내역을 확인하실 수 있습니다.', true),
('한전과의 장기계약 체결 소식', '한국전력공사와 20년 장기 전력판매계약을 성공적으로 체결하였습니다.', false),
('태양광 발전소 신규 건설 현황', '경기도 일대에 신규 태양광 발전소 건설이 순조롭게 진행되고 있습니다.', false)
ON CONFLICT DO NOTHING;
