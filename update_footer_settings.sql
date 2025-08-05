-- 푸터 설정을 위한 새로운 site_settings 항목 추가

-- 기존 설정이 있다면 업데이트, 없다면 새로 삽입 (UPSERT)
INSERT INTO site_settings (setting_key, setting_value, description) VALUES
('footer_copyright', '© 2025 한양에너지협동조합. All rights reserved.', '푸터 저작권 정보'),
('footer_description', '한양에너지협동조합은 신재생에너지 사업을 통해 지속가능한 미래를 만들어갑니다.', '푸터 설명'),
('business_number', '257-88-01409', '사업자등록번호'),
('representative_name', '정용우 / 정우영 (Co-Owner)', '대표자명'),
('fax_number', '02-1234-5679', '팩스번호')
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 결과 확인
SELECT setting_key, setting_value, description FROM site_settings 
WHERE setting_key IN ('footer_copyright', 'footer_description', 'business_number', 'representative_name', 'fax_number')
ORDER BY setting_key;
