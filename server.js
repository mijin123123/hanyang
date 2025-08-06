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

// 키 선택 로직 개선
let supabaseKey;
if (process.env.NODE_ENV === 'production') {
    // 프로덕션에서는 환경변수의 서비스 롤 키 우선, 없으면 하드코딩된 키
    supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxY2V3a3V0bnNzZ3Jpb3hscWJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5MDE0OCwiZXhwIjoyMDY5ODY2MTQ4fQ.Kz0ARhQd3lRDjF0qRDv9j5dqjzeQpw726QkbwghKX6I';
} else {
    // 개발환경에서는 서비스 롤 키 우선
    supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
        process.env.SUPABASE_ANON_KEY || 
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxY2V3a3V0bnNzZ3Jpb3hscWJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5MDE0OCwiZXhwIjoyMDY5ODY2MTQ4fQ.Kz0ARhQd3lRDjF0qRDv9j5dqjzeQpw726QkbwghKX6I';
}

console.log('🔧 Supabase URL:', supabaseUrl);
console.log('🔧 Supabase Key:', supabaseKey ? '설정됨' : '설정안됨');
console.log('🔧 키 타입:', supabaseKey.includes('service_role') ? 'service_role' : 'anon');

let supabase;
try {
    supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    console.log('✅ Supabase 클라이언트 초기화 완료 (키 타입:', supabaseKey.includes('service_role') ? 'service_role' : 'anon', ')');
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

// 모든 요청 로깅 미들웨어
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});

// 관리자 정적 파일 서빙
app.use('/admin/css', express.static(path.join(__dirname, 'admin/css')));
app.use('/admin/js', express.static(path.join(__dirname, 'admin/js')));
app.use('/admin/uploads', express.static(path.join(__dirname, 'adm/uploads')));

// 기본 계정 생성 함수 (배포 환경용)
async function ensureBasicAccounts() {
    if (NODE_ENV !== 'production') return;
    
    try {
        console.log('🔍 배포 환경 기본 계정 확인 중...');
        
        // 기본 계정들
        const basicAccounts = [
            {
                username: 'minj0010',
                password_hash: hashPassword('minj0010'),
                name: '김민정',
                email: 'minj0010@hanyang.com',
                role: 'admin',
                status: 'approved'
            },
            {
                username: 'admin',
                password_hash: hashPassword('admin123'),
                name: '시스템관리자',
                email: 'admin@hanyang.com',
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
        
        for (const account of basicAccounts) {
            try {
                // 각 계정 확인에 타임아웃 적용 (5초)
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('timeout')), 5000)
                );
                
                const checkPromise = supabase
                    .from('members')
                    .select('username')
                    .eq('username', account.username)
                    .maybeSingle();
                
                const { data: existing } = await Promise.race([checkPromise, timeoutPromise]);
                
                if (!existing) {
                    console.log(`📝 ${account.username} 계정 생성 중...`);
                    const { error } = await supabase
                        .from('members')
                        .insert([{
                            ...account,
                            created_at: new Date().toISOString(),
                            approved_at: new Date().toISOString()
                        }]);
                    
                    if (error) {
                        console.error(`❌ ${account.username} 계정 생성 실패:`, error);
                    } else {
                        console.log(`✅ ${account.username} 계정 생성 성공`);
                    }
                } else {
                    console.log(`✅ ${account.username} 계정 이미 존재함`);
                }
            } catch (err) {
                console.warn(`⚠️ ${account.username} 계정 처리 중 오류 (계속 진행):`, err.message);
            }
        }
        
    } catch (error) {
        console.error('기본 계정 생성 중 오류:', error);
    }
}
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
    console.log('🔐 requireLogin 미들웨어 실행됨');
    console.log('🔐 요청 경로:', req.path);
    console.log('🔐 세션 사용자:', req.session?.user?.username || '없음');
    
    // 세션 기반 인증 먼저 확인
    if (req.session.user) {
        console.log('✅ 세션 기반 인증 성공');
        return next();
    }
    
    // 헤더에서 사용자 정보 확인 (클라이언트 측 auth.js와 연동)
    const userHeader = req.headers['x-current-user'];
    console.log('🔐 사용자 헤더:', userHeader ? '있음' : '없음');
    
    if (userHeader) {
        try {
            let user;
            // Base64로 인코딩된 헤더인지 확인 후 디코딩
            try {
                const decodedBase64 = Buffer.from(userHeader, 'base64').toString('utf-8');
                const decodedURI = decodeURIComponent(decodedBase64);
                user = JSON.parse(decodedURI);
            } catch (base64Error) {
                // Base64 디코딩 실패시 기존 방식으로 시도
                const decodedHeader = decodeURIComponent(userHeader);
                user = JSON.parse(decodedHeader);
            }
            
            console.log('🔐 헤더에서 파싱된 사용자:', user?.username || '없음');
            
            if (user && user.status === 'approved') {
                console.log('✅ 헤더 기반 인증 성공');
                // 세션에도 저장
                req.session.user = user;
                return next();
            } else {
                console.log('❌ 사용자 상태가 승인되지 않음:', user?.status);
            }
        } catch (e) {
            console.log('❌ 사용자 헤더 파싱 오류:', e);
        }
    }
    
    console.log('❌ 인증 실패 - 로그인 필요');
    
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
            let user;
            // Base64로 인코딩된 헤더인지 확인 후 디코딩
            try {
                const decodedBase64 = Buffer.from(userHeader, 'base64').toString('utf-8');
                const decodedURI = decodeURIComponent(decodedBase64);
                user = JSON.parse(decodedURI);
            } catch (base64Error) {
                // Base64 디코딩 실패시 기존 방식으로 시도
                const decodedHeader = decodeURIComponent(userHeader);
                user = JSON.parse(decodedHeader);
            }
            
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
        version: '2.1.0' // 버전 업데이트로 재배포 확인
    });
});

// 빠른 응답용 기본 헬스체크
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// 루트 경로도 빠른 응답
app.get('/status', (req, res) => {
    res.status(200).json({ ok: true, time: Date.now() });
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
        console.log('🔍 DB 조회 시작:', { username, passwordHash });
        const { data: existingUser, error: userError } = await supabase
            .from('members')
            .select('username, password_hash, status, role')
            .eq('username', username)
            .single();
            
        console.log('🔍 DB 조회 결과:', { existingUser, userError });
            
        if (userError) {
            console.log('❌ 사용자 조회 오류:', userError);
            
            // 모든 사용자 조회로 재시도
            const { data: allUsers, error: allError } = await supabase
                .from('members')
                .select('username, password_hash, status, role');
            
            console.log('🔍 전체 사용자 재조회:', { count: allUsers?.length || 0, allError });
            if (allUsers && allUsers.length > 0) {
                console.log('📋 첫 번째 사용자:', allUsers[0]);
            }
            
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
        
        // JSON 응답 대신 홈페이지로 리다이렉트
        res.redirect('/');
    });
});

// GET 로그아웃 라우트도 추가 (URL 직접 접근 대응)
app.get('/logout', (req, res) => {
    console.log('🚪 GET 로그아웃 요청 - 사용자:', req.session.user ? req.session.user.username : '없음');
    
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ 세션 삭제 실패:', err);
        }
        
        console.log('✅ 로그아웃 완료 (GET)');
        res.clearCookie('hanyang.sid');
        res.redirect('/');
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

// 사용자 투자 데이터 매핑 수정 API (임시 디버깅용)
app.get('/api/fix-user-mapping/:username', async (req, res) => {
    try {
        const { username } = req.params;
        console.log(`🔧 ${username} 사용자의 투자 데이터 매핑 수정 시작...`);
        
        // 1. 사용자 정보 조회
        const { data: user, error: userError } = await supabase
            .from('members')
            .select('*')
            .eq('username', username)
            .single();
            
        if (userError || !user) {
            console.error(`❌ ${username} 사용자를 찾을 수 없습니다:`, userError);
            return res.json({ success: false, error: 'User not found' });
        }
        
        console.log(`✅ ${username} 사용자 정보:`, {
            id: user.id,
            username: user.username,
            name: user.name
        });
        
        // 2. 최근 생성된 모든 투자 데이터 조회 (허진주 관련)
        const { data: allInvestments, error: investmentError } = await supabase
            .from('investments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (investmentError) {
            console.error('❌ 투자 데이터 조회 오류:', investmentError);
            return res.json({ success: false, error: 'Investment query failed' });
        }
        
        console.log(`🔍 최근 투자 데이터 ${allInvestments.length}건 조회됨`);
        
        // 3. 허진주 관련 투자 찾기 및 수정
        let updatedCount = 0;
        const results = [];
        
        for (const investment of allInvestments) {
            // 300kw 상품이고 5,000,000원인 투자 찾기
            if (investment.product_name && 
                investment.product_name.toLowerCase().includes('300kw') && 
                parseFloat(investment.amount) === 5000000) {
                
                console.log(`🎯 대상 투자 발견:`, {
                    id: investment.id,
                    member_id: investment.member_id,
                    product_name: investment.product_name,
                    amount: investment.amount,
                    status: investment.status
                });
                
                // member_id를 현재 사용자로 업데이트
                const { error: updateError } = await supabase
                    .from('investments')
                    .update({ member_id: user.id })
                    .eq('id', investment.id);
                    
                if (updateError) {
                    console.error(`❌ 투자 ${investment.id} 업데이트 실패:`, updateError);
                    results.push({ id: investment.id, success: false, error: updateError.message });
                } else {
                    console.log(`✅ 투자 ${investment.id} member_id 업데이트 완료`);
                    updatedCount++;
                    results.push({ id: investment.id, success: true });
                }
            }
        }
        
        // 4. 최종 확인
        const { data: finalInvestments } = await supabase
            .from('investments')
            .select('*')
            .eq('member_id', user.id);
            
        console.log(`🎉 매핑 수정 완료: ${updatedCount}건 업데이트`);
        console.log(`✅ ${username}의 최종 투자 개수: ${finalInvestments ? finalInvestments.length : 0}건`);
        
        res.json({
            success: true,
            message: `${updatedCount}건의 투자 데이터 매핑 수정 완료`,
            updatedCount,
            finalInvestmentCount: finalInvestments ? finalInvestments.length : 0,
            results
        });
        
    } catch (error) {
        console.error('❌ 매핑 수정 중 오류:', error);
        res.json({ success: false, error: error.message });
    }
});

// 마이페이지
app.get('/mypage', requireLogin, async (req, res) => {
    try {
        console.log(`🔍 ${req.session.user.username} 마이페이지 접근`);
        
        // 현재 로그인한 사용자의 상세 정보 조회
        const { data: userProfile, error } = await supabase
            .from('members')
            .select('*')
            .eq('username', req.session.user.username)
            .single();
            
        if (error) {
            console.error('❌ 사용자 프로필 조회 오류:', error);
            // 오류 시 세션 정보만 사용
            return res.render('mypage', { 
                user: req.session.user, 
                userProfile: null,
                currentBalance: 0,
                totalInvestment: 0,
                totalProfit: 0,
                productCount: 0,
                dailyProfit: 0
            });
        }
        
        console.log(`✅ 사용자 프로필 조회 성공:`);
        console.log(`   - ID: ${userProfile.id}`);
        console.log(`   - 이름: ${userProfile.name}`);
        console.log(`   - 사용자명: ${userProfile.username}`);
        console.log(`   - 이메일: ${userProfile.email}`);
        
        // 사용자의 모든 투자 데이터 조회 (모든 상태 포함)
        const { data: investments, error: investmentError } = await supabase
            .from('investments')
            .select(`
                *,
                created_at,
                amount,
                product_type,
                status
            `)
            .eq('member_id', userProfile.id);
        
        if (investmentError) {
            console.error(`❌ ${req.session.user.username} 투자 데이터 조회 오류:`, investmentError);
        } else {
            console.log(`🔍 ${req.session.user.username} 투자 데이터 조회 결과:`);
            console.log(`   - 총 투자 건수: ${investments ? investments.length : 0}건`);
            if (investments && investments.length > 0) {
                investments.forEach((inv, index) => {
                    console.log(`   📋 투자 ${index + 1}:`);
                    console.log(`      - ID: ${inv.id}`);
                    console.log(`      - 상품타입: ${inv.product_type}`);
                    console.log(`      - 출자금액: ₩${parseFloat(inv.amount || 0).toLocaleString()}`);
                    console.log(`      - 상태: ${inv.status}`);
                    console.log(`      - 신청일: ${new Date(inv.created_at).toLocaleString('ko-KR')}`);
                });
            } else {
                console.log(`   ❌ 투자 데이터 없음`);
            }
        }
        
        let totalInvestment = 0;
        let productCount = 0;
        let accumulatedInterest = 0;
        let approvedInvestments = [];
        
        if (!investmentError && investments && investments.length > 0) {
            // 모든 투자 개수 (상태 무관)
            productCount = investments.length;
            
            // 승인된 투자만 필터링
            approvedInvestments = investments.filter(inv => inv.status === 'approved');
            
            // 승인된 투자의 누적 이자 계산
            approvedInvestments.forEach(investment => {
                const investmentAmount = parseFloat(investment.amount || 0);
                totalInvestment += investmentAmount;
                
                // 투자 시작일로부터 경과 일수 계산
                const investmentDate = new Date(investment.created_at);
                const currentDate = new Date();
                const daysDiff = Math.floor((currentDate - investmentDate) / (1000 * 60 * 60 * 24));
                
                // 상품별 일일 수익률 적용
                const dailyRate = getDailyRateByProduct(investment.product_type);
                
                console.log(`💰 투자 상품 이자 계산:`);
                console.log(`   - 상품타입: ${investment.product_type}`);
                console.log(`   - 투자금액: ₩${investmentAmount.toLocaleString()}`);
                console.log(`   - 투자일: ${investmentDate.toLocaleDateString('ko-KR')}`);
                console.log(`   - 경과일수: ${daysDiff}일`);
                console.log(`   - 일일수익률: ${(dailyRate * 100).toFixed(4)}%`);
                console.log(`   - 예상일일수익: ₩${(investmentAmount * dailyRate).toLocaleString()}`);
                
                // 누적 이자 계산 (복리 아닌 단리로 계산)
                const productInterest = investmentAmount * dailyRate * daysDiff;
                console.log(`   - 누적이자: ₩${productInterest.toLocaleString()}`);
                accumulatedInterest += productInterest;
            });
        }
        
        // 사용자 현재 잔액 조회
        let currentBalance = await getMemberBalance(userProfile.id);
        
        // 잔액에 누적 이자 추가 (실제로는 별도 테이블에서 관리해야 함)
        currentBalance += accumulatedInterest;
        
        // 일일 수익 계산 (승인된 투자의 일일 수익 합계)
        let dailyProfit = 0;
        if (approvedInvestments && approvedInvestments.length > 0) {
            console.log(`📊 일일 수익 계산 시작:`);
            dailyProfit = approvedInvestments.reduce((sum, investment) => {
                const investmentAmount = parseFloat(investment.amount || 0);
                const dailyRate = getDailyRateByProduct(investment.product_type);
                const dailyAmount = investmentAmount * dailyRate;
                
                console.log(`   - ${investment.product_type}: ₩${investmentAmount.toLocaleString()} × ${(dailyRate * 100).toFixed(4)}% = ₩${dailyAmount.toLocaleString()}`);
                
                return sum + dailyAmount;
            }, 0);
            console.log(`📊 총 일일 수익: ₩${dailyProfit.toLocaleString()}`);
        }
        
        console.log(`✅ ${req.session.user.username} 마이페이지 데이터 조회 성공`);
        console.log(`� 통계: 조합상품 ${productCount}개, 총 출자 ${totalInvestment.toLocaleString()}원`);
        console.log(`💰 잔액: ${currentBalance.toLocaleString()}원, 일일 수익: ${dailyProfit.toLocaleString()}원`);
        console.log(`🎯 누적 이자: ${accumulatedInterest.toLocaleString()}원`);
        
        res.render('mypage', { 
            user: req.session.user, 
            userProfile: userProfile,
            currentBalance: Math.round(currentBalance),
            totalInvestment: totalInvestment,
            totalProfit: Math.round(accumulatedInterest),
            productCount: productCount,
            dailyProfit: Math.round(dailyProfit),
            investments: investments || []
        });
        
    } catch (error) {
        console.error('마이페이지 로드 중 오류:', error);
        res.render('mypage', { 
            user: req.session.user, 
            userProfile: null,
            currentBalance: 0,
            totalInvestment: 0,
            totalProfit: 0,
            productCount: 0,
            dailyProfit: 0,
            investments: []
        });
    }
});

// 계좌/주소 정보 업데이트 API
app.post('/api/update-account-info', requireLogin, async (req, res) => {
    try {
        const { bankName, accountNumber, address, detailAddress } = req.body;
        const userId = req.session.user.id;

        // 입력값 검증
        if (!bankName || !accountNumber) {
            return res.json({
                success: false,
                message: '은행명과 계좌번호는 필수 입력 항목입니다.'
            });
        }

        // 계좌번호 형식 검증
        const accountRegex = /^[0-9-]+$/;
        if (!accountRegex.test(accountNumber)) {
            return res.json({
                success: false,
                message: '계좌번호는 숫자와 하이픈(-)만 입력 가능합니다.'
            });
        }

        // 데이터베이스 업데이트
        const { data, error } = await supabase
            .from('members')
            .update({
                bank_name: bankName,
                account_number: accountNumber,
                address: address || null,
                detail_address: detailAddress || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) {
            console.error('계좌 정보 업데이트 오류:', error);
            return res.json({
                success: false,
                message: '정보 저장 중 오류가 발생했습니다.'
            });
        }

        console.log(`✅ ${req.session.user.username} 계좌/주소 정보 업데이트 성공`);
        res.json({
            success: true,
            message: '계좌/주소 정보가 성공적으로 저장되었습니다.'
        });

    } catch (error) {
        console.error('계좌 정보 업데이트 중 오류:', error);
        res.json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 투자 통계 계산 함수들
function calculateMonthlyRevenue(approvedInvestments) {
    const monthlyData = [];
    const currentDate = new Date();
    
    // 최근 12개월 데이터 생성
    for (let i = 11; i >= 0; i--) {
        const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthName = month.toLocaleDateString('ko-KR', { month: 'long' });
        
        // 해당 월에 활성화된 투자들의 수익 계산
        let monthlyRevenue = 0;
        approvedInvestments.forEach(investment => {
            const investmentDate = new Date(investment.investment_date);
            if (investmentDate <= month) {
                // 상품별 월 수익률 적용 (실제로는 DB에서 가져와야 함)
                const monthlyRate = getMonthlyRateByProduct(investment.product_name);
                monthlyRevenue += parseFloat(investment.investment_amount || 0) * monthlyRate;
            }
        });
        
        monthlyData.push({
            month: monthName,
            revenue: Math.round(monthlyRevenue)
        });
    }
    
    return monthlyData;
}

function calculatePortfolioAnalysis(approvedInvestments) {
    const totalAmount = approvedInvestments.reduce((sum, inv) => sum + parseFloat(inv.investment_amount || 0), 0);
    if (totalAmount === 0) return [];
    
    const productMap = {};
    
    approvedInvestments.forEach(investment => {
        const productName = investment.product_name;
        const amount = parseFloat(investment.investment_amount || 0);
        
        if (productMap[productName]) {
            productMap[productName] += amount;
        } else {
            productMap[productName] = amount;
        }
    });
    
    return Object.entries(productMap).map(([productName, amount]) => ({
        productName,
        amount,
        percentage: ((amount / totalAmount) * 100).toFixed(1)
    }));
}

function calculateAverageReturn(approvedInvestments) {
    if (approvedInvestments.length === 0) return 0;
    
    const totalAmount = approvedInvestments.reduce((sum, inv) => sum + parseFloat(inv.investment_amount || 0), 0);
    if (totalAmount === 0) return 0;
    
    let weightedReturn = 0;
    approvedInvestments.forEach(investment => {
        const amount = parseFloat(investment.investment_amount || 0);
        const productRate = getAnnualRateByProduct(investment.product_name);
        weightedReturn += (amount / totalAmount) * productRate;
    });
    
    return (weightedReturn * 100).toFixed(2); // 백분율로 반환
}

function getMonthlyRateByProduct(productName) {
    // 실제로는 DB에서 상품별 수익률을 가져와야 함
    const rateMap = {
        '[300KW] 다함께 동행 뉴베이직': 0.0025, // 월 0.25%
        '[500KW] 다함께 동행 메가': 0.003,     // 월 0.3%
        '[1MW] 다함께 동행 기가': 0.0035,       // 월 0.35%
        '그린 스타터 패키지': 0.002,             // 월 0.2%
        '라온 패키지': 0.0028,                   // 월 0.28%
        '심플 에코 패키지': 0.0022              // 월 0.22%
    };
    
    return rateMap[productName] || 0.0025; // 기본 0.25%
}

function getAnnualRateByProduct(productName) {
    // 실제로는 DB에서 상품별 연간 수익률을 가져와야 함
    const rateMap = {
        '[300KW] 다함께 동행 뉴베이직': 0.03,   // 연 3%
        '[500KW] 다함께 동행 메가': 0.036,      // 연 3.6%
        '[1MW] 다함께 동행 기가': 0.042,        // 연 4.2%
        '그린 스타터 패키지': 0.024,            // 연 2.4%
        '라온 패키지': 0.0336,                  // 연 3.36%
        '심플 에코 패키지': 0.0264             // 연 2.64%
    };
    
    return rateMap[productName] || 0.03; // 기본 3%
}

// 조합상품 관련 페이지들
app.get('/introduce_product', requireLogin, (req, res) => {
    res.render('introduce_product', { user: req.session.user });
});

app.get('/product_list', requireLogin, (req, res) => {
    res.render('product_list', { user: req.session.user });
});

app.get('/my_investments', requireLogin, async (req, res) => {
    try {
        const memberId = req.session.user.id;
        
        // 사용자의 투자 데이터 조회 (모든 상태의 투자 포함)
        const { data: investments, error } = await supabase
            .from('investments')
            .select('*')
            .eq('member_id', memberId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('투자 데이터 조회 오류:', error);
            return res.render('my_investments', { 
                user: req.session.user,
                investments: [],
                currentBalance: 0,
                error: '투자 데이터를 불러오는 중 오류가 발생했습니다.'
            });
        }
        
        // 템플릿 호환성을 위해 데이터 변환 (amount -> investment_amount)
        const formattedInvestments = (investments || []).map(investment => ({
            ...investment,
            investment_amount: investment.amount || investment.investment_amount || 0,
            // 상품 이름이 없으면 product_type이나 product_name에서 가져오기
            product_name: investment.product_name || 
                         getProductNameFromType(investment.product_type) || 
                         investment.product || 
                         '알 수 없는 상품',
            // 투자 날짜 설정 (created_at이나 investment_date 사용)
            investment_date: investment.investment_date || investment.created_at || new Date().toISOString(),
            // 상태 정규화 (DB의 실제 상태를 템플릿에서 이해할 수 있는 형태로 변환)
            displayStatus: investment.status === 'approved' ? 'active' : 
                          investment.status === 'rejected' ? 'rejected' : 
                          investment.status === 'completed' ? 'completed' : 'pending',
            // 원본 상태도 유지
            originalStatus: investment.status
        }));
        
        // 실제 데이터 기반 통계 계산
        const approvedInvestments = formattedInvestments.filter(inv => inv.originalStatus === 'approved');
        const rejectedInvestments = formattedInvestments.filter(inv => inv.originalStatus === 'rejected');
        const pendingInvestments = formattedInvestments.filter(inv => inv.originalStatus === 'pending');
        const completedInvestments = formattedInvestments.filter(inv => inv.originalStatus === 'completed');
        
        // 총 출자 금액 (승인된 투자만)
        const totalInvestmentAmount = approvedInvestments.reduce((sum, inv) => sum + parseFloat(inv.investment_amount || 0), 0);
        
        // 진행중인 투자 개수 (승인된 투자)
        const activeInvestmentCount = approvedInvestments.length;
        
        // 월별 수익 계산 (실제 투자 시작일 기준)
        const monthlyRevenue = calculateMonthlyRevenue(approvedInvestments);
        
        // 포트폴리오 분석 (상품별 비중)
        const portfolioAnalysis = calculatePortfolioAnalysis(approvedInvestments);
        
        // 평균 수익률 계산 (상품별 수익률의 가중평균)
        const averageReturn = calculateAverageReturn(approvedInvestments);
        
        // 사용자 잔액 조회
        const currentBalance = await getMemberBalance(memberId);
        
        console.log(`✅ ${req.session.user.username} 투자 현황 조회 성공: ${formattedInvestments.length}건 (승인: ${activeInvestmentCount}건)`);
        
        res.render('my_investments', { 
            user: req.session.user,
            investments: formattedInvestments,
            currentBalance: currentBalance,
            // 실시간 통계 데이터
            totalInvestmentAmount: totalInvestmentAmount,
            activeInvestmentCount: activeInvestmentCount,
            monthlyRevenue: monthlyRevenue,
            portfolioAnalysis: portfolioAnalysis,
            averageReturn: averageReturn,
            // 상태별 개수
            approvedCount: approvedInvestments.length,
            rejectedCount: rejectedInvestments.length,
            pendingCount: pendingInvestments.length,
            completedCount: completedInvestments.length
        });
    } catch (error) {
        console.error('투자 현황 페이지 오류:', error);
        res.render('my_investments', { 
            user: req.session.user,
            investments: [],
            currentBalance: 0,
            error: '페이지를 불러오는 중 오류가 발생했습니다.'
        });
    }
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

app.get('/admin/account-manager', requireAdmin, async (req, res) => {
    try {
        // 모든 조합원 정보와 잔액 조회
        const { data: members, error: membersError } = await supabase
            .from('members')
            .select('id, username, name, email, phone, bank_name, account_number, created_at')
            .order('created_at', { ascending: false });
        
        if (membersError) {
            console.error('조합원 목록 조회 오류:', membersError);
            return res.render('admin/account-manager', { 
                user: req.session.user, 
                currentPage: 'account-manager',
                members: [],
                error: '조합원 목록을 불러오는 중 오류가 발생했습니다.'
            });
        }
        
        // 각 조합원의 잔액과 투자 정보 조회
        const membersWithBalance = await Promise.all(
            members.map(async (member) => {
                const balance = await getMemberBalance(member.id);
                
                // 총 투자 금액 조회
                const { data: investments } = await supabase
                    .from('investments')
                    .select('amount')
                    .eq('member_id', member.id)
                    .eq('status', 'approved');
                
                const totalInvestment = investments 
                    ? investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0)
                    : 0;
                
                return {
                    ...member,
                    balance: balance,
                    totalInvestment: totalInvestment
                };
            })
        );
        
        res.render('admin/account-manager', { 
            user: req.session.user, 
            currentPage: 'account-manager',
            members: membersWithBalance
        });
        
    } catch (error) {
        console.error('계좌 관리 페이지 오류:', error);
        res.render('admin/account-manager', { 
            user: req.session.user, 
            currentPage: 'account-manager',
            members: [],
            error: '페이지를 불러오는 중 오류가 발생했습니다.'
        });
    }
});

app.get('/admin/notice-manager', requireAdmin, (req, res) => {
    res.render('admin/notice-manager', { user: req.session.user, currentPage: 'notice-manager' });
});

app.get('/admin/inquiry-manager', requireAdmin, (req, res) => {
    res.render('admin/inquiry-manager', { user: req.session.user, currentPage: 'inquiry-manager' });
});

app.get('/admin/transaction-management', requireAdmin, async (req, res) => {
    try {
        // 거래 내역 조회
        const { data: transactions, error: transactionsError } = await supabase
            .from('transactions')
            .select(`
                *,
                members:member_id (
                    username,
                    name
                )
            `)
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (transactionsError) {
            console.error('거래내역 조회 오류:', transactionsError);
            return res.render('admin/transaction-management', { 
                user: req.session.user, 
                currentPage: 'transaction-management',
                transactions: [],
                error: '거래내역을 불러오는 중 오류가 발생했습니다.'
            });
        }
        
        res.render('admin/transaction-management', { 
            user: req.session.user, 
            currentPage: 'transaction-management',
            transactions: transactions || []
        });
        
    } catch (error) {
        console.error('거래 관리 페이지 오류:', error);
        res.render('admin/transaction-management', { 
            user: req.session.user, 
            currentPage: 'transaction-management',
            transactions: [],
            error: '페이지를 불러오는 중 오류가 발생했습니다.'
        });
    }
});

// API 엔드포인트들

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

// 문의사항 작성 API
app.post('/api/inquiries', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        
        console.log('📝 새로운 문의 접수:', {
            name,
            email,
            phone: phone || '미제공',
            subject,
            messageLength: message?.length || 0
        });

        // 필수 필드 검증
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ 
                success: false, 
                message: '필수 정보를 모두 입력해주세요.' 
            });
        }

        // 데이터베이스에 문의 저장
        const { data, error } = await supabase
            .from('inquiries')
            .insert([
                {
                    member_id: req.session?.user?.id || null, // 로그인한 사용자의 ID
                    name: name.trim(),
                    email: email.trim(),
                    subject: subject.trim(),
                    message: message.trim(),
                    status: 'pending'
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('❌ 문의 저장 실패:', error);
            return res.status(500).json({ 
                success: false, 
                message: '문의 저장 중 오류가 발생했습니다.' 
            });
        }

        console.log('✅ 문의 저장 성공:', data.id);
        
        res.json({ 
            success: true, 
            message: '문의가 성공적으로 접수되었습니다.',
            inquiryId: data.id
        });

    } catch (error) {
        console.error('❌ 문의 접수 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 문의 목록 조회 (관리자용) - 데이터베이스에서 조회
app.get('/api/inquiries', requireAdmin, async (req, res) => {
    try {
        console.log('📋 관리자 문의 목록 조회');
        
        const { data: inquiries, error } = await supabase
            .from('inquiries')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ 문의 목록 조회 실패:', error);
            return res.status(500).json({ 
                success: false, 
                message: '문의 목록 조회 중 오류가 발생했습니다.' 
            });
        }

        // 프론트엔드 호환성을 위해 필드명 변환
        const formattedInquiries = inquiries.map(inquiry => ({
            id: inquiry.id,
            name: inquiry.name,
            email: inquiry.email,
            phone: inquiry.phone || '미제공',
            title: inquiry.subject, // subject -> title
            content: inquiry.message, // message -> content
            createdAt: new Date(inquiry.created_at).toLocaleDateString('ko-KR'), // created_at -> createdAt (한국 날짜 형식)
            status: inquiry.status,
            reply: inquiry.admin_reply,
            replyDate: inquiry.replied_at ? new Date(inquiry.replied_at).toLocaleDateString('ko-KR') : null
        }));

        console.log(`✅ 문의 목록 조회 성공: ${formattedInquiries?.length || 0}건`);
        
        res.json({ 
            success: true, 
            data: formattedInquiries || []
        });

    } catch (error) {
        console.error('❌ 문의 목록 조회 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 문의 답변 처리 (관리자용)
app.post('/api/inquiries/:id/reply', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reply } = req.body;
        
        console.log(`💬 문의 답변 처리: ${id}`);

        if (!reply || !reply.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: '답변 내용을 입력해주세요.' 
            });
        }

        const { data, error } = await supabase
            .from('inquiries')
            .update({
                admin_reply: reply.trim(),
                status: 'answered',
                replied_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('❌ 문의 답변 실패:', error);
            return res.status(500).json({ 
                success: false, 
                message: '답변 저장 중 오류가 발생했습니다.' 
            });
        }

        if (!data) {
            return res.status(404).json({ 
                success: false, 
                message: '문의를 찾을 수 없습니다.' 
            });
        }

        console.log('✅ 문의 답변 완료:', data.id);
        
        res.json({ 
            success: true, 
            message: '답변이 성공적으로 전송되었습니다.' 
        });

    } catch (error) {
        console.error('❌ 문의 답변 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 사용자별 문의 조회 API
app.get('/api/my-inquiries', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        console.log(`📋 사용자 문의 조회: ${userId}`);

        const { data, error } = await supabase
            .from('inquiries')
            .select('*')
            .eq('member_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ 사용자 문의 조회 실패:', error);
            return res.status(500).json({ 
                success: false, 
                message: '문의 조회 중 오류가 발생했습니다.' 
            });
        }

        // 필드명 매핑 및 날짜 포맷팅
        const mappedData = data.map(inquiry => {
            const createdDate = new Date(inquiry.created_at);
            const repliedDate = inquiry.replied_at ? new Date(inquiry.replied_at) : null;
            
            return {
                id: inquiry.id,
                title: inquiry.subject || '', // subject -> title
                content: inquiry.message || '', // message -> content
                category: inquiry.category || '일반 문의',
                status: inquiry.status === 'answered' ? 'replied' : inquiry.status, // status 매핑
                createdAt: createdDate.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).replace(/\. /g, '.').replace('.', ''), // 2024.03.15 형태
                createdTime: createdDate.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }),
                adminReply: inquiry.admin_reply || null,
                repliedAt: repliedDate ? repliedDate.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).replace(/\. /g, '.').replace('.', '') : null,
                repliedTime: repliedDate ? repliedDate.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }) : null,
                phone: inquiry.phone || '',
                email: inquiry.email || ''
            };
        });

        console.log(`✅ 사용자 문의 조회 완료: ${mappedData.length}건`);
        
        res.json({ 
            success: true, 
            inquiries: mappedData
        });

    } catch (error) {
        console.error('❌ 사용자 문의 조회 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 문의 삭제 (관리자용)
app.delete('/api/inquiries/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`🗑️ 문의 삭제: ${id}`);

        const { error } = await supabase
            .from('inquiries')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('❌ 문의 삭제 실패:', error);
            return res.status(500).json({ 
                success: false, 
                message: '문의 삭제 중 오류가 발생했습니다.' 
            });
        }

        console.log('✅ 문의 삭제 완료');
        
        res.json({ 
            success: true, 
            message: '문의가 성공적으로 삭제되었습니다.' 
        });

    } catch (error) {
        console.error('❌ 문의 삭제 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
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

// 상품별 일일 수익률 반환 함수
function getDailyRateByProduct(productName) {
    // 상품별 연간 수익률을 일일 수익률로 환산
    const annualRates = {
        'HANYANG GREEN STARTER': 0.05,    // 연 5%
        'green_starter': 0.05,            // 연 5%
        'HANYANG LAON': 0.08,             // 연 8%
        'laon': 0.08,                     // 연 8%
        'SIMPLE ECO': 0.06,               // 연 6%
        'simple_eco': 0.06,               // 연 6%
        '300KW 발전소': 0.219,            // 연 21.9% (일 3,000원 기준)
        '300kw': 0.219,                   // 연 21.9% (일 3,000원 기준)
        '500KW 발전소': 0.09,             // 연 9%
        '500kw': 0.09,                    // 연 9%
        '1MW 발전소': 0.10,               // 연 10%
        '1mw': 0.10,                      // 연 10%
        '2MW 발전소': 0.12,               // 연 12%
        '2mw': 0.12                       // 연 12%
    };
    
    // 기본값 설정 (알 수 없는 상품의 경우)
    const defaultRate = 0.06; // 연 6%
    
    // 상품명으로 수익률 찾기 (대소문자 구분 없이)
    const productKey = productName ? productName.toLowerCase() : '';
    let annualRate = annualRates[productName] || annualRates[productKey] || defaultRate;
    
    // 상품명에 키워드가 포함된 경우 처리
    if (!annualRates[productName] && !annualRates[productKey]) {
        for (const [key, value] of Object.entries(annualRates)) {
            if (productName && (productName.includes(key.split(' ')[0]) || key.includes(productKey))) {
                annualRate = value;
                break;
            }
        }
    }
    
    // 연간 수익률을 일일 수익률로 환산 (365일 기준)
    return annualRate / 365;
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

// 테스트용 API - investments 테이블 구조 확인 및 생성
app.get('/api/test/investments-table', async (req, res) => {
    try {
        console.log('🔍 investments 테이블 구조 확인');
        
        // 1단계: PostgreSQL 시스템 테이블에서 컬럼 정보 조회
        const { data: columnInfo, error: columnError } = await supabase
            .rpc('get_table_columns', { table_name: 'investments' })
            .then(result => {
                console.log('RPC 호출 결과:', result);
                return result;
            })
            .catch(err => {
                console.log('RPC 호출 실패, 대안 방법 시도');
                return { data: null, error: err };
            });
        
        // 2단계: 직접 테이블 조회 시도
        const { data, error } = await supabase
            .from('investments')
            .select('*')
            .limit(1);
        
        if (error) {
            console.log('❌ investments 테이블 조회 오류:', error);
            
            if (error.code === 'PGRST116') {
                // 테이블이 존재하지 않음
                const createTableSQL = `
                    CREATE TABLE IF NOT EXISTS investments (
                        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                        member_id UUID REFERENCES members(id) ON DELETE CASCADE,
                        product_type VARCHAR(50) NOT NULL,
                        amount DECIMAL(15,2) NOT NULL,
                        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                `;
                
                return res.json({
                    success: false,
                    error: error,
                    message: 'investments 테이블이 존재하지 않습니다.',
                    createTableSQL: createTableSQL,
                    suggestion: 'Supabase 대시보드 SQL Editor에서 위 SQL을 실행해주세요.'
                });
            }
            
            return res.json({
                success: false,
                error: error,
                message: 'investments 테이블 조회 실패'
            });
        }
        
        // 3단계: 실제 데이터 조회해서 컬럼 확인
        const { data: sampleData, error: sampleError } = await supabase
            .from('investments')
            .select('*')
            .limit(5);
        
        console.log('✅ investments 테이블 샘플 데이터:', sampleData);
        
        // 4단계: 데이터가 있다면 컬럼 이름들 추출
        let columnNames = [];
        if (sampleData && sampleData.length > 0) {
            columnNames = Object.keys(sampleData[0]);
        }
        
        res.json({
            success: true,
            sampleData: sampleData,
            sampleError: sampleError,
            columnNames: columnNames,
            columnInfo: columnInfo,
            message: 'investments 테이블 구조 확인 완료',
            tableExists: true
        });
        
    } catch (error) {
        console.error('investments 테이블 구조 확인 중 오류:', error);
        res.json({
            success: false,
            error: error.message,
            message: '테이블 구조 확인 중 예외 오류 발생'
        });
    }
});

// 상품 타입을 이름으로 변환하는 함수
function getProductNameFromType(productType) {
    const productNames = {
        '300kw': '[300KW] 다함께 동행 뉴베이직',
        '500kw': '[500KW] 다함께 동행',
        '1mw': '[1MW] 다함께 동행 메가',
        'green_starter': '그린 스타터 패키지',
        'laon': '라온 에너지 패키지',
        'simple_eco': '심플 에코 패키지'
    };
    return productNames[productType] || productType;
}

// 투자 신청 처리 API
app.post('/api/investment', requireLogin, async (req, res) => {
    try {
        console.log('💰 투자 신청 API 요청 받음');
        console.log('💰 요청 본문:', req.body);
        console.log('💰 세션 사용자:', req.session.user);
        
        const { productType, amount, bankName, accountNumber } = req.body;
        const memberId = req.session.user.id;
        
        // 입력 검증
        if (!productType || !amount || isNaN(amount) || parseFloat(amount) <= 0) {
            console.log('❌ 입력 검증 실패:', { productType, amount });
            return res.status(400).json({ 
                success: false, 
                message: '올바른 투자 정보를 입력해주세요.' 
            });
        }
        
        const investmentAmount = parseFloat(amount);
        
        // 최소 투자 금액 확인 (50만원)
        if (investmentAmount < 500000) {
            console.log('❌ 최소 투자 금액 미달:', investmentAmount);
            return res.status(400).json({ 
                success: false, 
                message: '최소 투자 금액은 500,000원입니다.' 
            });
        }
        
        // 투자 신청 생성 - 모든 가능한 컬럼명 시도
        console.log('🔍 투자 테이블 구조 확인 중...');
        
        // 1단계: 테이블 구조 확인
        const { data: tableCheck, error: tableError } = await supabase
            .from('investments')
            .select('*')
            .limit(1);
            
        console.log('📋 테이블 확인 결과:', { tableCheck, tableError });
        
        // 2단계: 다양한 컬럼명과 구조로 시도
        const attempts = [
            {
                name: '기본 구조 시도 (product_type, amount)',
                data: {
                    member_id: memberId,
                    product_type: productType,
                    amount: investmentAmount,
                    status: 'pending'
                }
            },
            {
                name: '대안 구조 1 (type, amount)',
                data: {
                    member_id: memberId,
                    type: productType,
                    amount: investmentAmount,
                    status: 'pending'
                }
            },
            {
                name: '대안 구조 2 (product, investment_amount)',
                data: {
                    member_id: memberId,
                    product: getProductNameFromType(productType),
                    investment_amount: investmentAmount,
                    status: 'pending'
                }
            },
            {
                name: '대안 구조 3 (product_name, amount)',
                data: {
                    member_id: memberId,
                    product_name: getProductNameFromType(productType),
                    amount: investmentAmount,
                    status: 'pending'
                }
            },
            {
                name: '간단한 구조 (amount만)',
                data: {
                    member_id: memberId,
                    amount: investmentAmount,
                    status: 'pending'
                }
            }
        ];
        
        let investment = null;
        let finalError = null;
        
        for (const attempt of attempts) {
            console.log(`💰 ${attempt.name}:`, attempt.data);
            
            const { data: result, error } = await supabase
                .from('investments')
                .insert(attempt.data)
                .select()
                .single();
                
            if (!error && result) {
                investment = result;
                console.log(`✅ ${attempt.name} 성공!`);
                break;
            } else {
                console.log(`❌ ${attempt.name} 실패:`, error);
                finalError = error;
            }
        }
        
        
        if (!investment) {
            console.error('❌ 모든 시도 실패 - 투자 신청 생성 오류:', finalError);
            console.error('❌ 오류 세부사항:', JSON.stringify(finalError, null, 2));
            
            // 테이블이 존재하지 않는 경우 생성 안내
            if (finalError?.code === 'PGRST116' || finalError?.message?.includes('does not exist')) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'investments 테이블이 존재하지 않습니다. 관리자에게 문의해주세요.',
                    error: 'TABLE_NOT_EXISTS',
                    createTableSQL: `
                        CREATE TABLE IF NOT EXISTS investments (
                            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                            member_id UUID REFERENCES members(id) ON DELETE CASCADE,
                            product_type VARCHAR(50) NOT NULL,
                            amount DECIMAL(15,2) NOT NULL,
                            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                        );
                    `
                });
            }
            
            return res.status(500).json({ 
                success: false, 
                message: '투자 신청 처리 중 오류가 발생했습니다. 데이터베이스 구조를 확인해주세요.',
                error: finalError?.message || '알 수 없는 오류',
                suggestion: 'http://localhost:3000/api/test/investments-table 페이지에서 테이블 구조를 확인해주세요.'
            });
        }
        
        console.log('✅ 투자 신청 생성 성공:', investment.id);
        res.json({ 
            success: true, 
            message: '투자 신청이 완료되었습니다. 관리자 승인 후 처리됩니다.',
            investmentId: investment.id
        });
        
    } catch (error) {
        console.error('💥 투자 신청 처리 예외 오류:', error);
        console.error('💥 오류 스택:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.',
            error: error.message
        });
    }
});

// 관리자: 모든 투자 신청 조회 API
app.get('/api/admin/investments', requireAdmin, async (req, res) => {
    try {
        console.log('🔍 관리자 투자 조회 API 호출됨');
        
        const { data: investments, error } = await supabase
            .from('investments')
            .select(`
                *,
                member:members!investments_member_id_fkey(
                    name, 
                    username, 
                    email, 
                    phone, 
                    bank_name, 
                    account_number, 
                    address, 
                    detail_address
                )
            `)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('관리자 투자 조회 오류:', error);
            return res.status(500).json({ 
                success: false, 
                message: '투자 내역 조회 중 오류가 발생했습니다.' 
            });
        }
        
        console.log('✅ 관리자 투자 조회 성공:', investments?.length || 0, '건');
        res.json({ 
            success: true, 
            investments: investments || [] 
        });
        
    } catch (error) {
        console.error('관리자 투자 조회 중 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 관리자: 투자 상세보기 API
app.get('/api/admin/investment/:id', requireAdmin, async (req, res) => {
    try {
        const investmentId = req.params.id;
        console.log('🔍 관리자 투자 상세보기 API 호출됨:', investmentId);
        
        const { data: investment, error } = await supabase
            .from('investments')
            .select(`
                *,
                member:members!investments_member_id_fkey(
                    id,
                    name, 
                    username, 
                    email, 
                    phone, 
                    bank_name, 
                    account_number, 
                    address, 
                    detail_address,
                    created_at,
                    updated_at
                )
            `)
            .eq('id', investmentId)
            .single();
        
        if (error) {
            console.error('투자 상세보기 조회 오류:', error);
            return res.status(404).json({ 
                success: false, 
                message: '투자 정보를 찾을 수 없습니다.' 
            });
        }
        
        console.log('✅ 투자 상세보기 조회 성공:', investment.id);
        res.json({ 
            success: true, 
            investment: investment 
        });
        
    } catch (error) {
        console.error('투자 상세보기 중 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 관리자: 대시보드 통계 조회 API
app.get('/api/admin/dashboard-stats', requireAdmin, async (req, res) => {
    try {
        console.log('📊 관리자 대시보드 통계 조회 API 호출됨');
        
        // 회원 수 조회 (관리자 제외)
        const { data: members, error: membersError } = await supabase
            .from('members')
            .select('id, status')
            .neq('role', 'admin');
        
        // 모든 투자 데이터 조회 (회원 정보 포함)
        const { data: investments, error: investmentsError } = await supabase
            .from('investments')
            .select(`
                *,
                member:members!investments_member_id_fkey(name, username)
            `);
        
        // 트랜잭션 데이터 조회 (대기중인 것만)
        const { data: transactions, error: transactionsError } = await supabase
            .from('transactions')
            .select('*')
            .eq('status', 'pending');
        
        if (membersError) {
            console.error('회원 데이터 조회 오류:', membersError);
        }
        if (investmentsError) {
            console.error('투자 데이터 조회 오류:', investmentsError);
        }
        if (transactionsError) {
            console.error('트랜잭션 데이터 조회 오류:', transactionsError);
        }
        
        // 회원 통계 계산
        const totalMembers = members?.length || 0;
        const activeMembers = members?.filter(m => m.status === 'approved').length || 0;
        
        // 투자 통계 계산
        const allInvestments = investments || [];
        const approvedInvestments = allInvestments.filter(inv => inv.status === 'approved');
        const pendingInvestments = allInvestments.filter(inv => inv.status === 'pending');
        const rejectedInvestments = allInvestments.filter(inv => inv.status === 'rejected');
        
        // 총 투자 금액 계산 (승인된 투자만)
        const totalInvestmentAmount = approvedInvestments.reduce((sum, inv) => {
            const amount = parseFloat(
                inv.investment_amount || 
                inv.amount || 
                inv.invest_amount || 
                0
            );
            return sum + amount;
        }, 0);
        
        // 대기중인 투자 금액 계산
        const pendingInvestmentAmount = pendingInvestments.reduce((sum, inv) => {
            const amount = parseFloat(
                inv.investment_amount || 
                inv.amount || 
                inv.invest_amount || 
                0
            );
            return sum + amount;
        }, 0);
        
        // 고유 투자자 수 계산 (승인된 투자 기준)
        const uniqueInvestors = new Set(approvedInvestments.map(inv => inv.member_id)).size;
        
        // 최근 투자 활동 (최근 7일)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentInvestments = allInvestments.filter(inv => 
            new Date(inv.created_at) >= sevenDaysAgo
        );
        
        // 이번 달 투자 금액 계산
        const currentMonth = new Date();
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const thisMonthInvestments = approvedInvestments.filter(inv => 
            new Date(inv.created_at) >= startOfMonth
        );
        const thisMonthAmount = thisMonthInvestments.reduce((sum, inv) => {
            const amount = parseFloat(
                inv.investment_amount || 
                inv.amount || 
                inv.invest_amount || 
                0
            );
            return sum + amount;
        }, 0);
        
        const stats = {
            // 기본 통계
            totalMembers: totalMembers,
            activeMembers: activeMembers,
            totalInvestmentAmount: totalInvestmentAmount,
            uniqueInvestors: uniqueInvestors,
            
            // 투자 상태별 통계
            totalInvestments: allInvestments.length,
            approvedInvestments: approvedInvestments.length,
            pendingInvestments: pendingInvestments.length,
            rejectedInvestments: rejectedInvestments.length,
            
            // 금액 통계
            pendingInvestmentAmount: pendingInvestmentAmount,
            thisMonthAmount: thisMonthAmount,
            
            // 활동 통계
            recentInvestments: recentInvestments.length,
            pendingTransactions: transactions?.length || 0,
            
            // 상세 데이터 (최근 활동)
            recentInvestmentList: recentInvestments.slice(0, 5).map(inv => ({
                id: inv.id,
                memberName: inv.member?.name || '알 수 없음',
                amount: parseFloat(inv.investment_amount || inv.amount || 0),
                status: inv.status,
                createdAt: inv.created_at
            }))
        };
        
        console.log('✅ 관리자 대시보드 통계 조회 성공:', {
            총회원수: stats.totalMembers,
            활성회원수: stats.activeMembers,
            총투자금액: stats.totalInvestmentAmount.toLocaleString(),
            승인된투자: stats.approvedInvestments,
            대기중투자: stats.pendingInvestments
        });
        
        res.json({ 
            success: true, 
            stats: stats
        });
        
    } catch (error) {
        console.error('관리자 대시보드 통계 조회 중 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 관리자: 투자 승인/거부 API
app.put('/api/admin/investment/:id', requireAdmin, async (req, res) => {
    try {
        const investmentId = req.params.id;
        const { action, note } = req.body; // action: 'approve' 또는 'reject'
        const adminId = req.session.user.id;
        
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ 
                success: false, 
                message: '올바른 액션을 선택해주세요.' 
            });
        }
        
        // 투자 신청 조회
        const { data: investment, error: fetchError } = await supabase
            .from('investments')
            .select('*')
            .eq('id', investmentId)
            .single();
        
        if (fetchError || !investment) {
            return res.status(404).json({ 
                success: false, 
                message: '투자 신청을 찾을 수 없습니다.' 
            });
        }
        
        if (investment.status !== 'pending') {
            return res.status(400).json({ 
                success: false, 
                message: '이미 처리된 투자 신청입니다.' 
            });
        }
        
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        
        // 투자 승인인 경우 잔액에서 투자 금액 차감
        if (action === 'approve') {
            // 현재 잔액 조회
            const currentBalance = await getMemberBalance(investment.member_id);
            
            // 잔액 부족 확인
            if (currentBalance < investment.amount) {
                return res.status(400).json({ 
                    success: false, 
                    message: '조합원의 잔액이 부족합니다.' 
                });
            }
            
            // 잔액에서 투자 금액 차감
            const newBalance = currentBalance - investment.amount;
            const { error: balanceError } = await supabase
                .from('member_balances')
                .update({ balance: newBalance })
                .eq('member_id', investment.member_id);
            
            if (balanceError) {
                console.error('잔액 업데이트 오류:', balanceError);
                return res.status(500).json({ 
                    success: false, 
                    message: '잔액 업데이트 중 오류가 발생했습니다.' 
                });
            }
            
            // 거래내역 기록 (투자 차감)
            const { error: transactionError } = await supabase
                .from('transactions')
                .insert({
                    member_id: investment.member_id,
                    type: 'investment',
                    amount: -investment.amount,
                    balance_after: newBalance,
                    description: `${investment.product_name} 투자`,
                    status: 'completed',
                    created_at: new Date().toISOString()
                });
                
            if (transactionError) {
                console.error('거래내역 기록 오류:', transactionError);
                // 거래내역 기록 실패해도 투자 승인은 진행
            }
            
            console.log(`💰 투자 승인으로 잔액 차감: ${investment.member_id}, 차감액: ${investment.amount}, 잔액: ${newBalance}`);
        }
        
        // 투자 신청 상태 업데이트
        const { error: updateError } = await supabase
            .from('investments')
            .update({ 
                status: newStatus,
                admin_note: note,
                processed_by: adminId,
                processed_at: new Date().toISOString()
            })
            .eq('id', investmentId);
        
        if (updateError) {
            console.error('투자 신청 업데이트 오류:', updateError);
            return res.status(500).json({ 
                success: false, 
                message: '투자 신청 처리 중 오류가 발생했습니다.' 
            });
        }
        
        console.log(`✅ 투자 신청 ${action === 'approve' ? '승인' : '거부'} 성공:`, investmentId);
        res.json({ 
            success: true, 
            message: `투자 신청이 ${action === 'approve' ? '승인' : '거부'}되었습니다.` 
        });
        
    } catch (error) {
        console.error('투자 신청 처리 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 테스트용 간단한 API 라우트
app.post('/api/test-route', (req, res) => {
    console.log('🧪 테스트 라우트 실행됨!');
    res.json({ success: true, message: '테스트 라우트 작동' });
});

// 입출금 신청 처리 API
app.post('/api/transaction', async (req, res) => {
    console.log('💳💳💳 트랜잭션 API 라우트 핸들러 진입!!! (미들웨어 제거됨)');
    console.log('💳 트랜잭션 API 요청 받음');
    console.log('💳 요청 본문:', req.body);
    console.log('💳 세션 사용자:', req.session.user);
    
    try {
        // 사용자 인증 확인
        let currentUser = req.session.user;
        
        if (!currentUser) {
            // 헤더에서 사용자 정보 확인
            const userHeader = req.headers['x-current-user'];
            if (userHeader) {
                try {
                    let user;
                    // Base64로 인코딩된 헤더인지 확인 후 디코딩
                    try {
                        const decodedBase64 = Buffer.from(userHeader, 'base64').toString('utf-8');
                        const decodedURI = decodeURIComponent(decodedBase64);
                        user = JSON.parse(decodedURI);
                    } catch (base64Error) {
                        // Base64 디코딩 실패시 기존 방식으로 시도
                        const decodedHeader = decodeURIComponent(userHeader);
                        user = JSON.parse(decodedHeader);
                    }
                    currentUser = user;
                    console.log('💳 헤더에서 사용자 정보 추출:', currentUser?.username);
                } catch (e) {
                    console.log('💳 헤더 파싱 오류:', e);
                }
            }
        }
        
        if (!currentUser) {
            console.log('💳 사용자 인증 실패 - 로그인 필요');
            return res.status(401).json({ 
                success: false, 
                message: '로그인이 필요합니다.' 
            });
        }
        
        console.log('💳 인증된 사용자:', currentUser.username);
        
        const { type, amount, bankTransferName, withdrawBankName, withdrawAccountNumber, withdrawAccountHolder } = req.body;
        const memberId = currentUser.id;
        
        console.log('💳 파싱된 데이터:', { type, amount, bankTransferName, withdrawBankName, withdrawAccountNumber, withdrawAccountHolder, memberId });
        
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
        console.log('🔍 관리자 트랜잭션 조회 API 호출됨');
        
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select(`
                *,
                member:members!transactions_member_id_fkey(name, username)
            `)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('관리자 트랜잭션 조회 오류:', error);
            return res.status(500).json({ 
                success: false, 
                message: '거래 내역 조회 중 오류가 발생했습니다.' 
            });
        }
        
        console.log('✅ 관리자 트랜잭션 조회 성공:', transactions?.length || 0, '건');
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

        // 백그라운드에서 초기화 작업 수행 (타임아웃 단축)
        const initTimeout = setTimeout(() => {
            console.warn('⚠️ 초기화 작업이 30초를 초과했습니다. 기본값으로 계속 진행합니다.');
        }, 30000);

        Promise.all([
            Promise.race([
                loadDataFromSupabase(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000))
            ]).catch(err => {
                console.warn('⚠️ Supabase 데이터 로드 실패:', err.message);
                return null;
            }),
            Promise.race([
                convertHtmlToEjs(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
            ]).catch(err => {
                console.warn('⚠️ HTML to EJS 변환 실패:', err.message);
                return null;
            }),
            Promise.race([
                ensureBasicAccounts(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
            ]).catch(err => {
                console.warn('⚠️ 기본 계정 생성 실패:', err.message);
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

// 에러 핸들링 (모든 라우트 정의 후에 위치)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('서버 오류가 발생했습니다.');
});

// 404 핸들링 (모든 라우트 정의 후에 위치)
app.use((req, res) => {
    console.log('🚫 404 - 페이지를 찾을 수 없음:', req.method, req.url);
    res.status(404).send('페이지를 찾을 수 없습니다.');
});

startServer();

module.exports = app;
