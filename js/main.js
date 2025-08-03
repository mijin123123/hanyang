// 메인 JavaScript 파일

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    // 헤더 관련 기능 초기화
    initHeader();
    
    // 비디오 초기화
    initVideo();
    
    // 슬라이더 초기화
    initSlider();
    
    // 투자 현황 카운터 초기화
    initInvestmentCounter();
    
    // 언론보도 섹션 초기화
    initMediaSection();
    
    // 팝업 초기화
    initPopups();
    
    // 스크롤 애니메이션 초기화
    initScrollAnimations();
});

// 헤더 관련 기능
function initHeader() {
    const mobileToggle = document.querySelector('.hy-mobile-toggle');
    const mobileMenu = document.querySelector('.hy-mobile-menu');
    const mobileClose = document.querySelector('.hy-mobile-close');
    
    // 모바일 메뉴 토글
    if (mobileToggle) {
        mobileToggle.addEventListener('click', function() {
            mobileMenu.classList.add('hy-show');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (mobileClose) {
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
            this.querySelector('.hy-submenu').style.display = 'block';
        });
        
        item.addEventListener('mouseleave', function() {
            this.querySelector('.hy-submenu').style.display = 'none';
        });
    });
}

// 비디오 초기화
function initVideo() {
    const video = document.querySelector(".video-background");

    if (video) {
        video.muted = true;
        video.load();
        video.play().catch(err => {
            console.warn("비디오 자동 재생 실패:", err);
        });
    }
}

// 슬라이더 초기화
function initSlider() {
    let currentSlide = 0;
    const images = document.querySelectorAll('.image-container img');
    const dotsContainer = document.getElementById('sliderDots');

    if (!images.length) return;

    // 좌클릭 방지 (드래그 방지 포함)
    document.addEventListener('mousedown', function(e) {
        if (e.button === 0) {
            e.preventDefault();
        }
    }, { passive: false });

    // 인디케이터 점들은 클릭 허용
    if (dotsContainer) {
        dotsContainer.addEventListener('mousedown', function(e) {
            e.stopPropagation();
        });
    }

    function showSlide(index) {
        images.forEach((img, i) => {
            img.classList.toggle('active', i === index);
        });
        document.querySelectorAll('.slider-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % images.length;
        showSlide(currentSlide);
    }

    showSlide(currentSlide);
    setInterval(nextSlide, 5000);
}

// 투자 현황 카운터 초기화
function initInvestmentCounter() {
    const counters = document.querySelectorAll(".status-number");

    if (!counters.length) return;

    const updateCount = (counter) => {
        const target = parseFloat(counter.getAttribute("data-target"));
        const increment = target / 100;
        let count = 0;

        const counting = () => {
            count += increment;
            if (count < target) {
                counter.innerText = Math.ceil(count).toLocaleString();
                setTimeout(counting, 20);
            } else {
                counter.innerText = target.toLocaleString();
            }
        };

        counting();
    };

    const resetCounters = () => {
        counters.forEach(counter => counter.innerText = "0");
    };

    const observerOptions = {
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                resetCounters();
                entry.target.querySelectorAll(".status-number").forEach(counter => {
                    updateCount(counter);
                });
            }
        });
    }, observerOptions);

    const statusSection = document.querySelector(".investment-status");
    if (statusSection) {
        observer.observe(statusSection);
    }
}

// 언론보도 섹션 초기화
function initMediaSection() {
    // 스크롤 애니메이션
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.media-card').forEach(card => {
        card.style.animationPlayState = 'paused';
        observer.observe(card);
    });
}

// 더보기 토글 함수
function toggleMore() {
    const section = document.querySelector('.media-coverage');
    section.classList.toggle('expanded');
    const btn = document.querySelector('.more-link');
    btn.innerHTML = section.classList.contains('expanded') ? 
        '접기 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' : 
        '더보기 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 5L19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
}

// 팝업 관련 함수들
function initPopups() {
    showNextPopup(0);
}

function openPopup(index) {
    const popup = document.getElementById('popup-' + index);
    if (popup) {
        popup.style.display = 'flex';
        setTimeout(() => {
            popup.classList.add('show');
            const content = popup.querySelector('.popup-content');
            content.classList.add('show');
        }, 10);
    }
}

function closePopup(index) {
    const popup = document.getElementById('popup-' + index);
    if (popup) {
        const content = popup.querySelector('.popup-content');
        content.classList.remove('show');
        popup.classList.remove('show');
        setTimeout(() => {
            popup.style.display = 'none';
        }, 500);
    }
}

function setDoNotShowToday(index) {
    const now = new Date();
    const expiryTime = now.setHours(23, 59, 59, 999);
    localStorage.setItem('popupHiddenUntil-' + index, expiryTime);
    closePopup(index);
}

function showNextPopup(index) {
    if (index >= 2) return;

    const popupHiddenUntil = localStorage.getItem('popupHiddenUntil-' + index);
    const now = new Date().getTime();

    if (!popupHiddenUntil || now > popupHiddenUntil) {
        openPopup(index);

        const popup = document.getElementById('popup-' + index);
        const closeButtons = popup.querySelectorAll('.popup-button-right, .close-popup');

        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                showNextPopup(index + 1);
            }, { once: true });
        });
    } else {
        showNextPopup(index + 1);
    }
}

// 스크롤 애니메이션
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });
}

// 전역 함수로 노출 (HTML에서 사용)
window.toggleMore = toggleMore;
window.openPopup = openPopup;
window.closePopup = closePopup;
window.setDoNotShowToday = setDoNotShowToday;
