// 입출금 페이지 기능

// 탭 전환 함수
function switchTab(tabType) {
    const depositTab = document.getElementById('depositTab');
    const withdrawTab = document.getElementById('withdrawTab');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    // 모든 탭 버튼 비활성화
    tabBtns.forEach(btn => btn.classList.remove('active'));
    
    if (tabType === 'deposit') {
        depositTab.style.display = 'block';
        withdrawTab.style.display = 'none';
        document.querySelector('.tab-btn:first-child').classList.add('active');
    } else {
        depositTab.style.display = 'none';
        withdrawTab.style.display = 'block';
        document.querySelector('.tab-btn:last-child').classList.add('active');
    }
}

// 숫자 포맷팅 함수
function formatNumber(input) {
    let value = input.value.replace(/[^0-9]/g, '');
    if (value) {
        value = parseInt(value).toLocaleString();
        input.value = value;
    }
}

// 계좌번호 포맷팅 함수
function formatAccountNumber(input) {
    let value = input.value.replace(/[^0-9]/g, '');
    input.value = value;
}

// 폼 제출 처리
function handleFormSubmit(formType) {
    // getCurrentUser 함수가 정의되지 않은 경우를 대비
    let user;
    if (typeof getCurrentUser === 'function') {
        user = getCurrentUser();
    } else {
        // 직접 로컬스토리지에서 가져오기
        const userData = localStorage.getItem('currentUser');
        user = userData ? JSON.parse(userData) : null;
    }
    
    if (!user) {
        alert('로그인이 필요합니다.');
        return false;
    }
    
    let formData;
    if (formType === 'deposit') {
        const form = document.getElementById('depositForm');
        formData = new FormData(form);
        
        // 입금 신청 처리
        const requestData = {
            type: 'deposit',
            amount: formData.get('depositAmount'),
            bank: formData.get('depositBank'),
            accountNumber: formData.get('depositAccountNumber'),
            accountHolder: formData.get('depositAccountHolder'),
            memo: formData.get('depositMemo'),
            requestDate: new Date().toISOString(),
            status: 'pending',
            username: user.username
        };
        
        // 로컬 스토리지에 저장 (실제로는 서버로 전송)
        saveRequest(requestData);
        alert('입금 신청이 완료되었습니다.');
        form.reset();
        
    } else {
        const form = document.getElementById('withdrawForm');
        formData = new FormData(form);
        
        // 출금 신청 처리
        const requestData = {
            type: 'withdraw',
            amount: formData.get('withdrawAmount'),
            bank: formData.get('withdrawBank'),
            accountNumber: formData.get('withdrawAccountNumber'),
            accountHolder: formData.get('withdrawAccountHolder'),
            reason: formData.get('withdrawReason'),
            memo: formData.get('withdrawMemo'),
            requestDate: new Date().toISOString(),
            status: 'pending',
            username: user.username
        };
        
        // 로컬 스토리지에 저장 (실제로는 서버로 전송)
        saveRequest(requestData);
        alert('출금 신청이 완료되었습니다.');
        form.reset();
    }
    
    // 신청 내역 업데이트
    loadRequestHistory();
    return false;
}

// 신청 내역 저장
function saveRequest(requestData) {
    let requests = JSON.parse(localStorage.getItem('withdrawRequests') || '[]');
    requests.push(requestData);
    localStorage.setItem('withdrawRequests', JSON.stringify(requests));
}

// 신청 내역 불러오기
function loadRequestHistory() {
    // getCurrentUser 함수가 정의되지 않은 경우를 대비
    let user;
    if (typeof getCurrentUser === 'function') {
        user = getCurrentUser();
    } else {
        // 직접 로컬스토리지에서 가져오기
        const userData = localStorage.getItem('currentUser');
        user = userData ? JSON.parse(userData) : null;
    }
    
    if (!user) return;
    
    const requests = JSON.parse(localStorage.getItem('withdrawRequests') || '[]');
    const userRequests = requests.filter(req => req.username === user.username);
    const tableBody = document.getElementById('requestHistoryTable');
    
    if (userRequests.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="no-data">신청 내역이 없습니다.</td></tr>';
        return;
    }
    
    tableBody.innerHTML = userRequests.map(req => {
        const amount = parseInt(req.amount).toLocaleString();
        const date = new Date(req.requestDate).toLocaleDateString();
        const statusText = req.status === 'pending' ? '대기중' : 
                          req.status === 'approved' ? '승인' : '거절';
        const statusClass = req.status === 'pending' ? 'status-pending' : 
                           req.status === 'approved' ? 'status-approved' : 'status-rejected';
        
        return `
            <tr>
                <td>${date}</td>
                <td>${req.type === 'deposit' ? '입금' : '출금'}</td>
                <td>${amount}원</td>
                <td>${getBankName(req.bank)}</td>
                <td>${req.accountNumber}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
            </tr>
        `;
    }).join('');
}

// 은행 코드를 이름으로 변환
function getBankName(bankCode) {
    const banks = {
        'kb': '국민은행',
        'shinhan': '신한은행',
        'woori': '우리은행',
        'nh': '농협은행',
        'hana': '하나은행',
        'ibk': '기업은행',
        'sc': 'SC제일은행',
        'citi': '한국씨티은행'
    };
    return banks[bankCode] || bankCode;
}

document.addEventListener('DOMContentLoaded', function() {
    // 로그인 상태 확인 및 신청 내역 로드
    let user;
    if (typeof getCurrentUser === 'function') {
        user = getCurrentUser();
    } else {
        // 직접 로컬스토리지에서 가져오기
        const userData = localStorage.getItem('currentUser');
        user = userData ? JSON.parse(userData) : null;
    }
    
    if (user) {
        loadRequestHistory();
    }
    
    // 입금액 입력 시 포맷팅
    const depositAmount = document.getElementById('depositAmount');
    if (depositAmount) {
        depositAmount.addEventListener('input', function() {
            formatNumber(this);
        });
    }
    
    // 출금액 입력 시 포맷팅
    const withdrawAmount = document.getElementById('withdrawAmount');
    if (withdrawAmount) {
        withdrawAmount.addEventListener('input', function() {
            formatNumber(this);
        });
    }
    
    // 계좌번호 입력 시 포맷팅
    const accountInputs = document.querySelectorAll('input[name*="AccountNumber"]');
    accountInputs.forEach(input => {
        input.addEventListener('input', function() {
            formatAccountNumber(this);
        });
    });
    
    // 폼 제출 이벤트
    const depositForm = document.getElementById('depositForm');
    if (depositForm) {
        depositForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleFormSubmit('deposit');
        });
    }
    
    const withdrawForm = document.getElementById('withdrawForm');
    if (withdrawForm) {
        withdrawForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleFormSubmit('withdraw');
        });
    }
    
    // 로그인 버튼 클릭 시 현재 페이지 URL 전달
    const loginBtns = document.querySelectorAll('.login-btn');
    loginBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const currentUrl = encodeURIComponent(window.location.href);
            window.location.href = `/login?redirect=${currentUrl}`;
        });
    });
});
