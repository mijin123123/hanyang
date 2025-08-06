require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// 환경변수에서 Supabase 설정 읽기
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🔧 Supabase URL:', supabaseUrl);
console.log('🔧 Supabase Key:', supabaseKey ? '설정됨' : '없음');

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUserInvestments() {
    try {
        console.log('🔍 허진주님 사용자 정보 조회...');
        
        // 1. 사용자 정보 조회
        const { data: user, error: userError } = await supabase
            .from('members')
            .select('*')
            .eq('username', '허진주')
            .single();
            
        if (userError) {
            console.error('❌ 사용자 조회 오류:', userError);
            return;
        }
        
        if (!user) {
            console.log('❌ 허진주님 계정을 찾을 수 없습니다.');
            return;
        }
        
        console.log('✅ 사용자 정보:', {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email
        });
        
        // 2. 투자 데이터 조회
        console.log('\n🔍 허진주님 투자 내역 조회...');
        
        const { data: investments, error: investmentError } = await supabase
            .from('investments')
            .select('*')
            .eq('member_id', user.id)
            .order('created_at', { ascending: false });
            
        if (investmentError) {
            console.error('❌ 투자 내역 조회 오류:', investmentError);
            return;
        }
        
        if (!investments || investments.length === 0) {
            console.log('❌ 투자 내역이 없습니다.');
            return;
        }
        
        console.log(`✅ 총 ${investments.length}건의 투자 내역 발견:`);
        
        investments.forEach((investment, index) => {
            console.log(`\n📋 투자 ${index + 1}:`);
            console.log(`   - ID: ${investment.id}`);
            console.log(`   - 상품명: ${investment.product_name}`);
            console.log(`   - 출자금액: ₩${parseFloat(investment.amount || 0).toLocaleString()}`);
            console.log(`   - 상태: ${investment.status}`);
            console.log(`   - 신청일: ${new Date(investment.created_at).toLocaleString('ko-KR')}`);
            console.log(`   - 업데이트: ${new Date(investment.updated_at).toLocaleString('ko-KR')}`);
        });
        
        // 3. 잔액 정보 조회
        console.log('\n🔍 허진주님 잔액 정보 조회...');
        
        const { data: balance, error: balanceError } = await supabase
            .from('member_balances')
            .select('*')
            .eq('member_id', user.id)
            .single();
            
        if (balanceError) {
            console.log('❌ 잔액 정보 없음:', balanceError.message);
        } else {
            console.log('✅ 잔액 정보:', {
                balance: balance.balance,
                updated_at: new Date(balance.updated_at).toLocaleString('ko-KR')
            });
        }
        
    } catch (error) {
        console.error('❌ 디버깅 중 오류:', error);
    }
}

debugUserInvestments();
