const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const fs = require('fs-extra');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase 설정
const supabaseUrl = 'https://aqcewkutnssgrioxlqba.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxY2V3a3V0bnNzZ3Jpb3hscWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyOTAxNDgsImV4cCI6MjA2OTg2NjE0OH0.CdU2UhkIu6Wcyl4GWTg4a0z9eovgkFSSNn9sZfUKSAw';
const supabase = createClient(supabaseUrl, supabaseKey);

// Multer 설정 (파일 업로드)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, 'adm/uploads/popup_images');
        fs.ensureDirSync(uploadPath); // 디렉토리가 없으면 생성
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const extension = path.extname(originalName);
        const filename = `${timestamp}_${originalName.replace(extension, '')}${extension}`;
        cb(null, filename);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB 제한
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('이미지 파일만 업로드 가능합니다.'));
        }
    }
});

// 보안 미들웨어
app.use(helmet({
    contentSecurityPolicy: false, // 기존 인라인 스타일을 위해 비활성화
    crossOriginEmbedderPolicy: false
}));

// CORS 설정
app.use(cors());

// Body parser 미들웨어
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 세션 설정
app.use(session({
    secret: 'hanyang-energy-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // HTTPS에서는 true로 설정
        maxAge: 24 * 60 * 60 * 1000 // 24시간
    }
}));

// EJS 템플릿 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 정적 파일 서빙
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/videos', express.static(path.join(__dirname, 'videos')));

// 관리자 정적 파일 서빙
app.use('/admin/css', express.static(path.join(__dirname, 'admin/css')));
app.use('/admin/js', express.static(path.join(__dirname, 'admin/js')));
app.use('/admin/uploads', express.static(path.join(__dirname, 'adm/uploads')));

// 기존 HTML 파일들을 EJS로 복사하는 함수
async function convertHtmlToEjs() {
    const viewsDir = path.join(__dirname, 'views');
    await fs.ensureDir(viewsDir);
    
    // HTML 파일 목록
    const htmlFiles = [
        'index.html',
        'login.html',
        'signup.html',
        'mypage.html',
        'introduce_product.html',
        'introduce_service.html',
        'product_list.html',
        'investment_detail.html',
        'my_investments.html',
        'withdraw_request.html',
        'ceo_message.html',
        'history.html',
        'faq.html',
        'announcements.html',
        'project_gallery.html',
        'inquiry_list.html',
        'my_inquiry.html'
    ];
    
    for (const file of htmlFiles) {
        const htmlPath = path.join(__dirname, file);
        const ejsPath = path.join(viewsDir, file.replace('.html', '.ejs'));
        
        if (await fs.pathExists(htmlPath)) {
            await fs.copy(htmlPath, ejsPath);
            console.log(`Converted ${file} to EJS`);
        }
    }
    
    // 관리자 페이지들도 복사
    const adminDir = path.join(__dirname, 'admin');
    const adminViewsDir = path.join(viewsDir, 'admin');
    
    if (await fs.pathExists(adminDir)) {
        await fs.ensureDir(adminViewsDir);
        
        const adminFiles = await fs.readdir(adminDir);
        for (const file of adminFiles) {
            if (file.endsWith('.html')) {
                const htmlPath = path.join(adminDir, file);
                const ejsPath = path.join(adminViewsDir, file.replace('.html', '.ejs'));
                await fs.copy(htmlPath, ejsPath);
                console.log(`Converted admin/${file} to EJS`);
            }
        }
    }
}

// 사용자 데이터 (기존 auth.js와 동일)
let users = [
    { id: '1', username: 'minj0010', password: 'minj0010', name: '김민정', role: 'admin', status: 'approved' },
    { id: '2', username: 'admin', password: 'admin123', name: '관리자', role: 'admin', status: 'approved' },
    { id: '8', username: 'test_admin', password: '1234', name: '테스트관리자', role: 'admin', status: 'approved' },
    { id: '3', username: 'user1', password: 'user123', name: '김회원', role: 'user', status: 'approved' },
    { id: '4', username: 'user2', password: 'user456', name: '이투자', role: 'user', status: 'approved' },
    { id: '5', username: 'test', password: 'test123', name: '테스트', role: 'user', status: 'approved' }
];

// 미들웨어: 로그인 확인
function requireLogin(req, res, next) {
    // 세션 기반 인증 먼저 확인
    if (req.session.user) {
        return next();
    }
    
    // 헤더에서 사용자 정보 확인 (클라이언트 측 auth.js와 연동)
    const userHeader = req.headers['x-current-user'];
    if (userHeader) {
        try {
            const user = JSON.parse(userHeader);
            if (user && user.status === 'approved') {
                // 세션에도 저장
                req.session.user = user;
                return next();
            }
        } catch (e) {
            console.log('사용자 헤더 파싱 오류:', e);
        }
    }
    
    // 로그인이 필요한 경우
    res.redirect('/login');
}

// 미들웨어: 관리자 권한 확인
function requireAdmin(req, res, next) {
    // 세션 기반 인증 먼저 확인
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    
    // 헤더에서 사용자 정보 확인 (클라이언트 측 auth.js와 연동)
    const userHeader = req.headers['x-current-user'];
    if (userHeader) {
        try {
            const user = JSON.parse(userHeader);
            if (user && user.role === 'admin' && user.status === 'approved') {
                return next();
            }
        } catch (e) {
            console.log('사용자 헤더 파싱 오류:', e);
        }
    }
    
    // 관리자 권한이 없는 경우
    res.status(403).send(`
        <script>
            alert('관리자 권한이 필요합니다.');
            window.location.href = '/login';
        </script>
    `);
}

// 라우트 설정

// 메인 페이지
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

// 로그인 페이지
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('login');
});

// 로그인 처리
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        req.session.user = {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            loginTime: new Date().toISOString()
        };
        
        res.json({ success: true, user: req.session.user });
    } else {
        res.json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
});

// 회원가입 페이지
app.get('/signup', (req, res) => {
    res.render('signup');
});

// 회원가입 처리
app.post('/signup', (req, res) => {
    const { username, password, name, email, phone, address } = req.body;
    
    // 중복 확인
    const existingUser = users.find(u => u.username === username || u.email === email);
    if (existingUser) {
        return res.json({ success: false, message: '이미 사용 중인 아이디 또는 이메일입니다.' });
    }
    
    // 새 회원 추가 (즉시 승인)
    const newUser = {
        id: Date.now().toString(),
        username,
        password,
        name,
        email,
        phone: phone || '',
        address: address || '',
        role: 'user',
        status: 'approved',
        created_at: new Date().toISOString()
    };
    
    users.push(newUser);
    
    res.json({ 
        success: true, 
        message: '회원가입이 완료되었습니다. 바로 로그인하실 수 있습니다.',
        user: newUser 
    });
});

// 로그아웃
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// 세션 상태 확인 API
app.get('/api/check-session', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.json({ user: null });
    }
});

// 마이페이지
app.get('/mypage', requireLogin, (req, res) => {
    res.render('mypage', { user: req.session.user });
});

// 조합상품 관련 페이지들
app.get('/introduce_product', requireLogin, (req, res) => {
    res.render('introduce_product', { user: req.session.user });
});

app.get('/product_list', requireLogin, (req, res) => {
    res.render('product_list', { user: req.session.user });
});

app.get('/my_investments', requireLogin, (req, res) => {
    res.render('my_investments', { user: req.session.user });
});

app.get('/withdraw_request', requireLogin, (req, res) => {
    res.render('withdraw_request', { user: req.session.user });
});

app.get('/investment_detail', requireLogin, (req, res) => {
    res.render('investment_detail', { user: req.session.user });
});

app.get('/investment_detail_300kw', requireLogin, (req, res) => {
    res.render('investment_detail_300kw', { user: req.session.user });
});

app.get('/investment_detail_500kw', requireLogin, (req, res) => {
    res.render('investment_detail_500kw', { user: req.session.user });
});

app.get('/investment_detail_green_starter', requireLogin, (req, res) => {
    res.render('investment_detail_green_starter', { user: req.session.user });
});

app.get('/investment_detail_laon', requireLogin, (req, res) => {
    res.render('investment_detail_laon', { user: req.session.user });
});

app.get('/investment_detail_simple_eco', requireLogin, (req, res) => {
    res.render('investment_detail_simple_eco', { user: req.session.user });
});

// 기업 소개 페이지들
app.get('/introduce_service', (req, res) => {
    res.render('introduce_service', { user: req.session.user });
});

app.get('/ceo_message', (req, res) => {
    res.render('ceo_message', { user: req.session.user });
});

app.get('/history', (req, res) => {
    res.render('history', { user: req.session.user });
});

// 고객센터 페이지들
app.get('/faq', (req, res) => {
    res.render('faq', { user: req.session.user });
});

app.get('/announcements', (req, res) => {
    res.render('announcements', { user: req.session.user });
});

app.get('/project_gallery', (req, res) => {
    res.render('project_gallery', { user: req.session.user });
});

app.get('/inquiry_list', (req, res) => {
    res.render('inquiry_list', { user: req.session.user });
});

app.get('/my_inquiry', requireLogin, (req, res) => {
    res.render('my_inquiry', { user: req.session.user });
});

// 관리자 페이지들
app.get('/admin/login', (req, res) => {
    res.render('admin/login');
});

app.get('/admin', requireAdmin, (req, res) => {
    res.redirect('/admin/dashboard');
});

app.get('/admin/member-manager', requireAdmin, (req, res) => {
    res.render('admin/member-manager', { user: req.session.user, currentPage: 'member-manager' });
});

app.get('/admin/dashboard', requireAdmin, (req, res) => {
    res.render('admin/dashboard', { user: req.session.user, currentPage: 'dashboard' });
});

app.get('/admin/investment-manager', requireAdmin, (req, res) => {
    res.render('admin/investment-manager', { user: req.session.user, currentPage: 'investment-manager' });
});

app.get('/admin/popup-manager', requireAdmin, (req, res) => {
    res.render('admin/popup-manager', { user: req.session.user, currentPage: 'popup-manager' });
});

app.get('/admin/site-settings', requireAdmin, (req, res) => {
    res.render('admin/site-settings', { user: req.session.user, currentPage: 'site-settings' });
});

app.get('/admin/account-manager', requireAdmin, (req, res) => {
    res.render('admin/account-manager', { user: req.session.user, currentPage: 'account-manager' });
});

app.get('/admin/notice-manager', requireAdmin, (req, res) => {
    res.render('admin/notice-manager', { user: req.session.user, currentPage: 'notice-manager' });
});

app.get('/admin/inquiry-manager', requireAdmin, (req, res) => {
    res.render('admin/inquiry-manager', { user: req.session.user, currentPage: 'inquiry-manager' });
});

// API 엔드포인트들

// 문의 데이터 (샘플)
let inquiries = [
    {
        id: 1,
        name: "김투자",
        email: "investor@example.com",
        phone: "010-1234-5678",
        title: "투자 상품 문의",
        content: "300KW 다함께 동행 뉴베이직 상품에 대해 자세히 알고 싶습니다. 투자 조건과 수익률, 그리고 투자 기간에 대해 상담받고 싶습니다.",
        status: "pending",
        createdAt: "2025-01-20",
        reply: null,
        replyDate: null
    },
    {
        id: 2,
        name: "이관리",
        email: "manager@example.com", 
        phone: "010-9876-5432",
        title: "회원가입 관련 문의",
        content: "회원가입 후 승인이 얼마나 걸리는지 궁금합니다. 또한 필요한 서류가 있다면 알려주세요.",
        status: "replied",
        createdAt: "2025-01-18",
        reply: "회원가입 승인은 보통 1-2일 소요됩니다. 추가 서류는 필요하지 않으며, 가입 완료 후 바로 투자 상품을 확인하실 수 있습니다.",
        replyDate: "2025-01-19"
    }
];

// 공지사항 데이터 (샘플)
let notices = [
    {
        id: 1,
        title: "한양에너지 투자 상품 안내",
        content: "안녕하세요. 한양에너지협동조합입니다.\n\n새로운 투자 상품에 대해 안내드립니다.\n\n1. 300KW 다함께 동행 뉴베이직\n2. 1MW 다함께 동행 메가\n3. 그린 스타터 패키지\n\n자세한 내용은 투자 상품 페이지를 확인해주세요.",
        status: "published",
        isPinned: true,
        createdAt: "2025-01-10",
        updatedAt: "2025-01-10",
        views: 245,
        author: "관리자"
    },
    {
        id: 2,
        title: "2025년 상반기 투자 설명회 안내",
        content: "2025년 상반기 투자 설명회를 다음과 같이 개최합니다.\n\n일시: 2025년 2월 15일 오후 2시\n장소: 한양에너지 본사 세미나실\n\n많은 참여 부탁드립니다.",
        status: "published",
        isPinned: false,
        createdAt: "2025-01-05",
        updatedAt: "2025-01-05",
        views: 189,
        author: "관리자"
    },
    {
        id: 3,
        title: "시스템 점검 안내",
        content: "시스템 안정성 향상을 위해 정기 점검을 실시합니다.\n\n점검 일시: 2025년 1월 25일 새벽 2시 ~ 4시\n\n점검 중에는 서비스 이용이 제한될 수 있습니다.",
        status: "draft",
        isPinned: false,
        createdAt: "2025-01-08",
        updatedAt: "2025-01-08",
        views: 0,
        author: "관리자"
    }
];

// 공지사항 목록 조회 (관리자용)
app.get('/api/notices', requireAdmin, (req, res) => {
    res.json({ success: true, data: notices });
});

// 공지사항 생성 (관리자용)
app.post('/api/notices', requireAdmin, (req, res) => {
    const { title, content, status, isPinned } = req.body;
    
    if (!title || !content) {
        return res.json({ success: false, message: '제목과 내용을 입력해주세요.' });
    }
    
    const newNotice = {
        id: Date.now(),
        title,
        content,
        status: status || 'draft',
        isPinned: isPinned || false,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        views: 0,
        author: req.session.user.name
    };
    
    notices.unshift(newNotice);
    res.json({ success: true, message: '공지사항이 성공적으로 등록되었습니다.', data: newNotice });
});

// 공지사항 수정 (관리자용)
app.put('/api/notices/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { title, content, status, isPinned } = req.body;
    
    const noticeIndex = notices.findIndex(n => n.id === parseInt(id));
    if (noticeIndex === -1) {
        return res.json({ success: false, message: '공지사항을 찾을 수 없습니다.' });
    }
    
    notices[noticeIndex] = {
        ...notices[noticeIndex],
        title: title || notices[noticeIndex].title,
        content: content || notices[noticeIndex].content,
        status: status || notices[noticeIndex].status,
        isPinned: isPinned !== undefined ? isPinned : notices[noticeIndex].isPinned,
        updatedAt: new Date().toISOString().split('T')[0]
    };
    
    res.json({ success: true, message: '공지사항이 성공적으로 수정되었습니다.' });
});

// 공지사항 삭제 (관리자용)
app.delete('/api/notices/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    
    const noticeIndex = notices.findIndex(n => n.id === parseInt(id));
    if (noticeIndex === -1) {
        return res.json({ success: false, message: '공지사항을 찾을 수 없습니다.' });
    }
    
    notices.splice(noticeIndex, 1);
    res.json({ success: true, message: '공지사항이 성공적으로 삭제되었습니다.' });
});

// 문의 목록 조회 (관리자용)
app.get('/api/inquiries', requireAdmin, (req, res) => {
    res.json({ success: true, data: inquiries });
});

// 문의 답변 처리 (관리자용)
app.post('/api/inquiries/:id/reply', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { reply } = req.body;
    
    const inquiryIndex = inquiries.findIndex(i => i.id === parseInt(id));
    if (inquiryIndex === -1) {
        return res.json({ success: false, message: '문의를 찾을 수 없습니다.' });
    }
    
    inquiries[inquiryIndex].reply = reply;
    inquiries[inquiryIndex].status = 'replied';
    inquiries[inquiryIndex].replyDate = new Date().toISOString().split('T')[0];
    
    res.json({ success: true, message: '답변이 성공적으로 전송되었습니다.' });
});

// 문의 삭제 (관리자용)
app.delete('/api/inquiries/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    
    const inquiryIndex = inquiries.findIndex(i => i.id === parseInt(id));
    if (inquiryIndex === -1) {
        return res.json({ success: false, message: '문의를 찾을 수 없습니다.' });
    }
    
    inquiries.splice(inquiryIndex, 1);
    res.json({ success: true, message: '문의가 성공적으로 삭제되었습니다.' });
});

// 팝업 데이터 저장소 (Supabase에서 로드)
let popups = [];

// 사이트 설정 데이터 (Supabase에서 로드)
let siteSettings = {};

// 서버 시작 시 Supabase에서 데이터 로드
async function loadDataFromSupabase() {
    try {
        // 팝업 데이터 로드
        const { data: popupData, error: popupError } = await supabase
            .from('popups')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (popupError) {
            console.error('팝업 데이터 로드 오류:', popupError);
            // 기본값 사용
            popups = [
                {
                    id: 1,
                    name: "한양에너지 신규 투자 상품 출시",
                    image_url: "/adm/uploads/popup_images/1748313714_image_2025-05-20_15-37-49.png",
                    link_url: "/investment_detail_300kw",
                    status: "active",
                    created_at: "2025-05-20"
                },
                {
                    id: 2,
                    name: "에너지 협동조합 특별 혜택 안내",
                    image_url: "/adm/uploads/popup_images/1748313608_image_2025-05-27_11-39-31.png",
                    link_url: "/product_list",
                    status: "active",
                    created_at: "2025-05-27"
                }
            ];
        } else {
            popups = popupData || [];
        }

        // 사이트 설정 데이터 로드
        const { data: settingsData, error: settingsError } = await supabase
            .from('site_settings')
            .select('*');
        
        if (settingsError) {
            console.error('사이트 설정 로드 오류:', settingsError);
            // 기본값 사용
            siteSettings = {
                companyName: "한양에너지협동조합",
                accountNumber: "농협 123-456-789-10",
                accountHolder: "한양에너지협동조합",
                contactPhone: "02-1234-5678",
                contactEmail: "info@hanyang-energy.co.kr",
                address: "서울특별시 강남구 테헤란로 123길 45"
            };
        } else {
            // 설정 데이터를 객체로 변환
            siteSettings = {};
            if (settingsData) {
                settingsData.forEach(setting => {
                    const key = setting.setting_key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
                    siteSettings[key] = setting.setting_value;
                });
            }
            
            // 기본값이 없는 경우 설정
            if (Object.keys(siteSettings).length === 0) {
                siteSettings = {
                    companyName: "한양에너지협동조합",
                    accountNumber: "농협 123-456-789-10",
                    accountHolder: "한양에너지협동조합",
                    contactPhone: "02-1234-5678",
                    contactEmail: "info@hanyang-energy.co.kr",
                    address: "서울특별시 강남구 테헤란로 123길 45"
                };
            }
        }

        console.log('Supabase 데이터 로드 완료');
        console.log('팝업 개수:', popups.length);
        console.log('사이트 설정:', Object.keys(siteSettings).length, '개');
        
    } catch (error) {
        console.error('Supabase 데이터 로드 중 오류:', error);
        // 오류 시 기본값 사용
        popups = [];
        siteSettings = {
            companyName: "한양에너지협동조합",
            accountNumber: "농협 123-456-789-10",
            accountHolder: "한양에너지협동조합",
            contactPhone: "02-1234-5678",
            contactEmail: "info@hanyang-energy.co.kr",
            address: "서울특별시 강남구 테헤란로 123길 45"
        };
    }
}

// 팝업 목록 조회 API
app.get('/api/popups', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('popups')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('팝업 조회 오류:', error);
            return res.json({ success: false, message: '팝업을 불러오는데 실패했습니다.' });
        }

        // 데이터 형식 변환 (클라이언트 호환성을 위해)
        const formattedData = data.map(popup => ({
            id: popup.id,
            name: popup.name,
            image: popup.image_url,
            link: popup.link_url,
            status: popup.status,
            createdAt: popup.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
        }));

        res.json({ success: true, data: formattedData });
    } catch (error) {
        console.error('팝업 조회 중 오류:', error);
        res.json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 팝업 관리자용 목록 조회 API
app.get('/api/admin/popups', requireAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('popups')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('팝업 조회 오류:', error);
            return res.json({ success: false, message: '팝업을 불러오는데 실패했습니다.' });
        }

        // 데이터 형식 변환 (클라이언트 호환성을 위해)
        const formattedData = data.map(popup => ({
            id: popup.id,
            name: popup.name,
            image: popup.image_url,
            link: popup.link_url,
            status: popup.status,
            createdAt: popup.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
        }));

        res.json({ success: true, data: formattedData });
    } catch (error) {
        console.error('팝업 조회 중 오류:', error);
        res.json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 팝업 생성 API (이미지 업로드 포함)
app.post('/api/admin/popups', requireAdmin, upload.single('popupImage'), async (req, res) => {
    const { name, link, status } = req.body;
    
    if (!name) {
        return res.json({ success: false, message: '팝업 이름은 필수입니다.' });
    }
    
    if (!req.file) {
        return res.json({ success: false, message: '팝업 이미지는 필수입니다.' });
    }

    try {
        const { data, error } = await supabase
            .from('popups')
            .insert([
                {
                    name: name,
                    image_url: `/adm/uploads/popup_images/${req.file.filename}`,
                    link_url: link || null,
                    status: status || 'active'
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('팝업 생성 오류:', error);
            return res.json({ success: false, message: '팝업 생성에 실패했습니다.' });
        }

        // 데이터 형식 변환
        const formattedData = {
            id: data.id,
            name: data.name,
            image: data.image_url,
            link: data.link_url,
            status: data.status,
            createdAt: data.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
        };

        res.json({ success: true, data: formattedData, message: '팝업이 성공적으로 생성되었습니다.' });
    } catch (error) {
        console.error('팝업 생성 중 오류:', error);
        res.json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 팝업 수정 API (이미지 업로드 포함)
app.put('/api/admin/popups/:id', requireAdmin, upload.single('popupImage'), async (req, res) => {
    const { id } = req.params;
    const { name, link, status } = req.body;

    try {
        let updateData = {
            name: name,
            link_url: link || null,
            status: status,
            updated_at: new Date().toISOString()
        };

        // 새 이미지가 업로드된 경우
        if (req.file) {
            // 기존 이미지 정보 조회
            const { data: existingPopup } = await supabase
                .from('popups')
                .select('image_url')
                .eq('id', id)
                .single();

            // 기존 이미지 파일 삭제 (선택사항)
            if (existingPopup && existingPopup.image_url && existingPopup.image_url.startsWith('/adm/uploads/')) {
                const fullPath = path.join(__dirname, existingPopup.image_url);
                fs.remove(fullPath).catch(console.error);
            }

            updateData.image_url = `/adm/uploads/popup_images/${req.file.filename}`;
        }

        const { data, error } = await supabase
            .from('popups')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('팝업 수정 오류:', error);
            return res.json({ success: false, message: '팝업 수정에 실패했습니다.' });
        }

        // 데이터 형식 변환
        const formattedData = {
            id: data.id,
            name: data.name,
            image: data.image_url,
            link: data.link_url,
            status: data.status,
            createdAt: data.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
        };

        res.json({ success: true, data: formattedData, message: '팝업이 성공적으로 수정되었습니다.' });
    } catch (error) {
        console.error('팝업 수정 중 오류:', error);
        res.json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 팝업 삭제 API
app.delete('/api/admin/popups/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        // 기존 이미지 정보 조회
        const { data: existingPopup } = await supabase
            .from('popups')
            .select('image_url')
            .eq('id', id)
            .single();

        // 팝업 삭제
        const { error } = await supabase
            .from('popups')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('팝업 삭제 오류:', error);
            return res.json({ success: false, message: '팝업 삭제에 실패했습니다.' });
        }

        // 이미지 파일 삭제 (선택사항)
        if (existingPopup && existingPopup.image_url && existingPopup.image_url.startsWith('/adm/uploads/')) {
            const fullPath = path.join(__dirname, existingPopup.image_url);
            fs.remove(fullPath).catch(console.error);
        }

        res.json({ success: true, message: '팝업이 성공적으로 삭제되었습니다.' });
    } catch (error) {
        console.error('팝업 삭제 중 오류:', error);
        res.json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 공용 사이트 설정 조회 API (인증 불필요)
app.get('/api/settings', async (req, res) => {
    console.log('🔍 공용 설정 조회 API 호출됨');
    try {
        const { data, error } = await supabase
            .from('site_settings')
            .select('setting_key, setting_value');

        if (error) {
            console.error('공용 사이트 설정 조회 오류:', error);
            return res.json({ success: false, message: '설정을 불러오는데 실패했습니다.' });
        }

        // 데이터 형식 변환
        const settings = {};
        data.forEach(setting => {
            const key = setting.setting_key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
            settings[key] = setting.setting_value;
        });

        console.log('✅ 공용 설정 조회 성공:', settings);
        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('공용 사이트 설정 조회 중 오류:', error);
        res.json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 사이트 설정 조회 API (임시로 인증 제거)
app.get('/api/admin/settings', async (req, res) => {
    console.log('🔍 설정 조회 API 호출됨');
    try {
        const { data, error } = await supabase
            .from('site_settings')
            .select('setting_key, setting_value');

        if (error) {
            console.error('사이트 설정 조회 오류:', error);
            return res.json({ success: false, message: '설정을 불러오는데 실패했습니다.' });
        }

        // 데이터 형식 변환
        const settings = {};
        data.forEach(setting => {
            const key = setting.setting_key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
            settings[key] = setting.setting_value;
        });

        console.log('✅ 설정 조회 성공:', settings);
        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('사이트 설정 조회 중 오류:', error);
        res.json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 사이트 설정 업데이트 API (임시로 인증 제거)
app.put('/api/admin/settings', async (req, res) => {
    console.log('📝 사이트 설정 업데이트 요청:', req.body);
    
    const { companyName, accountNumber, accountHolder, contactPhone, contactEmail, address } = req.body;
    
    const settingsToUpdate = [
        { key: 'company_name', value: companyName },
        { key: 'account_number', value: accountNumber },
        { key: 'account_holder', value: accountHolder },
        { key: 'contact_phone', value: contactPhone },
        { key: 'contact_email', value: contactEmail },
        { key: 'address', value: address }
    ];

    try {
        // 각 설정을 개별적으로 업데이트 (upsert)
        for (const setting of settingsToUpdate) {
            if (setting.value !== undefined && setting.value !== null && setting.value !== '') {
                console.log(`🔄 업데이트 중: ${setting.key} = ${setting.value}`);
                
                const { error } = await supabase
                    .from('site_settings')
                    .upsert(
                        { 
                            setting_key: setting.key, 
                            setting_value: setting.value,
                            updated_at: new Date().toISOString()
                        },
                        { onConflict: 'setting_key' }
                    );

                if (error) {
                    console.error(`❌ ${setting.key} 업데이트 오류:`, error);
                    return res.json({ success: false, message: `${setting.key} 업데이트에 실패했습니다.` });
                } else {
                    console.log(`✅ ${setting.key} 업데이트 성공`);
                }
            }
        }

        // 업데이트된 설정을 다시 로드
        const { data: updatedSettings, error: loadError } = await supabase
            .from('site_settings')
            .select('*');

        if (loadError) {
            console.error('설정 재로드 오류:', loadError);
        } else {
            // 메모리 캐시 업데이트
            siteSettings = {};
            updatedSettings.forEach(setting => {
                switch(setting.setting_key) {
                    case 'company_name': siteSettings.companyName = setting.setting_value; break;
                    case 'account_number': siteSettings.accountNumber = setting.setting_value; break;
                    case 'account_holder': siteSettings.accountHolder = setting.setting_value; break;
                    case 'contact_phone': siteSettings.contactPhone = setting.setting_value; break;
                    case 'contact_email': siteSettings.contactEmail = setting.setting_value; break;
                    case 'address': siteSettings.address = setting.setting_value; break;
                }
            });
            console.log('🔄 메모리 캐시 업데이트 완료:', siteSettings);
        }

        res.json({ success: true, data: siteSettings, message: '설정이 성공적으로 업데이트되었습니다.' });
    } catch (error) {
        console.error('사이트 설정 업데이트 중 오류:', error);
        res.json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 테스트용 API - Supabase 연결 확인
app.get('/api/test/supabase', async (req, res) => {
    try {
        console.log('🧪 Supabase 연결 테스트 시작');
        
        // site_settings 테이블 존재 확인
        const { data, error } = await supabase
            .from('site_settings')
            .select('*')
            .limit(1);
        
        if (error) {
            console.log('❌ Supabase 오류:', error);
            return res.json({ 
                success: false, 
                message: 'Supabase 연결 오류', 
                error: error.message 
            });
        }
        
        console.log('✅ Supabase 연결 성공, 데이터:', data);
        res.json({ 
            success: true, 
            message: 'Supabase 연결 성공', 
            data: data,
            tableExists: true
        });
    } catch (error) {
        console.log('💥 예외 오류:', error);
        res.json({ 
            success: false, 
            message: '서버 오류', 
            error: error.message 
        });
    }
});

// 회원 목록 조회 (관리자용)
app.get('/api/members', requireAdmin, (req, res) => {
    const approvedMembers = users.filter(user => user.status === 'approved');
    res.json({ success: true, data: approvedMembers });
});

// 사용자 세션 정보 조회
app.get('/api/user', (req, res) => {
    if (req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.json({ success: false, message: '로그인이 필요합니다.' });
    }
});

// 사용자 통계 정보 (샘플 데이터)
app.get('/api/user/stats/:username', requireLogin, (req, res) => {
    const { username } = req.params;
    
    const sampleStats = {
        'minj0010': { products: 2, balance: 4623000, investment: 70000000, profit: 33177000 },
        'admin': { products: 5, balance: 15000000, investment: 200000000, profit: 85000000 },
        'user1': { products: 1, balance: 1500000, investment: 30000000, profit: 5200000 },
        'user2': { products: 3, balance: 3200000, investment: 50000000, profit: 12000000 },
        'test': { products: 1, balance: 800000, investment: 20000000, profit: 2500000 }
    };
    
    const stats = sampleStats[username] || { products: 0, balance: 0, investment: 0, profit: 0 };
    res.json({ success: true, data: stats });
});

// 에러 핸들링
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('서버 오류가 발생했습니다.');
});

// 404 핸들링
app.use((req, res) => {
    res.status(404).send('페이지를 찾을 수 없습니다.');
});

// 서버 시작
async function startServer() {
    try {
        // Supabase에서 데이터 로드
        await loadDataFromSupabase();
        
        // HTML 파일을 EJS로 변환
        await convertHtmlToEjs();
        
        app.listen(PORT, () => {
            console.log(`한양에너지 서버가 포트 ${PORT}에서 실행 중입니다.`);
            console.log(`http://localhost:${PORT} 에서 접속하세요.`);
        });
    } catch (error) {
        console.error('서버 시작 중 오류:', error);
    }
}

startServer();

module.exports = app;
