// 헤더 전용 스크립트
document.addEventListener('DOMContentLoaded', function() {
    // 모바일 메뉴 토글
    const mobileToggle = document.querySelector('.hy-mobile-toggle');
    const mobileMenu = document.querySelector('.hy-mobile-menu');
    const mobileClose = document.querySelector('.hy-mobile-close');
    
    if (mobileToggle && mobileMenu && mobileClose) {
        mobileToggle.addEventListener('click', function() {
            mobileMenu.classList.add('hy-show');
            document.body.style.overflow = 'hidden';
        });
        
        mobileClose.addEventListener('click', function() {
            mobileMenu.classList.remove('hy-show');
            document.body.style.overflow = '';
        });
    }

    // 모바일 서브메뉴 토글
    const mobileMenuBtns = document.querySelectorAll('.hy-mobile-menu-btn');
    mobileMenuBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const submenu = this.nextElementSibling;
            const isOpen = submenu.style.maxHeight;
            
            // 모든 서브메뉴 닫기
            document.querySelectorAll('.hy-mobile-submenu').forEach(menu => {
                if (menu !== submenu) {
                    menu.style.maxHeight = null;
                    menu.previousElementSibling.classList.remove('hy-open');
                }
            });
            
            // 현재 서브메뉴 토글
            if (isOpen) {
                submenu.style.maxHeight = null;
                this.classList.remove('hy-open');
            } else {
                submenu.style.maxHeight = submenu.scrollHeight + 'px';
                this.classList.add('hy-open');
            }
        });
    });

    // 데스크탑 드롭다운
    const desktopItems = document.querySelectorAll('.hy-has-dropdown');
    desktopItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            const submenu = this.querySelector('.hy-submenu');
            if (submenu) {
                submenu.style.display = 'block';
            }
        });
        
        item.addEventListener('mouseleave', function() {
            const submenu = this.querySelector('.hy-submenu');
            if (submenu) {
                submenu.style.display = 'none';
            }
        });
    });
});

// 헤더 사용자 정보 업데이트 함수
function updateHeaderUserInfo() {
    const user = getCurrentUser();
    const authArea = document.querySelector('.hy-auth-area');
    const mobileAuth = document.querySelector('.hy-mobile-auth');
    const headerUsername = document.getElementById('headerUsername');
    
    if (user) {
        // 데스크탑 헤더 업데이트
        if (headerUsername) {
            headerUsername.textContent = user.name + '님';
        }
        
        if (authArea) {
            authArea.innerHTML = `
                <span class="hy-username">${user.name}님</span>
                <a href="mypage.html" class="hy-auth-link" style="background: #0056a3; color: white; border-color: #0056a3;">
                    <i class="fas fa-user"></i> 마이페이지
                </a>
                <button onclick="logout()" class="logout-btn">
                    <i class="fas fa-sign-out-alt"></i> 로그아웃
                </button>
            `;
        }
        
        // 모바일 헤더 업데이트
        if (mobileAuth) {
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
    } else {
        // 로그인하지 않은 경우
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

// 메뉴 외부 클릭 시 모바일 메뉴 닫기
document.addEventListener('click', function(event) {
    const mobileMenu = document.querySelector('.hy-mobile-menu');
    const mobileToggle = document.querySelector('.hy-mobile-toggle');
    
    if (mobileMenu && mobileMenu.classList.contains('hy-show')) {
        if (!mobileMenu.contains(event.target) && 
            (!mobileToggle || !mobileToggle.contains(event.target))) {
            mobileMenu.classList.remove('hy-show');
            document.body.style.overflow = '';
        }
    }
});

// 스크롤 시 헤더 스타일 변경 (선택사항)
window.addEventListener('scroll', function() {
    const header = document.querySelector('.hy-header');
    if (header) {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
});
