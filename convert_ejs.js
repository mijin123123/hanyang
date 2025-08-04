const fs = require('fs');
const path = require('path');

// 수정해야 할 파일들과 설정
const pages = {
    'signup.ejs': {
        title: '회원가입 | 한양에너지',
        description: '한전과 20년 고정계약 체결, 안전한 태양광 수익 설계, 매월 이자수익 세전 최대 30% 지급',
        keywords: '태양광,태양광발전사업,태양열,태양광투자,신재생에너지,고수익,안정적인투자,안전한투자,1억투자,한양에너지,조합원,제테크'
    },
    'mypage.ejs': {
        title: '마이페이지 | 한양에너지',
        description: '한양에너지 마이페이지 - 조합원 정보 및 투자 현황 관리',
        keywords: '마이페이지,조합원,투자현황,한양에너지'
    },
    'introduce_product.ejs': {
        title: '조합상품안내 | 한양에너지',
        description: '한양에너지 조합상품 안내 - 안전하고 수익성 높은 태양광 투자',
        keywords: '조합상품,태양광투자,수익성,안전투자,한양에너지'
    },
    'introduce_service.ejs': {
        title: '서비스 소개 | 한양에너지',
        description: '한양에너지 서비스 소개 - 태양광 에너지 투자 플랫폼',
        keywords: '서비스소개,태양광,에너지투자,플랫폼,한양에너지'
    },
    'product_list.ejs': {
        title: '조합원 상품신청 | 한양에너지',
        description: '한양에너지 조합원 상품신청 - 다양한 태양광 투자 상품',
        keywords: '상품신청,조합원,태양광투자,투자상품,한양에너지'
    },
    'investment_detail.ejs': {
        title: '투자상품 상세 | 한양에너지',
        description: '한양에너지 투자상품 상세정보',
        keywords: '투자상품,상세정보,태양광,한양에너지'
    },
    'my_investments.ejs': {
        title: '조합원 출자현황 | 한양에너지',
        description: '한양에너지 조합원 출자현황 조회',
        keywords: '출자현황,조합원,투자조회,한양에너지'
    },
    'withdraw_request.ejs': {
        title: '조합원 입금/출금 | 한양에너지',
        description: '한양에너지 조합원 입금/출금 신청',
        keywords: '입금,출금,조합원,한양에너지'
    },
    'faq.ejs': {
        title: '자주 묻는 질문 | 한양에너지',
        description: '한양에너지 자주 묻는 질문',
        keywords: 'FAQ,자주묻는질문,한양에너지'
    },
    'announcements.ejs': {
        title: '공지사항 | 한양에너지',
        description: '한양에너지 공지사항',
        keywords: '공지사항,알림,한양에너지'
    },
    'project_gallery.ejs': {
        title: '발전소 현황 | 한양에너지',
        description: '한양에너지 발전소 현황',
        keywords: '발전소,현황,태양광,한양에너지'
    },
    'inquiry_list.ejs': {
        title: '1:1문의신청 | 한양에너지',
        description: '한양에너지 1:1문의신청',
        keywords: '문의신청,1대1문의,한양에너지'
    },
    'my_inquiry.ejs': {
        title: '나의 문의내역 | 한양에너지',
        description: '한양에너지 나의 문의내역',
        keywords: '문의내역,나의문의,한양에너지'
    }
};

function convertToEJS(filename) {
    const viewsPath = path.join(__dirname, 'views', filename);
    
    try {
        let content = fs.readFileSync(viewsPath, 'utf8');
        const pageConfig = pages[filename];
        
        if (!pageConfig) {
            console.log(`${filename} - 설정 정보가 없습니다.`);
            return;
        }

        // 이미 EJS include로 시작하는 경우 스킵
        if (content.startsWith('<%- include(\'partials/header\'')) {
            console.log(`${filename} - 이미 EJS 형태입니다.`);
            return;
        }

        // HTML 헤더 부분을 찾아서 EJS include로 교체
        const htmlHeaderRegex = /<!DOCTYPE html>[\s\S]*?<\/head>\s*<body[^>]*>/;
        const bodyEndRegex = /<\/body>\s*<\/html>\s*$/;

        if (htmlHeaderRegex.test(content)) {
            // EJS include 헤더로 교체
            const ejsHeader = `<%- include('partials/header', { 
    title: '${pageConfig.title}',
    description: '${pageConfig.description}',
    keywords: '${pageConfig.keywords}'
}) %>`;

            // 헤더 교체
            content = content.replace(htmlHeaderRegex, ejsHeader);
            
            // 푸터 교체
            content = content.replace(bodyEndRegex, '<%- include(\'partials/footer\') %>');
            
            // HTML 링크들을 서버 라우트로 변경
            content = content.replace(/href="([^"]*\.html)"/g, (match, url) => {
                const routeMap = {
                    'index.html': '/',
                    'login.html': '/login',
                    'signup.html': '/signup',
                    'mypage.html': '/mypage',
                    'ceo_message.html': '/ceo_message',
                    'history.html': '/history',
                    'introduce_service.html': '/introduce_service',
                    'introduce_product.html': '/introduce_product',
                    'product_list.html': '/product_list',
                    'investment_detail.html': '/investment_detail',
                    'my_investments.html': '/my_investments',
                    'withdraw_request.html': '/withdraw_request',
                    'faq.html': '/faq',
                    'announcements.html': '/announcements',
                    'project_gallery.html': '/project_gallery',
                    'inquiry_list.html': '/inquiry_list',
                    'my_inquiry.html': '/my_inquiry'
                };
                
                return `href="${routeMap[url] || url}"`;
            });

            // 파일 저장
            fs.writeFileSync(viewsPath, content, 'utf8');
            console.log(`${filename} - EJS로 변환 완료`);
        } else {
            console.log(`${filename} - HTML 구조를 찾을 수 없습니다.`);
        }

    } catch (error) {
        console.error(`${filename} 변환 중 오류:`, error.message);
    }
}

// 모든 파일 변환
Object.keys(pages).forEach(filename => {
    convertToEJS(filename);
});

console.log('모든 EJS 파일 변환 완료');
