// 관리자 공통 사이드바 JavaScript

// 현재 페이지 확인 함수
function getCurrentPageName() {
    const path = window.location.pathname;
    const fileName = path.split('/').pop();
    return fileName;
}

// 사이드바 HTML 생성 함수
function generateSidebarHTML() {
    const currentPage = getCurrentPageName();
    
    return `
        <div class="admin-sidebar">
            <div class="sidebar-header">
                <h2><i class="fas fa-cog"></i> 관리자 패널</h2>
                <div class="admin-info">
                    <span id="admin-name">관리자</span>
                    <button onclick="logout()" class="logout-btn">
                        <i class="fas fa-sign-out-alt"></i> 로그아웃
                    </button>
                </div>
            </div>
            
            <nav class="sidebar-nav">
                <ul class="nav-menu">
                    <li class="nav-item ${currentPage === 'dashboard.html' ? 'active' : ''}">
                        <a href="/dashboard" class="nav-link">
                            <i class="fas fa-tachometer-alt"></i>
                            <span>대시보드</span>
                        </a>
                    </li>
                    
                    <li class="nav-item ${currentPage === 'member-manager.html' ? 'active' : ''}">
                        <a href="/member-manager" class="nav-link">
                            <i class="fas fa-users"></i>
                            <span>회원 관리</span>
                        </a>
                    </li>
                    
                    <li class="nav-item ${currentPage === 'investment-manager.html' ? 'active' : ''}">
                        <a href="/investment-manager" class="nav-link">
                            <i class="fas fa-chart-line"></i>
                            <span>투자 관리</span>
                        </a>
                    </li>
                    
                    <li class="nav-item ${currentPage === 'inquiry-manager.html' ? 'active' : ''}">
                        <a href="/inquiry-manager" class="nav-link">
                            <i class="fas fa-question-circle"></i>
                            <span>문의 관리</span>
                        </a>
                    </li>
                    
                    <li class="nav-item ${currentPage === 'notice-manager.html' ? 'active' : ''}">
                        <a href="/notice-manager" class="nav-link">
                            <i class="fas fa-bullhorn"></i>
                            <span>공지사항 관리</span>
                        </a>
                    </li>
                    
                    <li class="nav-item ${currentPage === 'popup-manager.html' ? 'active' : ''}">
                        <a href="/popup-manager" class="nav-link">
                            <i class="fas fa-window-restore"></i>
                            <span>팝업 관리</span>
                        </a>
                    </li>
                    
                    <li class="nav-item ${currentPage === 'account-manager.html' ? 'active' : ''}">
                        <a href="/account-manager" class="nav-link">
                            <i class="fas fa-user-cog"></i>
                            <span>계정 관리</span>
                        </a>
                    </li>
                </ul>
                
                <div class="sidebar-footer">
                    <div class="nav-item">
                        <a href="/../index" class="nav-link">
                            <i class="fas fa-home"></i>
                            <span>메인 사이트로</span>
                        </a>
                    </div>
                </div>
            </nav>
        </div>
    `;
}

// 사이드바 초기화 함수
function initializeSidebar() {
    // 관리자 권한 확인
    if (!requireAdmin()) {
        return;
    }
    
    // 사이드바 컨테이너 찾기
    const sidebarContainer = document.querySelector('.sidebar-container') || 
                           document.querySelector('#sidebar') || 
                           document.querySelector('.admin-sidebar-container');
    
    if (sidebarContainer) {
        sidebarContainer.innerHTML = generateSidebarHTML();
    } else {
        // 사이드바 컨테이너가 없으면 body에 추가
        const sidebarDiv = document.createElement('div');
        sidebarDiv.className = 'sidebar-container';
        sidebarDiv.innerHTML = generateSidebarHTML();
        document.body.insertBefore(sidebarDiv, document.body.firstChild);
    }
    
    // 관리자 정보 업데이트
    updateAdminInfo();
    
    // 모바일 토글 기능 추가
    addMobileToggle();
}

// 관리자 정보 업데이트
function updateAdminInfo() {
    const user = getCurrentUser();
    const adminNameElement = document.getElementById('admin-name');
    
    if (user && adminNameElement) {
        adminNameElement.textContent = user.name + '님';
    }
}

// 모바일 토글 기능 추가
function addMobileToggle() {
    // 이미 토글 버튼이 있는지 확인
    if (document.querySelector('.sidebar-toggle')) {
        return;
    }
    
    // 토글 버튼 생성
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'sidebar-toggle';
    toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
    toggleBtn.onclick = toggleSidebar;
    
    // 헤더에 토글 버튼 추가 (있다면)
    const header = document.querySelector('.admin-header') || 
                  document.querySelector('header') || 
                  document.querySelector('.header');
    
    if (header) {
        header.insertBefore(toggleBtn, header.firstChild);
    } else {
        // 헤더가 없으면 body 상단에 추가
        document.body.insertBefore(toggleBtn, document.body.firstChild);
    }
}

// 사이드바 토글 함수
function toggleSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

// 페이지 로드 시 사이드바 초기화
document.addEventListener('DOMContentLoaded', function() {
    // auth.js가 로드된 후 실행
    if (typeof requireAdmin === 'function') {
        initializeSidebar();
    } else {
        // auth.js가 아직 로드되지 않았다면 잠시 후 재시도
        setTimeout(initializeSidebar, 100);
    }
});

// 윈도우 리사이즈 시 사이드바 조정
window.addEventListener('resize', function() {
    const sidebar = document.querySelector('.admin-sidebar');
    if (sidebar && window.innerWidth > 768) {
        sidebar.classList.remove('collapsed');
    }
});

// 로그아웃 함수
function logout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        // 서버의 로그아웃 API 호출
        fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // 세션 쿠키 포함
        })
        .then(response => {
            // 성공 여부와 상관없이 로그인 페이지로 이동
            window.location.href = "/admin/login";
        })
        .catch(error => {
            console.error('로그아웃 중 오류:', error);
            // 오류가 발생해도 로그인 페이지로 이동
            window.location.href = "/admin/login";
        });
        
        // 로컬스토리지 정리 (혹시 남아있을 수 있는 데이터)
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminLoginTime');
        localStorage.removeItem('currentAdminId');
    }
}
