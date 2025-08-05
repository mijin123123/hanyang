-- 투자 테이블 구조 업데이트
-- Supabase SQL Editor에서 실행

-- 기존 investments 테이블 삭제 (필요시)
DROP TABLE IF EXISTS investments CASCADE;

-- 새로운 investments 테이블 생성
CREATE TABLE investments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    product_type VARCHAR(50) NOT NULL, -- '300kw', '500kw', '1mw', 'green_starter', 'laon', 'simple_eco'
    amount DECIMAL(15,2) NOT NULL,
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note TEXT,
    processed_by UUID REFERENCES members(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_investments_member_id ON investments(member_id);
CREATE INDEX idx_investments_status ON investments(status);
CREATE INDEX idx_investments_created_at ON investments(created_at);

-- 권한 설정 (필요시)
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (사용자는 자신의 투자만 볼 수 있도록)
CREATE POLICY "Users can view own investments" ON investments
    FOR SELECT USING (auth.uid()::text = member_id::text);

-- 인증된 사용자만 투자 신청 가능
CREATE POLICY "Authenticated users can insert investments" ON investments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 관리자만 모든 투자 내역 조회 가능
CREATE POLICY "Admins can view all investments" ON investments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members 
            WHERE id = auth.uid()::uuid 
            AND role = 'admin'
        )
    );
