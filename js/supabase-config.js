// Supabase 설정 파일
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

// Supabase 설정 (실제 환경에서는 환경변수로 관리)
const supabaseUrl = 'YOUR_SUPABASE_URL'; // 나중에 실제 URL로 교체
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'; // 나중에 실제 키로 교체

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseKey);

// 데이터베이스 테이블 스키마
/*
-- 회원 테이블 (members)
CREATE TABLE members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    birth_date DATE,
    role VARCHAR(20) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES members(id)
);

-- 투자 기록 테이블 (investments)
CREATE TABLE investments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES members(id),
    product_name VARCHAR(200) NOT NULL,
    investment_amount DECIMAL(15,2) NOT NULL,
    investment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 회원가입 승인 로그 테이블 (approval_logs)
CREATE TABLE approval_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES members(id),
    action VARCHAR(20) NOT NULL, -- approved, rejected
    admin_id UUID REFERENCES members(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
*/

// 회원가입 함수
export async function signupUser(userData) {
    try {
        // 비밀번호 해싱 (실제 환경에서는 서버에서 처리)
        const passwordHash = await hashPassword(userData.password);
        
        const { data, error } = await supabase
            .from('members')
            .insert([
                {
                    username: userData.username,
                    password_hash: passwordHash,
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone,
                    address: userData.address,
                    birth_date: userData.birthDate,
                    status: 'pending' // 기본값: 승인 대기
                }
            ])
            .select();
            
        if (error) {
            throw error;
        }
        
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('회원가입 오류:', error);
        return { success: false, error: error.message };
    }
}

// 로그인 함수 (승인된 회원만)
export async function loginUser(username, password) {
    try {
        // 사용자 조회
        const { data: user, error } = await supabase
            .from('members')
            .select('*')
            .eq('username', username)
            .single();
            
        if (error || !user) {
            return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
        }
        
        // 비밀번호 확인
        const isValidPassword = await verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
            return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
        }
        
        // 승인 상태 확인
        if (user.status !== 'approved') {
            let message = '';
            switch (user.status) {
                case 'pending':
                    message = '회원가입 승인 대기 중입니다. 관리자 승인 후 로그인이 가능합니다.';
                    break;
                case 'rejected':
                    message = '회원가입이 거부되었습니다. 관리자에게 문의해주세요.';
                    break;
                default:
                    message = '계정에 문제가 있습니다. 관리자에게 문의해주세요.';
            }
            return { success: false, message };
        }
        
        // 로그인 성공
        const sessionData = {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('userSession', JSON.stringify(sessionData));
        return { success: true, user: sessionData };
        
    } catch (error) {
        console.error('로그인 오류:', error);
        return { success: false, message: '로그인 중 오류가 발생했습니다.' };
    }
}

// 승인 대기 회원 목록 조회 (관리자용)
export async function getPendingMembers() {
    try {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
            
        if (error) {
            throw error;
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('승인 대기 회원 조회 오류:', error);
        return { success: false, error: error.message };
    }
}

// 회원 승인/거부 처리 (관리자용)
export async function approveMember(memberId, action, adminId, reason = '') {
    try {
        // 회원 상태 업데이트
        const { data: memberData, error: memberError } = await supabase
            .from('members')
            .update({
                status: action, // 'approved' or 'rejected'
                approved_at: action === 'approved' ? new Date().toISOString() : null,
                approved_by: adminId,
                updated_at: new Date().toISOString()
            })
            .eq('id', memberId)
            .select();
            
        if (memberError) {
            throw memberError;
        }
        
        // 승인 로그 기록
        const { error: logError } = await supabase
            .from('approval_logs')
            .insert([
                {
                    member_id: memberId,
                    action: action,
                    admin_id: adminId,
                    reason: reason
                }
            ]);
            
        if (logError) {
            console.warn('승인 로그 기록 실패:', logError);
        }
        
        return { success: true, data: memberData[0] };
    } catch (error) {
        console.error('회원 승인/거부 오류:', error);
        return { success: false, error: error.message };
    }
}

// 비밀번호 해싱 (간단한 구현, 실제로는 서버에서 bcrypt 사용)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'hanyang_salt'); // 솔트 추가
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 비밀번호 검증
async function verifyPassword(password, hash) {
    const passwordHash = await hashPassword(password);
    return passwordHash === hash;
}

// 모든 회원 목록 조회 (관리자용)
export async function getAllMembers() {
    try {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) {
            throw error;
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('회원 목록 조회 오류:', error);
        return { success: false, error: error.message };
    }
}
