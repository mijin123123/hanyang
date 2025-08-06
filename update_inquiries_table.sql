-- inquiries 테이블에 phone 컬럼 추가
-- Supabase SQL Editor에서 실행

ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 기존 데이터가 있다면 phone 컬럼은 NULL로 설정됨
-- 새로운 문의부터는 전화번호가 저장됩니다.

-- 컬럼 추가 확인 쿼리 (선택사항)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'inquiries' 
-- ORDER BY ordinal_position;
