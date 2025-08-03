// 입출금 페이지 - 로그인 필요 안내 페이지

document.addEventListener('DOMContentLoaded', function() {
    // 로그인 상태 확인 (실제로는 서버에서 확인)
    const isLoggedIn = false; // 현재는 false로 설정
    
    if (!isLoggedIn) {
        // 로그인하지 않은 상태에서는 현재 페이지 유지 (로그인 필요 안내 표시)
        console.log('로그인이 필요한 페이지입니다.');
    }
    
    // 로그인 버튼 클릭 시 현재 페이지 URL을 전달
    const loginBtns = document.querySelectorAll('.login-btn');
    loginBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const currentUrl = encodeURIComponent(window.location.href);
            window.location.href = `login.html?redirect=${currentUrl}`;
        });
    });
});
