const { createClient } = require('@supabase/supabase-js');

// 서버 설정에서 Supabase 클라이언트 가져오기
const supabaseUrl = 'https://aqcewkutnssgrioxlqba.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxY2V3a3V0bnNzZ3Jpb3hsb2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5MzM5NDUsImV4cCI6MjA1MDUwOTk0NX0.YCJhFmkOzUVDG8iAP8z4s-jJO9A8WQdKsRGLRfGqQ8U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUserInvestmentMapping() {
    try {
        console.log('🔍 사용자 및 투자 데이터 매핑 문제 해결 시작...');
        
        // 1. asas1212 사용자 정보 조회
        const { data: user, error: userError } = await supabase
            .from('members')
            .select('*')
            .eq('username', 'asas1212')
            .single();
            
        if (userError || !user) {
            console.error('❌ asas1212 사용자를 찾을 수 없습니다:', userError);
            return;
        }
        
        console.log('✅ asas1212 사용자 정보:', {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email
        });
        
        // 2. 허진주 이름으로 된 투자 데이터 조회
        console.log('\n🔍 허진주 이름의 투자 데이터 조회...');
        
        const { data: investments, error: investmentError } = await supabase
            .from('investments')
            .select('*')
            .or('member_name.eq.허진주,product_name.ilike.%300kw%')
            .order('created_at', { ascending: false });
            
        if (investmentError) {
            console.error('❌ 투자 데이터 조회 오류:', investmentError);
            return;
        }
        
        console.log(`✅ 발견된 투자 데이터: ${investments.length}건`);
        
        if (investments && investments.length > 0) {
            for (let i = 0; i < investments.length; i++) {
                const investment = investments[i];
                console.log(`\n📋 투자 ${i + 1}:`);
                console.log(`   - ID: ${investment.id}`);
                console.log(`   - 현재 member_id: ${investment.member_id}`);
                console.log(`   - 상품명: ${investment.product_name}`);
                console.log(`   - 출자금액: ₩${parseFloat(investment.amount || 0).toLocaleString()}`);
                console.log(`   - 상태: ${investment.status}`);
                console.log(`   - 생성일: ${new Date(investment.created_at).toLocaleString('ko-KR')}`);
                
                // 3. member_id를 asas1212 사용자 ID로 업데이트
                if (investment.member_id !== user.id) {
                    console.log(`🔄 member_id를 ${investment.member_id}에서 ${user.id}로 업데이트...`);
                    
                    const { error: updateError } = await supabase
                        .from('investments')
                        .update({ member_id: user.id })
                        .eq('id', investment.id);
                        
                    if (updateError) {
                        console.error(`❌ 투자 ${investment.id} 업데이트 실패:`, updateError);
                    } else {
                        console.log(`✅ 투자 ${investment.id} member_id 업데이트 완료`);
                    }
                } else {
                    console.log(`✅ 투자 ${investment.id}는 이미 올바른 member_id를 가지고 있습니다.`);
                }
            }
        } else {
            console.log('❌ 허진주 관련 투자 데이터를 찾을 수 없습니다.');
        }
        
        // 4. 업데이트 후 asas1212의 투자 데이터 재조회
        console.log('\n🔍 업데이트 후 asas1212의 투자 데이터 재조회...');
        
        const { data: userInvestments, error: finalError } = await supabase
            .from('investments')
            .select('*')
            .eq('member_id', user.id)
            .order('created_at', { ascending: false });
            
        if (finalError) {
            console.error('❌ 최종 투자 데이터 조회 오류:', finalError);
        } else {
            console.log(`✅ asas1212의 최종 투자 데이터: ${userInvestments.length}건`);
            userInvestments.forEach((inv, index) => {
                console.log(`   📋 투자 ${index + 1}: ${inv.product_name} - ₩${parseFloat(inv.amount || 0).toLocaleString()} (${inv.status})`);
            });
        }
        
        console.log('\n🎉 사용자 투자 데이터 매핑 수정 완료!');
        
    } catch (error) {
        console.error('❌ 오류 발생:', error);
    }
}

fixUserInvestmentMapping();
