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
