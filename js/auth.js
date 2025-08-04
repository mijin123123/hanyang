// 사용자 인증 관련 스크립트
console.log('auth.js가 로드되었습니다.');

// 로그인이 필요한 페이지 목록
const protectedPages = [
    'introduce_product',
    'product_list', 
    'my_investments',
    'withdraw_request',
    'investment_detail',
    'investment_detail_300kw',
    'investment_detail_500kw',
    'investment_detail_green_starter',
    'investment_detail_laon',
    'investment_detail_simple_eco'
];

// 사용자 데이터베이스 (실제 프로젝트에서는 서버에서 관리)
const users = [
    { id: '1', username: 'admin', password: 'admin123', name: '관리자', role: 'admin', status: 'approved' },
    { id: '2', username: 'user1', password: 'user123', name: '김민수', role: 'user', status: 'approved' },
    { id: '3', username: 'test123', password: 'test123', name: '테스트', role: 'user', status: 'approved' },
    { id: '4', username: 'user2', password: 'user456', name: '박투자', role: 'user', status: 'approved' },
    { id: '5', username: 'test', password: 'test123', name: '테스트', role: 'user', status: 'pending' },
    { id: '6', username: 'minj0010', password: 'minj0010', name: '김민정', role: 'admin', status: 'approved' }
];

// 회원가입 신청 데이터 (예시)
const signupRequests = [
    {
        id: '1',
        username: 'newuser1',
        password: 'newpass1',
        name: '박신규',
        email: 'newuser1@example.com',
        phone: '010-1234-5678',
        address: '서울시 강남구',
        status: 'pending',
        createdAt: new Date('2024-01-15').toISOString()
    },
    {
        id: '2',
        username: 'newuser2',
        password: 'newpass2',
        name: '최가입',
        email: 'newuser2@example.com',
        phone: '010-9876-5432',
        address: '서울시 서초구',
        status: 'pending',
        createdAt: new Date('2024-01-20').toISOString()
    }
];

// 로그인 상태 확인 함수 (세션 상태 확인 함수)
function isLoggedIn() {
    const user = localStorage.getItem('currentUser');
    return user !== null;
}

// 현재 사용자 정보 가져오기
function getCurrentUser() {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

// 로그인 함수 (서버 기반)
async function login(username, password) {
    console.log('login 함수가 호출되었습니다:', { username: username, password: password ? '***' : '' });
    
    // 입력값 검증
    if (!username || !password) {
        console.log('입력값 검증 실패');
        return { 
            success: false, 
            message: '아이디와 비밀번호를 모두 입력해주세요.' 
        };
    }
    
    try {
        // 서버로 로그인 요청
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('로그인 성공!');
            // 로컬 스토리지에도 저장 (호환성을 위해)
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            
            // 세션 만료 시간 설정 (24시간)
            const expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000);
            localStorage.setItem('sessionExpiry', expiryTime.toString());
            
            return result;
        } else {
            console.log('로그인 실패:', result.message);
            return result;
        }
    } catch (error) {
        console.error('로그인 요청 중 오류:', error);
        return {
            success: false,
            message: '로그인 요청 중 오류가 발생했습니다.'
        };
    }
}

// 로그아웃 함수 (서버 기반)
async function logout() {
    try {
        // 서버로 로그아웃 요청
        const response = await fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        // 로컬 스토리지 정리
        localStorage.removeItem('currentUser');
        localStorage.removeItem('sessionExpiry');
        
        // 로그인 페이지로 리다이렉트
        window.location.href = '/login';
    } catch (error) {
        console.error('로그아웃 요청 중 오류:', error);
        // 오류가 발생해도 로컬 정리 후 리다이렉트
        localStorage.removeItem('currentUser');
        localStorage.removeItem('sessionExpiry');
        window.location.href = '/login';
    }
}

// 보호된 페이지 접근 체크
function checkPageAccess() {
    const currentPath = window.location.pathname;
    const pageName = currentPath.substring(1); // '/' 제거
    
    // 로그인이 필요한 페이지인지 확인
    if (protectedPages.includes(pageName)) {
        if (!isLoggedIn()) {
            // 현재 페이지를 리다이렉트 URL로 저장
            localStorage.setItem('redirectUrl', currentPath);
            window.location.href = '/login';
            return false;
        }
    }
    return true;
}

// 로그인 성공 후 처리 함수 (서버 기반)
function handleLoginSuccess() {
    console.log('로그인 성공 후 처리');
    
    // 리다이렉트 처리
    const redirectUrl = localStorage.getItem('redirectUrl');
    if (redirectUrl) {
        localStorage.removeItem('redirectUrl');
        window.location.href = redirectUrl;
    } else {
        window.location.href = '/';
    }
}

// 페이지 로드시 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('auth.js DOMContentLoaded 이벤트 실행');
    
    // 모든 페이지에서 서버 세션 상태 확인
    checkServerSession().then(() => {
        // 세션 동기화 후 권한 체크 실행
        
        // 로그인페이지에서 이미 로그인된 경우 메인으로 리다이렉트
        if (window.location.pathname.includes('/login') && isLoggedIn()) {
            window.location.href = '/';
            return;
        }
        
        // /admin 경로 접근 시 관리자 권한 체크 및 리다이렉트
        checkAdminAccess();
        
        // 조합상품 접근 권한 체크
        checkCombinationProductAccess();
    });
});

// 서버 세션 상태 확인 함수
async function checkServerSession() {
    try {
        const response = await fetch('/api/check-session', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.user) {
                // 서버에 세션이 있으면 localStorage 업데이트
                localStorage.setItem('currentUser', JSON.stringify(result.user));
                const expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000);
                localStorage.setItem('sessionExpiry', expiryTime.toString());
                console.log('서버 세션 동기화 완료:', result.user);
            } else {
                // 서버에 세션이 없으면 localStorage 정리
                const localUser = localStorage.getItem('currentUser');
                if (localUser) {
                    console.log('서버 세션이 없어서 localStorage 정리');
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('sessionExpiry');
                }
            }
        }
    } catch (error) {
        console.log('서버 세션 확인 중 오류:', error);
    }
}

// 로그인 후 리다이렉트 처리
function handleLoginRedirect() {
    const redirectUrl = localStorage.getItem('redirectUrl');
    if (redirectUrl) {
        localStorage.removeItem('redirectUrl');
        window.location.href = redirectUrl;
    } else {
        window.location.href = '/';
    }
}

// 사용자 역할 확인 함수
function hasRole(role) {
    const user = getCurrentUser();
    return user && user.role === role;
}

// 관리자 권한 확인
function isAdmin() {
    return hasRole('admin');
}

// 페이지별 권한 체크
function checkPermission(requiredRole) {
    if (requiredRole === 'admin' && !isAdmin()) {
        alert('관리자 권한이 필요합니다.');
        window.location.href = '/';
        return false;
    }
    return true;
}

// 회원가입 함수
function signup(userData) {
    // 사용자명 중복 체크
    const existingUser = users.find(user => user.username === userData.username);
    if (existingUser) {
        return { success: false, message: '이미 사용중인 사용자명입니다.' };
    }
    
    // 이메일 중복 체크
    const existingEmail = users.find(user => user.email === userData.email);
    if (existingEmail) {
        return { success: false, message: '이미 사용중인 이메일입니다.' };
    }
    
    // 새 사용자 ID 생성
    const newUserId = (users.length + 1).toString();
    
    // 새 사용자 객체 생성
    const newUser = {
        id: newUserId,
        username: userData.username,
        password: userData.password,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        address: userData.address,
        role: 'user',
        status: 'pending', // 관리자 승인 대기
        createdAt: new Date().toISOString()
    };
    
    // 회원가입 신청 목록에 추가
    signupRequests.push(newUser);
    
    return { 
        success: true, 
        message: '회원가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.' 
    };
}

// 비밀번호 변경 함수
function changePassword(currentPassword, newPassword) {
    const user = getCurrentUser();
    if (!user) {
        return { success: false, message: '로그인이 필요합니다.' };
    }
    
    // 현재 비밀번호 확인
    const userInDb = users.find(u => u.id === user.id);
    if (!userInDb || userInDb.password !== currentPassword) {
        return { success: false, message: '현재 비밀번호가 올바르지 않습니다.' };
    }
    
    // 비밀번호 업데이트
    userInDb.password = newPassword;
    
    // 로컬 스토리지의 사용자 정보도 업데이트
    const updatedUser = { ...user, password: newPassword };
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    
    return { success: true, message: '비밀번호가 성공적으로 변경되었습니다.' };
}

// 프로필 업데이트 함수
function updateProfile(profileData) {
    const user = getCurrentUser();
    if (!user) {
        return { success: false, message: '로그인이 필요합니다.' };
    }
    
    // 사용자 정보 업데이트
    const userInDb = users.find(u => u.id === user.id);
    if (userInDb) {
        Object.assign(userInDb, profileData);
        
        // 로컬 스토리지의 사용자 정보도 업데이트
        const updatedUser = { ...user, ...profileData };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        
        return { success: true, message: '프로필이 성공적으로 업데이트되었습니다.' };
    }
    
    return { success: false, message: '사용자를 찾을 수 없습니다.' };
}

// 관리자: 회원 승인/거부 함수
function approveUser(userId, action) {
    if (!isAdmin()) {
        return { success: false, message: '관리자 권한이 필요합니다.' };
    }
    
    const signupRequest = signupRequests.find(req => req.id === userId);
    if (!signupRequest) {
        return { success: false, message: '해당 사용자를 찾을 수 없습니다.' };
    }
    
    if (action === 'approve') {
        // 승인: users 배열에 추가하고 signupRequests에서 제거
        signupRequest.status = 'approved';
        users.push(signupRequest);
        
        // signupRequests에서 제거
        const index = signupRequests.findIndex(req => req.id === userId);
        if (index > -1) {
            signupRequests.splice(index, 1);
        }
        
        return { success: true, message: '사용자가 승인되었습니다.' };
    } else if (action === 'reject') {
        // 거부: signupRequests에서 제거
        const index = signupRequests.findIndex(req => req.id === userId);
        if (index > -1) {
            signupRequests.splice(index, 1);
        }
        
        return { success: true, message: '사용자가 거부되었습니다.' };
    }
    
    return { success: false, message: '잘못된 액션입니다.' };
}

// 관리자: 회원가입 신청 목록 가져오기
function getSignupRequests() {
    if (!isAdmin()) {
        return { success: false, message: '관리자 권한이 필요합니다.' };
    }
    
    return { success: true, data: signupRequests };
}

// 관리자: 전체 사용자 목록 가져오기
function getAllUsers() {
    if (!isAdmin()) {
        return { success: false, message: '관리자 권한이 필요합니다.' };
    }
    
    return { success: true, data: users.filter(user => user.role !== 'admin') };
}

// 사용자 삭제 함수 (관리자용)
function deleteUser(userId) {
    if (!isAdmin()) {
        return { success: false, message: '관리자 권한이 필요합니다.' };
    }
    
    const userIndex = users.findIndex(user => user.id === userId);
    if (userIndex === -1) {
        return { success: false, message: '사용자를 찾을 수 없습니다.' };
    }
    
    users.splice(userIndex, 1);
    return { success: true, message: '사용자가 삭제되었습니다.' };
}

// 조합상품 페이지 접근 권한 체크
function checkCombinationProductAccess() {
    const currentPath = window.location.pathname;
    const combinationPages = [
        '/introduce_product',
        '/product_list',
        '/my_investments',
        '/withdraw_request',
        '/investment_detail',
        '/investment_detail_300kw',
        '/investment_detail_500kw',
        '/investment_detail_green_starter',
        '/investment_detail_laon',
        '/investment_detail_simple_eco'
    ];
    
    if (combinationPages.includes(currentPath)) {
        if (!isLoggedIn()) {
            // 현재 페이지 URL을 저장하여 로그인 후 리다이렉트
            localStorage.setItem('redirectUrl', currentPath);
            alert('조합상품 페이지는 로그인 후 이용 가능합니다.');
            window.location.href = '/login';
            return false;
        }
        
        const user = getCurrentUser();
        
        // 관리자는 무조건 접근 허용
        if (user && user.role === 'admin') {
            return true;
        }
        
        // 일반 사용자는 승인 상태 체크
        if (user && user.status !== 'approved') {
            alert('관리자 승인 후 이용 가능합니다.');
            window.location.href = '/';
            return false;
        }
    }
    return true;
}

// 로그인 후 리다이렉트 처리
function handleLoginRedirect() {
    const redirectUrl = localStorage.getItem('redirectUrl');
    if (redirectUrl) {
        localStorage.removeItem('redirectUrl');
        window.location.href = redirectUrl;
    } else {
        window.location.href = '/';
    }
}

// 로그인 성공 후 처리 함수 (login.ejs에서 사용)
function handleLoginSuccess() {
    // 리다이렉트 처리
    handleLoginRedirect();
}

// 관리자 페이지 접근 권한 체크
function checkAdminAccess() {
    const currentPath = window.location.pathname;
    
    // /admin 경로나 관리자 페이지 경로들
    const adminPaths = [
        '/admin',
        '/admin/',
        '/admin/dashboard',
        '/admin/member-manager',
        '/admin/account-manager',
        '/admin/investment-manager',
        '/admin/inquiry-manager',
        '/admin/notice-manager',
        '/admin/popup-manager'
    ];
    
    // 현재 경로가 관리자 페이지인지 확인
    const isAdminPath = adminPaths.some(path => currentPath.startsWith(path));
    
    if (isAdminPath) {
        if (!isLoggedIn()) {
            // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
            localStorage.setItem('redirectUrl', currentPath);
            alert('관리자 페이지는 로그인이 필요합니다.');
            window.location.href = '/login';
            return false;
        }
        
        const user = getCurrentUser();
        console.log('관리자 권한 체크:', user);
        
        if (!user || user.role !== 'admin') {
            // 관리자 권한이 없는 경우
            alert('관리자 권한이 필요합니다.');
            window.location.href = '/';
            return false;
        }
        
        // /admin 경로로 접근한 경우 대시보드로 리다이렉트
        if (currentPath === '/admin' || currentPath === '/admin/') {
            console.log('대시보드로 리다이렉트');
            window.location.href = '/admin/dashboard';
            return false;
        }
        
        // 서버에 사용자 정보를 헤더로 전송하기 위한 설정
        if (typeof fetch !== 'undefined') {
            const originalFetch = window.fetch;
            window.fetch = function(url, options = {}) {
                if (!options.headers) {
                    options.headers = {};
                }
                options.headers['X-Current-User'] = JSON.stringify(user);
                return originalFetch(url, options);
            };
        }
    }
    
    return true;
}

// 페이지 로드시 조합상품 접근 체크
document.addEventListener('DOMContentLoaded', function() {
    checkCombinationProductAccess();
});

// 전역 함수로 만들어서 다른 스크립트에서 접근 가능하도록 설정
window.isLoggedIn = isLoggedIn;
window.getCurrentUser = getCurrentUser;
window.login = login;
window.logout = logout;
window.handleLoginSuccess = handleLoginSuccess;
window.handleLoginRedirect = handleLoginRedirect;
window.checkAdminAccess = checkAdminAccess;
window.isAdmin = isAdmin;

console.log('전역 함수들이 설정되었습니다:', {
    isLoggedIn: typeof window.isLoggedIn,
    getCurrentUser: typeof window.getCurrentUser,
    login: typeof window.login,
    logout: typeof window.logout,
    handleLoginSuccess: typeof window.handleLoginSuccess,
    checkAdminAccess: typeof window.checkAdminAccess,
    isAdmin: typeof window.isAdmin
});
