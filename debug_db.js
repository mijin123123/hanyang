const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

function hashPassword(password) {
    const salt = 'hanyang_salt';
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}

const supabase = createClient(
    'https://aqcewkutnssgrioxlqba.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxY2V3a3V0bnNzZ3Jpb3hscWJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5MDE0OCwiZXhwIjoyMDY5ODY2MTQ4fQ.Kz0ARhQd3lRDjF0qRDv9j5dqjzeQpw726QkbwghKX6I'
);

async function checkUsers() {
    try {
        console.log('=== Supabase 연결 테스트 ===');
        
        // 전체 사용자 조회
        const { data: allUsers, error: allError } = await supabase
            .from('members')
            .select('*');
            
        if (allError) {
            console.log('❌ 전체 사용자 조회 오류:', allError);
            return;
        }
        
        console.log('📊 전체 사용자 수:', allUsers?.length || 0);
        
        if (allUsers && allUsers.length > 0) {
            allUsers.forEach(user => {
                console.log(`- ${user.username} (${user.name}) - ${user.role} - ${user.status}`);
            });
        }
        
        // minj0010 사용자 특별 확인
        console.log('\n=== minj0010 사용자 확인 ===');
        const { data: minj, error: minjError } = await supabase
            .from('members')
            .select('*')
            .eq('username', 'minj0010');
            
        if (minjError) {
            console.log('❌ minj0010 조회 오류:', minjError);
        } else {
            console.log('minj0010 결과 수:', minj?.length || 0);
            if (minj && minj.length > 0) {
                const user = minj[0];
                console.log('저장된 해시:', user.password_hash);
                console.log('minj0010 해시:', hashPassword('minj0010'));
                console.log('해시 일치:', user.password_hash === hashPassword('minj0010'));
            } else {
                console.log('❌ minj0010 사용자를 찾을 수 없습니다');
            }
        }
        
        // 중복 사용자 확인
        console.log('\n=== 중복 사용자 확인 ===');
        const usernames = allUsers?.map(u => u.username) || [];
        const duplicates = usernames.filter((item, index) => usernames.indexOf(item) !== index);
        if (duplicates.length > 0) {
            console.log('❌ 중복된 사용자명:', duplicates);
        } else {
            console.log('✅ 중복 사용자 없음');
        }
        
    } catch (error) {
        console.error('오류 발생:', error);
    }
}

checkUsers();
