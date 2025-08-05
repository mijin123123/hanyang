-- 기존 members 테이블에 누락된 컬럼들 추가
-- Supabase SQL Editor에서 실행하세요

-- 상세주소 컬럼 추가
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS detail_address TEXT;

-- 은행명 컬럼 추가
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(50);

-- 계좌번호 컬럼 추가
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);

-- 추천인 코드 컬럼 추가
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50);

-- 컬럼 추가 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'members' 
ORDER BY ordinal_position;
