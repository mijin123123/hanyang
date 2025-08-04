const fs = require('fs');
const path = require('path');

// 수정할 페이지들과 해당 정보
const pages = [
    {
        file: 'history.ejs',
        title: '한양에너지 - 회사연혁',
        description: '한양에너지의 성장과 발전 과정, 주요 연혁 소개',
        keywords: '한양에너지,연혁,회사역사,태양광,신재생에너지'
    },
    {
        file: 'introduce_service.ejs',
        title: '한양에너지 - 서비스 소개',
        description: '한양에너지의 태양광 발전 서비스, 시공 및 관리 서비스 안내',
        keywords: '한양에너지,서비스,태양광발전,시공,관리,컨설팅'
    },
    {
        file: 'introduce_product.ejs',
        title: '한양에너지 - 조합상품안내',
        description: '한양에너지 조합상품 안내, 태양광 투자 상품 소개',
        keywords: '한양에너지,조합상품,태양광투자,수익률,안전투자'
    },
    {
        file: 'product_list.ejs',
        title: '한양에너지 - 조합원 상품신청',
        description: '한양에너지 조합원 상품신청 페이지',
        keywords: '한양에너지,상품신청,조합원,태양광투자'
    },
    {
        file: 'project_gallery.ejs',
        title: '한양에너지 - 발전소 현황',
        description: '한양에너지 태양광 발전소 현황 및 프로젝트 갤러리',
        keywords: '한양에너지,발전소,프로젝트,태양광발전소,현황'
    },
    {
        file: 'announcements.ejs',
        title: '한양에너지 - 공지사항',
        description: '한양에너지 공지사항 및 최신 소식',
        keywords: '한양에너지,공지사항,소식,안내'
    },
    {
        file: 'faq.ejs',
        title: '한양에너지 - 자주 묻는 질문',
        description: '한양에너지 자주 묻는 질문 및 답변',
        keywords: '한양에너지,FAQ,질문,답변,도움말'
    },
    {
        file: 'inquiry_list.ejs',
        title: '한양에너지 - 1:1문의신청',
        description: '한양에너지 1:1 문의신청 페이지',
        keywords: '한양에너지,문의,상담,고객지원'
    },
    {
        file: 'login.ejs',
        title: '한양에너지 - 로그인',
        description: '한양에너지 회원 로그인',
        keywords: '한양에너지,로그인,회원'
    },
    {
        file: 'signup.ejs',
        title: '한양에너지 - 회원가입',
        description: '한양에너지 회원가입',
        keywords: '한양에너지,회원가입,가입'
    },
    {
        file: 'mypage.ejs',
        title: '한양에너지 - 마이페이지',
        description: '한양에너지 마이페이지',
        keywords: '한양에너지,마이페이지,회원정보'
    },
    {
        file: 'my_investments.ejs',
        title: '한양에너지 - 조합원 출자현황',
        description: '한양에너지 조합원 출자현황 조회',
        keywords: '한양에너지,출자현황,투자현황,수익'
    },
    {
        file: 'withdraw_request.ejs',
        title: '한양에너지 - 조합원 입금/출금',
        description: '한양에너지 조합원 입금/출금 신청',
        keywords: '한양에너지,입금,출금,조합원'
    }
];

// 헤더 템플릿
const getHeaderTemplate = (title, description, keywords) => `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${description}">
    <meta name="keywords" content="${keywords}">
    <meta name="author" content="한양에너지">
    
    <title>${title}</title>
    
    <!-- 파비콘 -->
    <link rel="icon" href="img/favi.ico" type="image/jpeg">
    
    <!-- 폰트 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- CSS 파일 -->
    <link rel="stylesheet" href="css/global.css?v=1754220183">
    <link rel="stylesheet" href="css/header.css?v=1754220183">
    <link rel="stylesheet" href="css/utilities.css?v=1754220183">
    
    <!-- JavaScript 파일 -->
    <script src="js/auth.js"></script>`;

// 헤더 HTML 템플릿
const headerHTML = `
<!-- Header -->
<header class="hy-header">
    <div class="hy-container">
        <!-- 로고 영역 -->
        <div class="hy-logo">
            <a href="/">
                <div style="font-size: 24px; font-weight: 800; color: #555555; letter-spacing: 0.5px; font-family: 'Arial', sans-serif; display: flex; align-items: center;">
                    HANYANG ENERGY<span style="width: 8px; height: 8px; background-color: #ff6600; border-radius: 50%; display: inline-block; margin-left: 0px; margin-top: 10px;"></span>
                </div>
            </a>
        </div>

        <!-- 데스크탑 네비게이션 -->
        <nav class="hy-desktop-nav">
            <ul class="hy-main-menu">
                <li class="hy-menu-item hy-has-dropdown">
                    <a href="/ceo_message">회사소개</a>
                    <ul class="hy-submenu">
                        <li><a href="/ceo_message">인사말</a></li>
                        <li><a href="/history">연혁</a></li>
                    </ul>
                </li>
                <li class="hy-menu-item hy-has-dropdown">
                    <a href="/introduce_service">서비스 소개</a>
                    <ul class="hy-submenu">
                        <li><a href="/introduce_service">서비스 소개</a></li>
                        <li><a href="/project_gallery">발전소 현황</a></li>
                    </ul>
                </li>
                <li class="hy-menu-item hy-has-dropdown">
                    <a href="/introduce_product">조합상품</a>
                    <ul class="hy-submenu">
                        <li><a href="/introduce_product">조합상품안내</a></li>
                        <li><a href="/product_list">조합원 상품신청</a></li>
                        <li><a href="/my_investments">조합원 출자현황</a></li>
                        <li><a href="/withdraw_request">조합원 입금/출금</a></li>
                    </ul>
                </li>
                <li class="hy-menu-item hy-has-dropdown">
                    <a href="/announcements">고객센터</a>
                    <ul class="hy-submenu">
                        <li><a href="/announcements">공지사항</a></li>
                        <li><a href="/faq">자주 묻는 질문</a></li>
                        <li><a href="/inquiry_list">1:1문의신청</a></li>
                    </ul>
                </li>
            </ul>
        </nav>

        <!-- 사용자 인증 영역 -->
        <div class="hy-auth-area">
            <% if (typeof user !== 'undefined' && user) { %>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="color: #333; font-weight: 500;"><%= user.name %>님</span>
                    <a href="/mypage" style="background: #0056a3; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none;">
                        <i class="fas fa-user"></i> 마이페이지
                    </a>
                    <% if (user.role === 'admin') { %>
                        <a href="/admin" style="background: #28a745; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none;">
                            <i class="fas fa-cog"></i> 관리자
                        </a>
                    <% } %>
                    <form action="/logout" method="POST" style="display: inline; margin: 0;">
                        <button type="submit" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-sign-out-alt"></i> 로그아웃
                        </button>
                    </form>
                </div>
            <% } else { %>
                <a href="/login" class="hy-auth-link">
                    <i class="fas fa-sign-in-alt"></i> 로그인
                </a>
                <a href="/signup" class="hy-auth-link hy-signup">
                    <i class="fas fa-user-plus"></i> 회원가입
                </a>
            <% } %>
        </div>

        <!-- 모바일 메뉴 토글 버튼 -->
        <button class="hy-mobile-toggle" aria-label="메뉴 열기">
            <span class="hy-toggle-bar"></span>
            <span class="hy-toggle-bar"></span>
            <span class="hy-toggle-bar"></span>
        </button>
    </div>

    <!-- 모바일 메뉴 -->
    <div class="hy-mobile-menu">
        <div class="hy-mobile-container">
            <div class="hy-mobile-header">
                <button class="hy-mobile-close" aria-label="메뉴 닫기">✕</button>
            </div>
            
            <div class="hy-mobile-auth">
                <% if (typeof user !== 'undefined' && user) { %>
                    <div style="text-align: center; padding: 15px;">
                        <div style="margin-bottom: 15px; color: #333;"><%= user.name %>님 환영합니다</div>
                        <a href="/mypage" style="display: block; background: #0056a3; color: white; padding: 10px; border-radius: 4px; text-decoration: none; margin-bottom: 10px;">
                            <i class="fas fa-user"></i> 마이페이지
                        </a>
                        <% if (user.role === 'admin') { %>
                            <a href="/admin" style="display: block; background: #28a745; color: white; padding: 10px; border-radius: 4px; text-decoration: none; margin-bottom: 10px;">
                                <i class="fas fa-cog"></i> 관리자
                            </a>
                        <% } %>
                        <form action="/logout" method="POST" style="margin: 0;">
                            <button type="submit" style="width: 100%; background: #dc3545; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer;">
                                <i class="fas fa-sign-out-alt"></i> 로그아웃
                            </button>
                        </form>
                    </div>
                <% } else { %>
                    <a href="/login" class="hy-mobile-auth-btn">
                        <i class="fas fa-sign-in-alt"></i> 로그인
                    </a>
                    <a href="/signup" class="hy-mobile-auth-btn hy-signup">
                        <i class="fas fa-user-plus"></i> 회원가입
                    </a>
                <% } %>
            </div>

            <nav class="hy-mobile-nav">
                <ul>
                    <li class="hy-mobile-dropdown">
                        <button class="hy-mobile-menu-btn">회사소개</button>
                        <ul class="hy-mobile-submenu">
                            <li><a href="/ceo_message">인사말</a></li>
                            <li><a href="/history">연혁</a></li>
                        </ul>
                    </li>
                    <li class="hy-mobile-dropdown">
                        <button class="hy-mobile-menu-btn">서비스 소개</button>
                        <ul class="hy-mobile-submenu">
                            <li><a href="/introduce_service">서비스 소개</a></li>
                            <li><a href="/project_gallery">발전소 현황</a></li>
                        </ul>
                    </li>
                    <li class="hy-mobile-dropdown">
                        <button class="hy-mobile-menu-btn">조합상품</button>
                        <ul class="hy-mobile-submenu">
                            <li><a href="/introduce_product">조합상품안내</a></li>
                            <li><a href="/product_list">조합원 상품신청</a></li>
                            <li><a href="/my_investments">조합원 출자현황</a></li>
                            <li><a href="/withdraw_request">조합원 입금/출금</a></li>
                        </ul>
                    </li>
                    <li class="hy-mobile-dropdown">
                        <button class="hy-mobile-menu-btn">고객센터</button>
                        <ul class="hy-mobile-submenu">
                            <li><a href="/announcements">공지사항</a></li>
                            <li><a href="/faq">자주 묻는 질문</a></li>
                            <li><a href="/inquiry_list">1:1문의신청</a></li>
                        </ul>
                    </li>
                </ul>
            </nav>
        </div>
    </div>
</header>`;

function fixPage(pageInfo) {
    const filePath = path.join(__dirname, 'views', pageInfo.file);
    
    if (!fs.existsSync(filePath)) {
        console.log(`파일이 존재하지 않습니다: ${pageInfo.file}`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // EJS include 제거 및 header 교체
    content = content.replace(
        /<%- include\('partials\/header'[^%]*%>/,
        getHeaderTemplate(pageInfo.title, pageInfo.description, pageInfo.keywords)
    );
    
    // HTML 헤더 교체 (기존 헤더가 있다면)
    content = content.replace(
        /<!-- Header -->[\s\S]*?<\/header>/,
        headerHTML
    );
    
    // 모든 .html 링크를 서버 라우트로 변경
    const linkReplacements = {
        'index.html': '/',
        'ceo_message.html': '/ceo_message',
        'history.html': '/history',
        'introduce_service.html': '/introduce_service',
        'introduce_product.html': '/introduce_product',
        'product_list.html': '/product_list',
        'project_gallery.html': '/project_gallery',
        'announcements.html': '/announcements',
        'faq.html': '/faq',
        'inquiry_list.html': '/inquiry_list',
        'login.html': '/login',
        'signup.html': '/signup',
        'mypage.html': '/mypage',
        'my_investments.html': '/my_investments',
        'withdraw_request.html': '/withdraw_request'
    };
    
    for (const [htmlFile, route] of Object.entries(linkReplacements)) {
        const regex = new RegExp(`"${htmlFile}"`, 'g');
        content = content.replace(regex, `"${route}"`);
        
        const regex2 = new RegExp(`'${htmlFile}'`, 'g');
        content = content.replace(regex2, `'${route}'`);
        
        const regex3 = new RegExp(`href="${htmlFile}"`, 'g');
        content = content.replace(regex3, `href="${route}"`);
        
        const regex4 = new RegExp(`href='${htmlFile}'`, 'g');
        content = content.replace(regex4, `href='${route}'`);
    }
    
    // Footer include 제거
    content = content.replace(/<%- include\('partials\/footer'\) %>/, '');
    
    // 파일 저장
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`수정 완료: ${pageInfo.file}`);
}

// 모든 페이지 수정
pages.forEach(pageInfo => {
    try {
        fixPage(pageInfo);
    } catch (error) {
        console.error(`${pageInfo.file} 수정 중 오류:`, error.message);
    }
});

console.log('모든 페이지 수정이 완료되었습니다.');
