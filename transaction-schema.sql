-- 입출금 관리를 위한 트랜잭션 테이블 추가
-- 이 SQL을 Supabase SQL Editor에서 실행하세요

-- 8. 계좌 잔액 테이블 (member_balances)
CREATE TABLE IF NOT EXISTS member_balances (
    member_id UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
    balance DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. 입출금 신청 테이블 (transactions)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('deposit', 'withdraw')),
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    
    -- 입금 관련 정보
    bank_transfer_name VARCHAR(100), -- 입금자명
    
    -- 출금 관련 정보
    withdraw_bank_name VARCHAR(50),
    withdraw_account_number VARCHAR(50),
    withdraw_account_holder VARCHAR(100),
    
    -- 관리자 승인 정보
    admin_note TEXT,
    processed_by UUID REFERENCES members(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. 트랜잭션 로그 테이블 (transaction_logs)
CREATE TABLE IF NOT EXISTS transaction_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    admin_id UUID REFERENCES members(id),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 회원별 초기 잔액 설정 (기존 사용자들)
INSERT INTO member_balances (member_id, balance, updated_at)
SELECT id, 
    CASE 
        WHEN username = 'minj0010' THEN 4623000.00
        WHEN role = 'admin' THEN 15000000.00
        ELSE 0.00
    END as balance,
    NOW()
FROM members
WHERE id NOT IN (SELECT member_id FROM member_balances)
ON CONFLICT (member_id) DO NOTHING;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_transactions_member_id ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_transaction_id ON transaction_logs(transaction_id);
