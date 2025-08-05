// 암호화 모듈 import
const crypto = require('crypto');

// 비밀번호 해시 함수
function hashPassword(password) {
    const salt = 'hanyang_salt'; // 고정 솔트
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const helmet = require('helmet');
const cors = require('cors');
const fs = require('fs-extra');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy 설정 (Render 등 프록시 환경에서 필요)
app.set('trust proxy', 1);

// 환경 설정 및 기본값
const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_SECRET = process.env.SESSION_SECRET || 'hanyang-energy-secret-key-2025';

console.log(`🔧 환경: ${NODE_ENV}`);
console.log(`🔧 포트: ${PORT}`);

// Supabase 설정
const supabaseUrl = process.env.SUPABASE_URL || 'https://aqcewkutnssgrioxlqba.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxY2V3a3V0bnNzZ3Jpb3hscWJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5MDE0OCwiZXhwIjoyMDY5ODY2MTQ4fQ.Kz0ARhQd3lRDjF0qRDv9j5dqjzeQpw726QkbwghKX6I';

console.log('🔧 Supabase URL:', supabaseUrl);
console.log('🔧 Supabase Key:', supabaseKey ? '설정됨' : '설정안됨');

let supabase;
try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase 클라이언트 초기화 완료');
} catch (error) {
    console.error('❌ Supabase 클라이언트 초기화 실패:', error);
    // 앱은 계속 실행되지만 데이터베이스 기능은 제한됨
}

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
// CORS 설정 (Render 배포 환경 최적화)
app.use(cors({
    origin: true, // 모든 origin 허용 (임시)
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-current-user', 'Cookie']
}));

// Body parser 미들웨어
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 세션 설정 (Render 배포 환경 최적화)
app.use(session({
    secret: SESSION_SECRET,
    store: new MemoryStore({
        checkPeriod: 86400000 // 하루마다 만료된 세션 정리
    }),
    resave: false,
    saveUninitialized: true, // 배포 환경에서는 true로 설정
    rolling: true, // 세션 만료 시간 갱신
    cookie: {
        secure: false, // 임시로 false (배포환경에서도)
        httpOnly: true, // XSS 공격 방지
        maxAge: 24 * 60 * 60 * 1000, // 24시간
        sameSite: 'lax' // 호환성을 위해 lax
    },
    name: 'hanyang.sid' // 기본 세션 이름 변경
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

// 디버깅용 HTML 파일도 서빙
app.use(express.static(__dirname));

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
    
    // API 요청인 경우 JSON 응답
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ 
            success: false, 
            message: '로그인이 필요합니다.' 
        });
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

// 건강 체크 엔드포인트 (Render 등 배포 플랫폼용)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.0.0' // 버전 업데이트로 재배포 확인
    });
});

// API 목록 확인용 (디버깅)
app.get('/api/debug/routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach(function(r) {
        if (r.route && r.route.path) {
            routes.push({
                method: Object.keys(r.route.methods).join(',').toUpperCase(),
                path: r.route.path
            });
        }
    });
    
    res.json({
        success: true,
        routes: routes,
        totalRoutes: routes.length,
        timestamp: new Date().toISOString()
    });
});

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

// 로그인 처리 (Supabase 연동) - Render 배포 환경 최적화
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        console.log('🔍 로그인 시도:', username, '환경:', NODE_ENV, '요청 헤더:', req.headers.origin);
        console.log('🍪 기존 세션 정보:', req.session.user ? '존재' : '없음');
        console.log('🔗 세션 ID:', req.sessionID);
        console.log('🌐 User-Agent:', req.headers['user-agent']);
        console.log('🔒 쿠키 헤더:', req.headers.cookie);
        console.log('📡 요청 IP:', req.ip || req.connection.remoteAddress);
        
        // 입력값 검증
        if (!username || !password) {
            console.log('❌ 입력값 검증 실패');
            return res.json({ success: false, message: '아이디와 비밀번호를 모두 입력해주세요.' });
        }
        
        // 비밀번호 해시화
        const passwordHash = hashPassword(password);
        console.log('🔐 비밀번호 해시:', passwordHash);
        
        // Supabase 연결 확인
        if (!supabase) {
            console.log('❌ Supabase 클라이언트 없음');
            return res.json({ success: false, message: 'DB 연결 오류가 발생했습니다.' });
        }
        
        // 먼저 사용자가 존재하는지 확인
        const { data: existingUser, error: userError } = await supabase
            .from('members')
            .select('username, password_hash, status, role')
            .eq('username', username)
            .single();
            
        if (userError) {
            console.log('❌ 사용자 조회 오류:', userError);
            return res.json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }
        
        if (!existingUser) {
            console.log('❌ 사용자 없음:', username);
            return res.json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }
        
        console.log('✅ 사용자 발견:', existingUser.username, '저장된 해시:', existingUser.password_hash);
        
        // 비밀번호 확인
        if (existingUser.password_hash !== passwordHash) {
            console.log('❌ 비밀번호 불일치');
            return res.json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }
        
        // 승인 상태 확인
        if (existingUser.status === 'blocked') {
            console.log('❌ 차단된 사용자:', existingUser.status);
            return res.json({ success: false, message: '로그인이 차단된 계정입니다. 관리자에게 문의하세요.' });
        }
        
        if (existingUser.status !== 'approved') {
            console.log('❌ 승인되지 않은 사용자:', existingUser.status);
            return res.json({ success: false, message: '계정이 승인되지 않았습니다.' });
        }
        
        // 전체 사용자 정보 조회
        const { data: user, error } = await supabase
            .from('members')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !user) {
            console.log('❌ 전체 사용자 정보 조회 실패:', username);
            return res.json({ success: false, message: '로그인 처리 중 오류가 발생했습니다.' });
        }

        // 세션 설정
        req.session.user = {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            loginTime: new Date().toISOString()
        };
        
        // 세션 강제 저장
        req.session.save((err) => {
            if (err) {
                console.error('❌ 세션 저장 실패:', err);
                return res.json({ success: false, message: '세션 저장 중 오류가 발생했습니다.' });
            }
            
            console.log('✅ 로그인 성공:', user.username, '세션 ID:', req.sessionID);
            console.log('🔒 세션 저장 상태:', req.session.user ? '성공' : '실패');
            console.log('💾 세션 데이터:', req.session.user);
            
            res.json({ success: true, user: req.session.user });
        });
        
    } catch (error) {
        console.error('로그인 처리 중 오류:', error);
        res.json({ success: false, message: '로그인 처리 중 오류가 발생했습니다.' });
    }
});

// 회원가입 페이지
app.get('/signup', (req, res) => {
    res.render('signup');
});

// 회원가입 처리 (Supabase 연동)
app.post('/signup', async (req, res) => {
    const { 
        username, 
        password, 
        name, 
        email, 
        phone, 
        address, 
        detailAddress, 
        bank_name, 
        account_number, 
        referral_code 
    } = req.body;
    
    try {
        // 중복 확인
        const { data: existingUsers, error: checkError } = await supabase
            .from('members')
            .select('username, email')
            .or(`username.eq.${username},email.eq.${email}`);

        if (checkError) {
            console.error('회원 중복 확인 오류:', checkError);
            return res.json({ success: false, message: '회원가입 처리 중 오류가 발생했습니다.' });
        }

        if (existingUsers && existingUsers.length > 0) {
            return res.json({ success: false, message: '이미 사용 중인 아이디 또는 이메일입니다.' });
        }

        // 비밀번호 해시화
        const passwordHash = hashPassword(password);

        // 새 회원 추가 (즉시 승인)
        const { data: newUser, error: insertError } = await supabase
            .from('members')
            .insert([{
                username,
                password_hash: passwordHash,
                name,
                email,
                phone: phone || '',
                address: address || '',
                detail_address: detailAddress || '',
                bank_name: bank_name || '',
                account_number: account_number || '',
                referral_code: referral_code || '',
                role: 'user',
                status: 'approved', // 즉시 승인
                approved_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (insertError) {
            console.error('회원 추가 오류:', insertError);
            return res.json({ success: false, message: '회원가입 처리 중 오류가 발생했습니다.' });
        }

        console.log('✅ 새 회원 가입:', newUser.username);
        
        res.json({ 
            success: true, 
            message: '회원가입이 완료되었습니다. 바로 로그인하실 수 있습니다.',
            user: {
                id: newUser.id,
                username: newUser.username,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                status: newUser.status
            }
        });
    } catch (error) {
        console.error('회원가입 처리 중 오류:', error);
        res.json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 세션 상태 확인용 엔드포인트 (디버깅용)
app.get('/api/session-check', (req, res) => {
    console.log('🔍 세션 체크 요청');
    console.log('🔗 세션 ID:', req.sessionID);
    console.log('👤 세션 사용자:', req.session.user);
    console.log('🍪 쿠키:', req.headers.cookie);
    console.log('🌐 Origin:', req.headers.origin);
    console.log('📡 User-Agent:', req.headers['user-agent']);
    console.log('🔒 Secure Context:', req.secure);
    console.log('💻 환경:', NODE_ENV);
    
    res.json({
        sessionId: req.sessionID,
        user: req.session.user || null,
        isLoggedIn: !!req.session.user,
        cookie: req.headers.cookie,
        origin: req.headers.origin,
        secure: req.secure,
        environment: NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// 로그아웃
app.post('/logout', (req, res) => {
    console.log('🚪 로그아웃 요청 - 사용자:', req.session.user ? req.session.user.username : '없음');
    
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ 세션 삭제 실패:', err);
            return res.json({ success: false, message: '로그아웃 처리 중 오류가 발생했습니다.' });
        }
        
        console.log('✅ 로그아웃 완료');
        res.clearCookie('hanyang.sid'); // 쿠키도 명시적으로 삭제
        res.json({ success: true, message: '로그아웃 되었습니다.' });
    });
});

// 환경 변수 체크 API (배포 환경 디버깅용)
app.get('/api/debug/env', (req, res) => {
    res.json({
        NODE_ENV: NODE_ENV,
        PORT: PORT,
        SUPABASE_URL: supabaseUrl,
        SUPABASE_ANON_KEY: supabaseKey ? 'SET' : 'NOT SET',
        SESSION_SECRET: SESSION_SECRET ? 'SET' : 'NOT SET',
        timestamp: new Date().toISOString(),
        supabaseUrlFull: supabaseUrl,
        supabaseKeyLength: supabaseKey ? supabaseKey.length : 0
    });
});

// 세션 상태 확인 API - Render 배포 환경 디버깅
app.get('/api/check-session', (req, res) => {
    console.log('🔍 세션 확인 요청 - 세션 ID:', req.sessionID);
    console.log('🔍 세션 사용자:', req.session.user ? req.session.user.username : '없음');
    
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.json({ user: null });
    }
});

// 마이페이지
app.get('/mypage', requireLogin, async (req, res) => {
    try {
        // 현재 로그인한 사용자의 상세 정보 조회
        const { data: userProfile, error } = await supabase
            .from('members')
            .select('*')
            .eq('username', req.session.user.username)
            .single();
            
        if (error) {
            console.error('사용자 프로필 조회 오류:', error);
            // 오류 시 세션 정보만 사용
            return res.render('mypage', { 
                user: req.session.user, 
                userProfile: null,
                currentBalance: 0
            });
        }
        
        // 사용자 잔액 조회
        const currentBalance = await getMemberBalance(userProfile.id);
        
        console.log(`✅ ${req.session.user.username} 사용자 프로필 조회 성공`);
        res.render('mypage', { 
            user: req.session.user, 
            userProfile: userProfile,
            currentBalance: currentBalance
        });
        
    } catch (error) {
        console.error('마이페이지 로드 중 오류:', error);
        res.render('mypage', { 
            user: req.session.user, 
            userProfile: null,
            currentBalance: 0
        });
    }
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

app.get('/withdraw_request', requireLogin, async (req, res) => {
    try {
        const memberId = req.session.user.id;
        
        // 사용자 잔액 조회
        const currentBalance = await getMemberBalance(memberId);
        
        // 사용자 프로필 정보 조회
        const { data: userProfile, error: profileError } = await supabase
            .from('members')
            .select('*')
            .eq('id', memberId)
            .single();
        
        if (profileError) {
            console.error('사용자 프로필 조회 오류:', profileError);
        }
        
        res.render('withdraw_request', { 
            user: req.session.user,
            userProfile: userProfile || {},
            currentBalance: currentBalance
        });
    } catch (error) {
        console.error('입출금 페이지 로드 오류:', error);
        res.render('withdraw_request', { 
            user: req.session.user,
            userProfile: {},
            currentBalance: 0
        });
    }
});

app.get('/investment_detail', requireLogin, async (req, res) => {
    try {
        const memberId = req.session.user.id;
        const currentBalance = await getMemberBalance(memberId);
        
        res.render('investment_detail', { 
            user: req.session.user,
            currentBalance: currentBalance
        });
    } catch (error) {
        console.error('투자 상세 페이지 로드 오류:', error);
        res.render('investment_detail', { 
            user: req.session.user,
            currentBalance: 0
        });
    }
});

app.get('/investment_detail_300kw', requireLogin, async (req, res) => {
    try {
        const memberId = req.session.user.id;
        const currentBalance = await getMemberBalance(memberId);
        
        res.render('investment_detail_300kw', { 
            user: req.session.user,
            currentBalance: currentBalance
        });
    } catch (error) {
        console.error('300kw 투자 상세 페이지 로드 오류:', error);
        res.render('investment_detail_300kw', { 
            user: req.session.user,
            currentBalance: 0
        });
    }
});

app.get('/investment_detail_500kw', requireLogin, async (req, res) => {
    try {
        const memberId = req.session.user.id;
        const currentBalance = await getMemberBalance(memberId);
        
        res.render('investment_detail_500kw', { 
            user: req.session.user,
            currentBalance: currentBalance
        });
    } catch (error) {
        console.error('500kw 투자 상세 페이지 로드 오류:', error);
        res.render('investment_detail_500kw', { 
            user: req.session.user,
            currentBalance: 0
        });
    }
});

app.get('/investment_detail_green_starter', requireLogin, async (req, res) => {
    try {
        const memberId = req.session.user.id;
        const currentBalance = await getMemberBalance(memberId);
        
        res.render('investment_detail_green_starter', { 
            user: req.session.user,
            currentBalance: currentBalance
        });
    } catch (error) {
        console.error('그린 스타터 투자 상세 페이지 로드 오류:', error);
        res.render('investment_detail_green_starter', { 
            user: req.session.user,
            currentBalance: 0
        });
    }
});

app.get('/investment_detail_laon', requireLogin, async (req, res) => {
    try {
        const memberId = req.session.user.id;
        const currentBalance = await getMemberBalance(memberId);
        
        res.render('investment_detail_laon', { 
            user: req.session.user,
            currentBalance: currentBalance
        });
    } catch (error) {
        console.error('라온 투자 상세 페이지 로드 오류:', error);
        res.render('investment_detail_laon', { 
            user: req.session.user,
            currentBalance: 0
        });
    }
});

app.get('/investment_detail_simple_eco', requireLogin, async (req, res) => {
    try {
        const memberId = req.session.user.id;
        const currentBalance = await getMemberBalance(memberId);
        
        res.render('investment_detail_simple_eco', { 
            user: req.session.user,
            currentBalance: currentBalance
        });
    } catch (error) {
        console.error('심플 에코 투자 상세 페이지 로드 오류:', error);
        res.render('investment_detail_simple_eco', { 
            user: req.session.user,
            currentBalance: 0
        });
    }
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

app.get('/admin/transaction-management', requireAdmin, (req, res) => {
    res.render('admin/transaction-management', { user: req.session.user, currentPage: 'transaction-management' });
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
    
    const { 
        companyName, accountNumber, accountHolder, contactPhone, contactEmail, address,
        footerCopyright, footerDescription, businessNumber, representativeName, faxNumber
    } = req.body;
    
    const settingsToUpdate = [
        { key: 'company_name', value: companyName },
        { key: 'account_number', value: accountNumber },
        { key: 'account_holder', value: accountHolder },
        { key: 'contact_phone', value: contactPhone },
        { key: 'contact_email', value: contactEmail },
        { key: 'address', value: address },
        { key: 'footer_copyright', value: footerCopyright },
        { key: 'footer_description', value: footerDescription },
        { key: 'business_number', value: businessNumber },
        { key: 'representative_name', value: representativeName },
        { key: 'fax_number', value: faxNumber }
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

// 비밀번호 해시 테스트 API
app.get('/api/test/hash/:password', (req, res) => {
    const { password } = req.params;
    const hash = hashPassword(password);
    
    console.log(`🔐 비밀번호 "${password}" 해시:`, hash);
    
    res.json({
        success: true,
        password: password,
        hash: hash,
        message: `비밀번호 "${password}"의 해시값입니다.`
    });
});

// DB 해시 확인 API
app.get('/api/test/check-hash/:username', async (req, res) => {
    const { username } = req.params;
    
    try {
        const { data: user, error } = await supabase
            .from('members')
            .select('username, password_hash, name, status')
            .eq('username', username)
            .single();
        
        if (error || !user) {
            return res.json({
                success: false,
                message: '사용자를 찾을 수 없습니다.',
                error: error?.message
            });
        }
        
        // 여러 비밀번호 조합 테스트
        const testPasswords = [username, 'minj0010', 'admin123', 'test123', '1234'];
        const hashTests = testPasswords.map(pwd => ({
            password: pwd,
            hash: hashPassword(pwd),
            match: hashPassword(pwd) === user.password_hash
        }));
        
        res.json({
            success: true,
            user: {
                username: user.username,
                name: user.name,
                status: user.status
            },
            storedHash: user.password_hash,
            hashTests: hashTests
        });
        
    } catch (error) {
        res.json({
            success: false,
            message: '서버 오류',
            error: error.message
        });
    }
});

// 비밀번호 해시 수정 API (개발용)
app.post('/api/test/fix-password', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.json({
            success: false,
            message: '사용자명과 비밀번호를 모두 입력해주세요.'
        });
    }
    
    try {
        const newHash = hashPassword(password);
        console.log(`🔧 ${username} 계정 비밀번호 해시 업데이트:`, newHash);
        
        const { data, error } = await supabase
            .from('members')
            .update({ 
                password_hash: newHash,
                updated_at: new Date().toISOString()
            })
            .eq('username', username)
            .select()
            .single();
        
        if (error) {
            console.error('비밀번호 업데이트 오류:', error);
            return res.json({
                success: false,
                message: '비밀번호 업데이트 실패',
                error: error.message
            });
        }
        
        res.json({
            success: true,
            message: `${username} 계정의 비밀번호가 성공적으로 업데이트되었습니다.`,
            user: {
                username: data.username,
                name: data.name,
                newHash: newHash
            }
        });
        
    } catch (error) {
        console.error('비밀번호 수정 중 오류:', error);
        res.json({
            success: false,
            message: '서버 오류',
            error: error.message
        });
    }
});

// members 테이블 조회 테스트 API
app.get('/api/test/members', async (req, res) => {
    try {
        console.log('🧪 Members 테이블 조회 테스트');
        
        // 모든 members 조회
        const { data: allMembers, error: allError } = await supabase
            .from('members')
            .select('*');
        
        if (allError) {
            console.log('❌ 모든 멤버 조회 오류:', allError);
        } else {
            console.log('✅ 모든 멤버 조회 성공:', allMembers);
        }
        
        // minj0010 사용자만 조회
        const { data: minj0010, error: minjError } = await supabase
            .from('members')
            .select('*')
            .eq('username', 'minj0010');
        
        if (minjError) {
            console.log('❌ minj0010 조회 오류:', minjError);
        } else {
            console.log('✅ minj0010 조회 성공:', minj0010);
        }
        
        res.json({
            success: true,
            allMembers: allMembers,
            allMembersError: allError,
            minj0010: minj0010,
            minj0010Error: minjError
        });
        
    } catch (error) {
        console.error('Members 테이블 조회 중 오류:', error);
        res.json({
            success: false,
            message: '서버 오류',
            error: error.message
        });
    }
});

// 로그인 테스트 API
app.get('/api/test/login/:username/:password', async (req, res) => {
    const { username, password } = req.params;
    
    try {
        console.log(`🧪 로그인 테스트: ${username}/${password}`);
        
        const passwordHash = hashPassword(password);
        console.log('🔐 생성된 해시:', passwordHash);
        
        // Supabase에서 사용자 조회 (여러 방법으로 시도)
        console.log('🔍 사용자 조회 시도 1: single() 사용');
        const { data: user1, error: error1 } = await supabase
            .from('members')
            .select('*')
            .eq('username', username)
            .single();
        
        console.log('🔍 사용자 조회 시도 2: 배열로 조회');
        const { data: user2, error: error2 } = await supabase
            .from('members')
            .select('*')
            .eq('username', username);
        
        if (error1 && error2) {
            console.log('❌ 사용자 조회 오류1:', error1);
            console.log('❌ 사용자 조회 오류2:', error2);
            return res.json({
                success: false,
                message: '사용자 조회 실패',
                error1: error1?.message,
                error2: error2?.message
            });
        }
        
        const user = user1 || (user2 && user2[0]);
        
        if (!user) {
            return res.json({
                success: false,
                message: '사용자를 찾을 수 없습니다.',
                user1: user1,
                user2: user2
            });
        }
        
        console.log('📋 DB에 저장된 사용자 정보:');
        console.log('  - Username:', user.username);
        console.log('  - 저장된 해시:', user.password_hash);
        console.log('  - 입력된 해시:', passwordHash);
        console.log('  - 해시 일치:', user.password_hash === passwordHash);
        
        res.json({
            success: true,
            user: {
                username: user.username,
                name: user.name,
                role: user.role,
                status: user.status
            },
            storedHash: user.password_hash,
            inputHash: passwordHash,
            hashMatch: user.password_hash === passwordHash
        });
        
    } catch (error) {
        console.error('로그인 테스트 중 오류:', error);
        res.json({
            success: false,
            message: '서버 오류',
            error: error.message
        });
    }
});

// 테스트용 API - 계정 생성 (개발용)
app.post('/api/test/create-accounts', async (req, res) => {
    try {
        console.log('🔨 테스트 계정 생성 시작');
        
        const accounts = [
            {
                username: 'minj0010',
                password_hash: hashPassword('minj0010'),
                name: '김민정',
                email: 'minj0010@hanyang.com',
                role: 'admin',
                status: 'approved'
            },
            {
                username: 'test',
                password_hash: hashPassword('test123'),
                name: '테스트사용자',
                email: 'test@hanyang.com',
                role: 'user',
                status: 'approved'
            }
        ];
        
        const results = [];
        
        for (const account of accounts) {
            // 기존 계정 확인
            const { data: existing } = await supabase
                .from('members')
                .select('username')
                .eq('username', account.username);
            
            if (existing && existing.length > 0) {
                results.push({ username: account.username, status: 'already_exists' });
                continue;
            }
            
            // 직접 INSERT 사용
            const { data, error } = await supabase
                .from('members')
                .insert({
                    username: account.username,
                    password_hash: account.password_hash,
                    name: account.name,
                    email: account.email,
                    role: account.role,
                    status: account.status,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) {
                console.log(`❌ ${account.username} 생성 실패:`, error);
                results.push({ username: account.username, status: 'failed', error: error.message });
            } else {
                console.log(`✅ ${account.username} 생성 성공`);
                results.push({ username: account.username, status: 'created' });
            }
        }
        
        res.json({ success: true, results });
    } catch (error) {
        console.error('계정 생성 중 오류:', error);
        res.json({ success: false, error: error.message });
    }
});

// 회원 목록 조회 (관리자용)
app.get('/api/members', requireAdmin, async (req, res) => {
    try {
        console.log('🔍 회원 목록 조회 API 호출됨');
        
        const { data: members, error } = await supabase
            .from('members')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('회원 목록 조회 오류:', error);
            return res.json({ success: false, message: '회원 목록을 불러오는데 실패했습니다.' });
        }

        console.log('✅ 회원 목록 조회 성공:', members.length, '명');
        res.json({ success: true, data: members });
    } catch (error) {
        console.error('회원 목록 조회 중 오류:', error);
        res.json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 회원 차단 API (관리자용)
app.post('/api/admin/members/:id/block', requireAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
        console.log('🚫 회원 차단 요청:', id);
        
        // 본인은 차단할 수 없음
        if (req.session.user.id === id) {
            return res.json({ success: false, message: '본인 계정은 차단할 수 없습니다.' });
        }
        
        const { data: updatedMember, error } = await supabase
            .from('members')
            .update({ 
                status: 'blocked',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('회원 차단 오류:', error);
            return res.json({ success: false, message: '회원 차단에 실패했습니다.' });
        }

        console.log('✅ 회원 차단 성공:', updatedMember.username);
        res.json({ 
            success: true, 
            message: '회원이 성공적으로 차단되었습니다.',
            member: updatedMember
        });
    } catch (error) {
        console.error('회원 차단 중 오류:', error);
        res.json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 회원 차단 해제 API (관리자용)
app.post('/api/admin/members/:id/unblock', requireAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
        console.log('✅ 회원 차단 해제 요청:', id);
        
        const { data: updatedMember, error } = await supabase
            .from('members')
            .update({ 
                status: 'approved',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('회원 차단 해제 오류:', error);
            return res.json({ success: false, message: '회원 차단 해제에 실패했습니다.' });
        }

        console.log('✅ 회원 차단 해제 성공:', updatedMember.username);
        res.json({ 
            success: true, 
            message: '회원 차단이 성공적으로 해제되었습니다.',
            member: updatedMember
        });
    } catch (error) {
        console.error('회원 차단 해제 중 오류:', error);
        res.json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 사용자 세션 정보 조회
app.get('/api/user', (req, res) => {
    if (req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.json({ success: false, message: '로그인이 필요합니다.' });
    }
});

// 사용자 통계 정보 (실제 데이터)
app.get('/api/user/stats/:username', requireLogin, async (req, res) => {
    const { username } = req.params;
    
    try {
        // 로그인한 사용자가 자신의 정보만 조회할 수 있도록 보안 체크
        if (req.session.user.username !== username && req.session.user.role !== 'admin') {
            return res.json({ success: false, message: '권한이 없습니다.' });
        }
        
        // 사용자 정보 조회
        const { data: user, error: userError } = await supabase
            .from('members')
            .select('*')
            .eq('username', username)
            .single();
            
        if (userError || !user) {
            console.error('사용자 조회 오류:', userError);
            return res.json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }
        
        // 투자 관련 데이터는 아직 테이블이 없으므로 기본값 사용
        // 추후 investments 테이블이 생성되면 실제 데이터로 교체
        const stats = {
            products: 0,           // 보유 상품 수
            balance: 0,            // 보유 금액 (원)
            investment: 0,         // 총 투자 금액 (원)
            profit: 0              // 누적 수익 (원)
        };
        
        console.log(`✅ ${username} 사용자 통계 조회 성공`);
        res.json({ success: true, data: stats });
        
    } catch (error) {
        console.error('사용자 통계 조회 중 오류:', error);
        res.json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
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

// 기본 계정 초기화 함수
async function initializeDefaultAccounts() {
    try {
        console.log('🔍 기본 계정 초기화 중...');
        
        // 먼저 기존 계정이 있는지 확인
        const { data: existingAdmin } = await supabase
            .from('members')
            .select('username')
            .eq('username', 'minj0010');

        if (!existingAdmin || existingAdmin.length === 0) {
            console.log('⚠️ 관리자 계정이 없습니다. Supabase 대시보드에서 수동으로 생성해주세요.');
            console.log('📝 생성할 관리자 계정 정보:');
            console.log('   Username: minj0010');
            console.log('   Password Hash:', hashPassword('minj0010'));
            console.log('   Name: 김민정');
            console.log('   Role: admin');
            console.log('   Status: approved');
        } else {
            console.log('✅ 관리자 계정 이미 존재');
        }

        const { data: existingTest } = await supabase
            .from('members')
            .select('username')
            .eq('username', 'test');

        if (!existingTest || existingTest.length === 0) {
            console.log('⚠️ 테스트 계정이 없습니다. Supabase 대시보드에서 수동으로 생성해주세요.');
            console.log('📝 생성할 테스트 계정 정보:');
            console.log('   Username: test');
            console.log('   Password Hash:', hashPassword('test123'));
            console.log('   Name: 테스트사용자');
            console.log('   Role: user');
            console.log('   Status: approved');
        } else {
            console.log('✅ 테스트 계정 이미 존재');
        }

    } catch (error) {
        console.error('기본 계정 확인 중 오류:', error);
    }
}

// 회원 잔액 조회
async function getMemberBalance(memberId) {
    try {
        const { data, error } = await supabase
            .from('member_balances')
            .select('balance')
            .eq('member_id', memberId)
            .single();
        
        if (error) {
            // 잔액 레코드가 없으면 생성
            if (error.code === 'PGRST116') {
                const { error: insertError } = await supabase
                    .from('member_balances')
                    .insert({ member_id: memberId, balance: 0 });
                
                if (insertError) {
                    console.error('잔액 생성 오류:', insertError);
                    return 0;
                }
                return 0;
            }
            console.error('잔액 조회 오류:', error);
            return 0;
        }
        
        return parseFloat(data.balance) || 0;
    } catch (error) {
        console.error('잔액 조회 중 오류:', error);
        return 0;
    }
}

// 회원 잔액 업데이트
async function updateMemberBalance(memberId, newBalance) {
    try {
        const { error } = await supabase
            .from('member_balances')
            .upsert({ 
                member_id: memberId, 
                balance: newBalance,
                updated_at: new Date().toISOString()
            });
        
        if (error) {
            console.error('잔액 업데이트 오류:', error);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('잔액 업데이트 중 오류:', error);
        return false;
    }
}

// 입출금 신청 처리 API
app.post('/api/transaction', requireLogin, async (req, res) => {
    try {
        const { type, amount, bankTransferName, withdrawBankName, withdrawAccountNumber, withdrawAccountHolder } = req.body;
        const memberId = req.session.user.id;
        
        // 입력 검증
        if (!type || !amount || isNaN(amount) || parseFloat(amount) <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: '올바른 금액을 입력해주세요.' 
            });
        }
        
        const transactionAmount = parseFloat(amount);
        
        // 출금의 경우 잔액 확인
        if (type === 'withdraw') {
            const currentBalance = await getMemberBalance(memberId);
            if (transactionAmount > currentBalance) {
                return res.status(400).json({ 
                    success: false, 
                    message: '잔액이 부족합니다.' 
                });
            }
            
            // 최소 출금액 확인
            if (transactionAmount < 10000) {
                return res.status(400).json({ 
                    success: false, 
                    message: '최소 출금 금액은 10,000원입니다.' 
                });
            }
            
            // 출금 계좌 정보 확인
            if (!withdrawBankName || !withdrawAccountNumber || !withdrawAccountHolder) {
                return res.status(400).json({ 
                    success: false, 
                    message: '출금 계좌 정보를 입력해주세요.' 
                });
            }
        }
        
        // 입금의 경우 최소 금액 확인
        if (type === 'deposit' && transactionAmount < 50000) {
            return res.status(400).json({ 
                success: false, 
                message: '최소 입금 금액은 50,000원입니다.' 
            });
        }
        
        // 트랜잭션 생성
        const transactionData = {
            member_id: memberId,
            type: type,
            amount: transactionAmount,
            status: 'pending'
        };
        
        if (type === 'deposit') {
            transactionData.bank_transfer_name = bankTransferName || req.session.user.name;
        } else if (type === 'withdraw') {
            transactionData.withdraw_bank_name = withdrawBankName;
            transactionData.withdraw_account_number = withdrawAccountNumber;
            transactionData.withdraw_account_holder = withdrawAccountHolder;
        }
        
        const { data: transaction, error } = await supabase
            .from('transactions')
            .insert(transactionData)
            .select()
            .single();
        
        if (error) {
            console.error('트랜잭션 생성 오류:', error);
            return res.status(500).json({ 
                success: false, 
                message: '신청 처리 중 오류가 발생했습니다.' 
            });
        }
        
        // 트랜잭션 로그 생성
        await supabase
            .from('transaction_logs')
            .insert({
                transaction_id: transaction.id,
                previous_status: null,
                new_status: 'pending',
                note: `${type === 'deposit' ? '입금' : '출금'} 신청 생성`
            });
        
        res.json({ 
            success: true, 
            message: `${type === 'deposit' ? '입금' : '출금'} 신청이 완료되었습니다. 관리자 승인 후 처리됩니다.`,
            transactionId: transaction.id
        });
        
    } catch (error) {
        console.error('트랜잭션 처리 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 트랜잭션 목록 조회 API
app.get('/api/transactions', requireLogin, async (req, res) => {
    try {
        const memberId = req.session.user.id;
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('member_id', memberId)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) {
            console.error('트랜잭션 조회 오류:', error);
            return res.status(500).json({ 
                success: false, 
                message: '거래 내역 조회 중 오류가 발생했습니다.' 
            });
        }
        
        res.json({ 
            success: true, 
            transactions: transactions || [] 
        });
        
    } catch (error) {
        console.error('트랜잭션 조회 중 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 관리자: 모든 트랜잭션 조회 API
app.get('/api/admin/transactions', requireAdmin, async (req, res) => {
    try {
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select(`
                *,
                member:members(name, username)
            `)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('관리자 트랜잭션 조회 오류:', error);
            return res.status(500).json({ 
                success: false, 
                message: '거래 내역 조회 중 오류가 발생했습니다.' 
            });
        }
        
        res.json({ 
            success: true, 
            transactions: transactions || [] 
        });
        
    } catch (error) {
        console.error('관리자 트랜잭션 조회 중 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 관리자: 트랜잭션 승인/거부 API
app.put('/api/admin/transaction/:id', requireAdmin, async (req, res) => {
    try {
        const transactionId = req.params.id;
        const { action, note } = req.body; // action: 'approve' 또는 'reject'
        const adminId = req.session.user.id;
        
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ 
                success: false, 
                message: '올바른 액션을 선택해주세요.' 
            });
        }
        
        // 트랜잭션 조회
        const { data: transaction, error: fetchError } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .single();
        
        if (fetchError || !transaction) {
            return res.status(404).json({ 
                success: false, 
                message: '거래 내역을 찾을 수 없습니다.' 
            });
        }
        
        if (transaction.status !== 'pending') {
            return res.status(400).json({ 
                success: false, 
                message: '이미 처리된 거래입니다.' 
            });
        }
        
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        
        // 승인인 경우 잔액 업데이트
        if (action === 'approve') {
            const currentBalance = await getMemberBalance(transaction.member_id);
            
            if (transaction.type === 'deposit') {
                // 입금 승인: 잔액 증가
                const newBalance = currentBalance + parseFloat(transaction.amount);
                const updateSuccess = await updateMemberBalance(transaction.member_id, newBalance);
                
                if (!updateSuccess) {
                    return res.status(500).json({ 
                        success: false, 
                        message: '잔액 업데이트 중 오류가 발생했습니다.' 
                    });
                }
            } else if (transaction.type === 'withdraw') {
                // 출금 승인: 잔액 감소
                if (currentBalance < parseFloat(transaction.amount)) {
                    return res.status(400).json({ 
                        success: false, 
                        message: '잔액이 부족하여 출금을 승인할 수 없습니다.' 
                    });
                }
                
                const newBalance = currentBalance - parseFloat(transaction.amount);
                const updateSuccess = await updateMemberBalance(transaction.member_id, newBalance);
                
                if (!updateSuccess) {
                    return res.status(500).json({ 
                        success: false, 
                        message: '잔액 업데이트 중 오류가 발생했습니다.' 
                    });
                }
            }
        }
        
        // 트랜잭션 상태 업데이트
        const { error: updateError } = await supabase
            .from('transactions')
            .update({ 
                status: newStatus,
                admin_note: note,
                processed_by: adminId,
                processed_at: new Date().toISOString()
            })
            .eq('id', transactionId);
        
        if (updateError) {
            console.error('트랜잭션 업데이트 오류:', updateError);
            return res.status(500).json({ 
                success: false, 
                message: '거래 처리 중 오류가 발생했습니다.' 
            });
        }
        
        // 트랜잭션 로그 생성
        await supabase
            .from('transaction_logs')
            .insert({
                transaction_id: transactionId,
                previous_status: 'pending',
                new_status: newStatus,
                admin_id: adminId,
                note: note || `관리자에 의해 ${action === 'approve' ? '승인' : '거부'}됨`
            });
        
        res.json({ 
            success: true, 
            message: `거래가 ${action === 'approve' ? '승인' : '거부'}되었습니다.` 
        });
        
    } catch (error) {
        console.error('트랜잭션 처리 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 서버 시작
async function startServer() {
    try {
        console.log('🚀 한양에너지 서버를 시작합니다...');
        
        // 서버를 먼저 시작하여 빠른 응답 제공
        const server = app.listen(PORT, () => {
            console.log(`✅ 한양에너지 서버가 포트 ${PORT}에서 실행 중입니다.`);
            console.log(`🌐 접속 URL: ${NODE_ENV === 'production' ? 'https://hanyang-energy.onrender.com' : `http://localhost:${PORT}`}`);
        });

        // 서버 타임아웃 설정 (Render 배포 환경에서 중요)
        server.timeout = 30000; // 30초
        server.keepAliveTimeout = 65000; // 65초
        server.headersTimeout = 66000; // 66초

        // 백그라운드에서 초기화 작업 수행 (타임아웃 설정)
        const initTimeout = setTimeout(() => {
            console.warn('⚠️ 초기화 작업이 60초를 초과했습니다. 기본값으로 계속 진행합니다.');
        }, 60000);

        Promise.all([
            loadDataFromSupabase().catch(err => {
                console.warn('⚠️ Supabase 데이터 로드 실패:', err.message);
                return null;
            }),
            convertHtmlToEjs().catch(err => {
                console.warn('⚠️ HTML to EJS 변환 실패:', err.message);
                return null;
            }),
            initializeDefaultAccounts().catch(err => {
                console.warn('⚠️ 기본 계정 초기화 실패:', err.message);
                return null;
            })
        ]).then(() => {
            clearTimeout(initTimeout);
            console.log('✅ 서버 초기화 완료');
        }).catch(err => {
            clearTimeout(initTimeout);
            console.error('❌ 서버 초기화 중 일부 오류 발생:', err);
        });

        // 서버 종료 시 정리
        process.on('SIGTERM', () => {
            console.log('🔄 서버를 정상적으로 종료합니다...');
            server.close(() => {
                console.log('✅ 서버가 정상적으로 종료되었습니다.');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('🔄 인터럽트 신호를 받았습니다. 서버를 종료합니다...');
            server.close(() => {
                console.log('✅ 서버가 정상적으로 종료되었습니다.');
                process.exit(0);
            });
        });

        return server;
    } catch (error) {
        console.error('❌ 서버 시작 중 오류:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
