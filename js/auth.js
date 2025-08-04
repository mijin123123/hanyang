// 인증 관련 JavaScript 파일

// Supabase 연동 준비 (동적 import 사용)
let supabaseModule = null;

// Supabase 사용 여부 설정
const USE_SUPABASE = false; // RLS 정책 오류로 임시 비활성화

// Supabase 모듈 로드 함수
async function loadSupabaseModule() {
    if (!supabaseModule && USE_SUPABASE) {
        try {
            console.log('Supabase 모듈 로드 시도...'); // 디버깅용
            supabaseModule = await import('./supabase-config.js');
            console.log('Supabase 모듈 로드 완료:', supabaseModule);
        } catch (error) {
            console.error('Supabase 모듈 로드 실패:', error);
            console.error('오류 상세:', error.stack); // 더 자세한 오류 정보
            // Supabase 로드 실패시 로컬 방식으로 fallback - 하지만 경고 표시
            console.warn('Supabase 연결 실패로 로컬 저장소 방식으로 전환됩니다.');
            alert('데이터베이스 연결에 실패했습니다. 임시로 로컬 저장소를 사용합니다.');
        }
    }
}

// 임시 사용자 데이터베이스 (Supabase 미사용시 또는 백업용)
const users = [
    { id: '1', username: 'minj0010', password: 'minj0010', name: '김민정', role: 'admin', status: 'approved' },
    { id: '2', username: 'admin', password: 'admin123', name: '관리자', role: 'admin', status: 'approved' },
    { id: '3', username: 'user1', password: 'user123', name: '김회원', role: 'user', status: 'approved' },
    { id: '4', username: 'user2', password: 'user456', name: '이투자', role: 'user', status: 'approved' },
    { id: '5', username: 'test', password: 'test123', name: '테스트', role: 'user', status: 'pending' }
];

// 승인 대기 회원 목록 (임시)
let pendingMembers = [
    {
        id: '6',
        username: 'newuser1',
        name: '박신청',
        email: 'newuser1@example.com',
        phone: '010-1234-5678',
        address: '서울시 강남구',
        status: 'pending',
        created_at: '2024-01-15T10:30:00Z'
    },
    {
        id: '7',
        username: 'newuser2',
        name: '최대기',
        email: 'newuser2@example.com',
        phone: '010-9876-5432',
        address: '서울시 서초구',
        status: 'pending',
        created_at: '2024-01-14T15:20:00Z'
    }
];

// 조합상품 보호 페이지 목록
const protectedPages = [
    'introduce_product.html',
    'product_list.html', 
    'my_investments.html',
    'withdraw_request.html',
    'investment_detail.html',
    'investment_detail_300kw.html',
    'investment_detail_500kw.html',
    'investment_detail_green_starter.html',
    'investment_detail_laon.html',
    'investment_detail_simple_eco.html'
];

// 로그인 함수 (승인 상태 확인 포함)
async function login(username, password) {
    // Supabase 모듈 로드 시도
    await loadSupabaseModule();
    
    if (USE_SUPABASE && supabaseModule) {
        // Supabase 로그인 사용
        return await supabaseModule.loginUser(username, password);
    } else {
        // 기존 로컬 로그인 방식
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
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
            
            // 로그인 성공 - 세션 저장
            const sessionData = {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                loginTime: new Date().toISOString()
            };
            
            localStorage.setItem('userSession', JSON.stringify(sessionData));
            return { success: true, user: sessionData };
        } else {
            return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
        }
    }
}

// 로그아웃 함수
function logout() {
    localStorage.removeItem('userSession');
    localStorage.removeItem('redirectUrl');
    window.location.href = 'login.html';
}

// 현재 로그인된 사용자 정보 가져오기
function getCurrentUser() {
    const sessionData = localStorage.getItem('userSession');
    if (sessionData) {
        try {
            return JSON.parse(sessionData);
        } catch (e) {
            localStorage.removeItem('userSession');
            return null;
        }
    }
    return null;
}

// 로그인 상태 확인
function isLoggedIn() {
    return getCurrentUser() !== null;
}

// 로그인이 필요한 페이지에서 사용할 체크 함수
function requireLogin() {
    if (!isLoggedIn()) {
        alert('로그인이 필요한 서비스입니다.');
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// 관리자 권한 체크
function requireAdmin() {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
        alert('관리자 권한이 필요합니다.');
        return false;
    }
    return true;
}

// 헤더에서 사용자 정보 표시
function updateHeaderUserInfo() {
    const user = getCurrentUser();
    const authArea = document.querySelector('.hy-auth-area');
    const mobileAuth = document.querySelector('.hy-mobile-auth');
    
    if (user && authArea) {
        // 데스크탑 헤더 업데이트 - 새로운 디자인
        authArea.innerHTML = `
            <div class="user-info">
                <span class="hy-username">${user.name}님</span>
                <a href="mypage.html" class="hy-auth-link" style="background: #0056a3; color: white; border-color: #0056a3; padding: 8px 16px; border-radius: 4px; margin-left: 10px;">
                    <i class="fas fa-user"></i> 마이페이지
                </a>
                <button onclick="logout()" class="logout-btn" style="margin-left: 10px;">
                    <i class="fas fa-sign-out-alt"></i> 로그아웃
                </button>
            </div>
        `;
    }
    
    if (user && mobileAuth) {
        // 모바일 헤더 업데이트 - 새로운 디자인
        mobileAuth.innerHTML = `
            <div class="user-info">
                <span class="user-name">
                    <i class="fas fa-user-circle"></i> ${user.name}님
                </span>
                <a href="mypage.html" class="hy-mobile-auth-btn" style="background: #0056a3; color: white; border-color: #0056a3; margin-bottom: 8px;">
                    <i class="fas fa-user"></i> 마이페이지
                </a>
                <button onclick="logout()" class="logout-btn">
                    <i class="fas fa-sign-out-alt"></i> 로그아웃
                </button>
            </div>
        `;
    }
    
    // 로그인하지 않은 경우
    if (!user) {
        if (authArea) {
            authArea.innerHTML = `
                <a href="login.html" class="hy-auth-link">
                    <i class="fas fa-sign-in-alt"></i> 로그인
                </a>
                <a href="signup.html" class="hy-auth-link hy-signup">
                    <i class="fas fa-user-plus"></i> 회원가입
                </a>
            `;
        }
        
        if (mobileAuth) {
            mobileAuth.innerHTML = `
                <a href="login.html" class="hy-mobile-auth-btn">
                    <i class="fas fa-sign-in-alt"></i> 로그인
                </a>
                <a href="signup.html" class="hy-mobile-auth-btn hy-signup">
                    <i class="fas fa-user-plus"></i> 회원가입
                </a>
            `;
        }
    }
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    // 현재 페이지가 로그인 페이지가 아니라면 헤더 업데이트
    if (!window.location.pathname.includes('login.html')) {
        updateHeaderUserInfo();
    }
    
    // 로그인 페이지에서 이미 로그인된 경우 메인으로 리다이렉트
    if (window.location.pathname.includes('login.html') && isLoggedIn()) {
        window.location.href = 'index.html';
    }
});

// 자동 로그아웃 (24시간 후)
function checkSessionExpiry() {
    const user = getCurrentUser();
    if (user) {
        const loginTime = new Date(user.loginTime);
        const now = new Date();
        const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
            logout();
        }
    }
}

// 1분마다 세션 만료 체크
setInterval(checkSessionExpiry, 60000);

// 사용자 프로필 업데이트 함수
function updateUserProfile(userData) {
    const user = getCurrentUser();
    if (!user) return false;
    
    // 비밀번호 업데이트 (실제 구현에서는 서버로 전송)
    if (userData.password) {
        // 실제로는 해시화해서 저장해야 함
        const userIndex = users.findIndex(u => u.username === user.username);
        if (userIndex !== -1) {
            users[userIndex].password = userData.password;
        }
    }
    
    // 전화번호 업데이트 (실제로는 서버에 저장)
    if (userData.phone) {
        user.phone = userData.phone;
        localStorage.setItem('userSession', JSON.stringify(user));
    }
    
    return true;
}

// 회원가입 함수 (승인 대기 상태로 등록)
async function signup(userData) {
    console.log('signup 함수 호출됨, 데이터:', userData); // 디버깅용
    
    // Supabase 모듈 로드 시도
    await loadSupabaseModule();
    
    console.log('USE_SUPABASE:', USE_SUPABASE, 'supabaseModule:', !!supabaseModule); // 디버깅용
    
    if (USE_SUPABASE && supabaseModule) {
        // Supabase 회원가입 사용
        console.log('Supabase 회원가입 시도'); // 디버깅용
        return await supabaseModule.signupUser(userData);
    } else {
        console.log('로컬 회원가입 방식 사용'); // 디버깅용
        
        try {
            // 입력 데이터 검증
            if (!userData || !userData.username || !userData.password || !userData.name || !userData.email) {
                return { success: false, message: '필수 정보가 누락되었습니다.' };
            }
            
            // 기존 로컬 방식
            // 중복 확인
            const existingUser = users.find(u => u.username === userData.username || u.email === userData.email);
            const storedPending = JSON.parse(localStorage.getItem('pendingMembers') || '[]');
            const existingPending = storedPending.find(u => u.username === userData.username || u.email === userData.email);
            
            console.log('중복 확인 결과:', { 
                existingUser: !!existingUser, 
                existingPending: !!existingPending,
                userData: userData.username 
            }); // 디버깅용
            
            if (existingUser || existingPending) {
                return { success: false, message: '이미 사용 중인 아이디 또는 이메일입니다.' };
            }
            
            // 새 회원 추가 (승인 대기 상태)
            const newUser = {
                id: Date.now().toString(),
                username: userData.username,
                password: userData.password,
                name: userData.name,
                email: userData.email,
                phone: userData.phone || '',
                address: userData.address || '',
                role: 'user',
                status: 'pending', // 승인 대기 상태
                created_at: new Date().toISOString()
            };
            
            console.log('새 회원 생성:', newUser); // 디버깅용
            
            // 임시로 pendingMembers에 추가
            pendingMembers.push(newUser);
            
            // localStorage에도 저장하여 관리자 페이지에서 접근 가능하도록 함
            const updatedPending = [...storedPending, newUser];
            localStorage.setItem('pendingMembers', JSON.stringify(updatedPending));
            
            console.log('pendingMembers 업데이트됨, 총 개수:', pendingMembers.length); // 디버깅용
            console.log('localStorage에 저장된 pendingMembers:', updatedPending); // 디버깅용
            
            return { 
                success: true, 
                message: '회원가입이 완료되었습니다. 관리자 승인 후 로그인이 가능합니다.',
                user: newUser 
            };
        } catch (error) {
            console.error('로컬 회원가입 처리 중 오류:', error);
            return { 
                success: false, 
                message: '회원가입 처리 중 오류가 발생했습니다: ' + error.message 
            };
        }
    }
}

// 승인 대기 회원 목록 조회 (관리자용)
async function getPendingMembers() {
    // Supabase 모듈 로드 시도
    await loadSupabaseModule();
    
    console.log('getPendingMembers 호출, USE_SUPABASE:', USE_SUPABASE, 'supabaseModule:', !!supabaseModule);
    
    if (USE_SUPABASE && supabaseModule) {
        try {
            console.log('Supabase를 통한 승인 대기 회원 조회 시도...');
            const result = await supabaseModule.getPendingMembers();
            console.log('Supabase 조회 결과:', result);
            
            if (result.success && Array.isArray(result.data)) {
                console.log('Supabase에서 승인 대기 회원 조회 성공:', result.data.length, '명');
                return result.data;
            } else {
                console.warn('Supabase 조회 실패 또는 잘못된 데이터 형식:', result);
                return [];
            }
        } catch (error) {
            console.error('Supabase 승인 대기 회원 조회 오류:', error);
            return [];
        }
    } else {
        // localStorage 초기화 확인
        let storedPending = JSON.parse(localStorage.getItem('pendingMembers') || '[]');
        
        // localStorage가 비어있으면 기본 데이터로 초기화
        if (storedPending.length === 0) {
            storedPending = [
                {
                    id: '6',
                    username: 'newuser1',
                    name: '박신청',
                    email: 'newuser1@example.com',
                    phone: '010-1234-5678',
                    address: '서울시 강남구',
                    status: 'pending',
                    created_at: '2024-01-15T10:30:00Z'
                },
                {
                    id: '7',
                    username: 'newuser2',
                    name: '최대기',
                    email: 'newuser2@example.com',
                    phone: '010-9876-5432',
                    address: '서울시 서초구',
                    status: 'pending',
                    created_at: '2024-01-14T15:20:00Z'
                }
            ];
            localStorage.setItem('pendingMembers', JSON.stringify(storedPending));
            console.log('localStorage에 기본 대기 회원 초기화됨:', storedPending); // 디버깅용
        }
        
        const memoryPending = pendingMembers.filter(member => member.status === 'pending');
        
        // 중복 제거 (ID 기준)
        const allPending = [...storedPending];
        memoryPending.forEach(member => {
            if (!storedPending.find(stored => stored.id === member.id)) {
                allPending.push(member);
            }
        });
        
        console.log('getPendingMembers 결과:', allPending); // 디버깅용
        return allPending.filter(member => member.status === 'pending');
    }
}

// 회원 승인/거부 처리 (관리자용)
async function approveMember(memberId, action, reason = '') {
    // Supabase 모듈 로드 시도
    await loadSupabaseModule();
    
    if (USE_SUPABASE && supabaseModule) {
        const admin = getCurrentUser();
        if (!admin) {
            return { success: false, message: '관리자 권한이 필요합니다.' };
        }
        return await supabaseModule.approveMember(memberId, action, admin.id, reason);
    } else {
        // 기존 로컬 방식 - localStorage에서도 처리
        // localStorage에서 찾기
        const storedPending = JSON.parse(localStorage.getItem('pendingMembers') || '[]');
        const storedIndex = storedPending.findIndex(m => m.id === memberId);
        
        // 메모리에서 찾기
        const memberIndex = pendingMembers.findIndex(m => m.id === memberId);
        
        let member = null;
        if (storedIndex !== -1) {
            member = storedPending[storedIndex];
        } else if (memberIndex !== -1) {
            member = pendingMembers[memberIndex];
        }
        
        if (!member) {
            return { success: false, message: '회원을 찾을 수 없습니다.' };
        }
        
        if (action === 'approved') {
            // 승인: users 배열에 추가
            member.status = 'approved';
            member.approved_at = new Date().toISOString();
            users.push(member);
            
            // pendingMembers에서 제거
            if (memberIndex !== -1) {
                pendingMembers.splice(memberIndex, 1);
            }
            
            // localStorage에서도 제거
            if (storedIndex !== -1) {
                storedPending.splice(storedIndex, 1);
                localStorage.setItem('pendingMembers', JSON.stringify(storedPending));
            }
            
            // 승인된 사용자를 localStorage에 저장
            const approvedUsers = JSON.parse(localStorage.getItem('approvedUsers') || '[]');
            approvedUsers.push(member);
            localStorage.setItem('approvedUsers', JSON.stringify(approvedUsers));
            
            return { success: true, message: '회원이 승인되었습니다.', member };
        } else if (action === 'rejected') {
            // 거부: 상태만 변경
            member.status = 'rejected';
            member.rejected_at = new Date().toISOString();
            member.reject_reason = reason;
            
            // localStorage 업데이트
            if (storedIndex !== -1) {
                storedPending[storedIndex] = member;
                localStorage.setItem('pendingMembers', JSON.stringify(storedPending));
            }
            
            // 메모리 업데이트
            if (memberIndex !== -1) {
                pendingMembers[memberIndex] = member;
            }
            
            return { success: true, message: '회원가입이 거부되었습니다.', member };
        }
        
        return { success: false, message: '올바르지 않은 처리 방식입니다.' };
    }
}

// 사용자 통계 데이터 가져오기 (샘플 데이터)
function getUserStats(username) {
    const sampleStats = {
        'minj0010': {
            products: 2,
            balance: 4623000,
            investment: 70000000,
            profit: 33177000
        },
        'admin': {
            products: 5,
            balance: 15000000,
            investment: 200000000,
            profit: 85000000
        },
        'user1': {
            products: 1,
            balance: 1500000,
            investment: 30000000,
            profit: 5200000
        },
        'user2': {
            products: 3,
            balance: 3200000,
            investment: 50000000,
            profit: 12000000
        },
        'test': {
            products: 1,
            balance: 800000,
            investment: 20000000,
            profit: 2500000
        }
    };
    
    return sampleStats[username] || {
        products: 0,
        balance: 0,
        investment: 0,
        profit: 0
    };
}

// 사용자 상세 정보 가져오기 (샘플 데이터)
function getUserDetails(username) {
    const sampleDetails = {
        'minj0010': {
            phone: '010-3234-1123',
            bankName: 'KB국민은행',
            accountNumber: '94401139100103',
            address: '서울 강남구 도산대로 104 (논현동)',
            detailAddress: '원경빌301'
        },
        'admin': {
            phone: '010-1234-5678',
            bankName: '신한은행',
            accountNumber: '110123456789',
            address: '서울 종로구 청와대로 1',
            detailAddress: '관리동 101호'
        },
        'user1': {
            phone: '010-9876-5432',
            bankName: '우리은행',
            accountNumber: '1002987654321',
            address: '서울 강남구 테헤란로 123',
            detailAddress: '101동 1203호'
        },
        'user2': {
            phone: '010-5555-6666',
            bankName: '하나은행',
            accountNumber: '12312312312345',
            address: '서울 서초구 서초대로 77',
            detailAddress: '202동 506호'
        },
        'test': {
            phone: '010-1111-2222',
            bankName: '카카오뱅크',
            accountNumber: '333322224444',
            address: '서울 마포구 월드컵북로 396',
            detailAddress: '1층'
        }
    };
    
    return sampleDetails[username] || {
        phone: '',
        bankName: '',
        accountNumber: '',
        address: '',
        detailAddress: ''
    };
}

// 조합상품 페이지 접근 제어
function checkCombinationProductAccess() {
    const currentPage = window.location.pathname.split('/').pop();
    
    // 현재 페이지가 보호된 조합상품 페이지인지 확인
    if (protectedPages.includes(currentPage)) {
        if (!isLoggedIn()) {
            // 현재 페이지 URL을 저장하여 로그인 후 돌아올 수 있도록 함
            localStorage.setItem('redirectUrl', window.location.href);
            
            alert('조합상품 페이지는 로그인이 필요합니다.\n로그인 페이지로 이동합니다.');
            window.location.href = 'login.html';
            return false;
        }
        
        // 로그인 세션 만료 체크 (24시간)
        const user = getCurrentUser();
        if (user && user.loginTime) {
            const loginTime = new Date(user.loginTime);
            const currentTime = new Date();
            const timeDiff = currentTime - loginTime;
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            if (hoursDiff > 24) {
                localStorage.removeItem('userSession');
                alert('로그인 세션이 만료되었습니다.\n다시 로그인해주세요.');
                window.location.href = 'login.html';
                return false;
            }
        }
    }
    
    return true;
}

// 로그인 성공 후 리다이렉트 처리
function handleLoginSuccess() {
    const redirectUrl = localStorage.getItem('redirectUrl');
    if (redirectUrl) {
        localStorage.removeItem('redirectUrl');
        window.location.href = redirectUrl;
    } else {
        window.location.href = 'index.html';
    }
}

// 페이지 로드시 조합상품 접근 체크
document.addEventListener('DOMContentLoaded', function() {
    checkCombinationProductAccess();
});
