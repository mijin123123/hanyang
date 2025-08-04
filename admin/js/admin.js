// 관리자 공통 JavaScript

// 관리자 계정 정보
const adminAccounts = {
    'minj0010': {
        id: 'minj0010',
        name: '김민정',
        role: 'admin',
        permissions: ['all']
    }
};

// 현재 로그인한 관리자 정보 가져오기
function getCurrentAdmin() {
    const adminId = localStorage.getItem('currentAdminId');
    return adminId ? adminAccounts[adminId] : null;
}

// 로그인 체크 함수
function checkAdminAuth() {
    const isLoggedIn = localStorage.getItem('adminLoggedIn');
    const loginTime = localStorage.getItem('adminLoginTime');
    
    if (!isLoggedIn || isLoggedIn !== 'true') {
        window.location.href = 'login.html';
        return false;
    }
    
    // 세션 만료 체크 (24시간)
    if (loginTime && (new Date().getTime() - parseInt(loginTime)) > 24 * 60 * 60 * 1000) {
        logout();
        return false;
    }
    
    return true;
}

// 로그아웃 함수
function logout() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminLoginTime');
    localStorage.removeItem('currentAdminId');
    window.location.href = 'login.html';
}

// 사이드바 토글 함수
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar && mainContent) {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    }
}

// 사이드바 토글
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
}

// 알림 표시 함수
function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    // 페이지 상단에 삽입
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.insertBefore(alertDiv, mainContent.firstChild);
        
        // 3초 후 제거
        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }
}

// 확인 다이얼로그
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// 파일 업로드 핸들러
function handleFileUpload(inputElement, previewElement) {
    inputElement.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // 파일 크기 체크 (5MB)
            if (file.size > 5 * 1024 * 1024) {
                showAlert('error', '파일 크기는 5MB를 초과할 수 없습니다.');
                return;
            }
            
            // 이미지 파일 체크
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    if (previewElement) {
                        previewElement.src = e.target.result;
                        previewElement.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
        }
    });
}

// 드래그 앤 드롭 파일 업로드
function setupDragDrop(dropZone, fileInput) {
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            // change 이벤트 트리거
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
        }
    });
    
    dropZone.addEventListener('click', function() {
        fileInput.click();
    });
}

// 테이블 검색 기능
function setupTableSearch(searchInput, table) {
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

// 페이지네이션 설정
function setupPagination(data, itemsPerPage, containerId, renderFunction) {
    let currentPage = 1;
    const totalPages = Math.ceil(data.length / itemsPerPage);
    
    function renderPage(page) {
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageData = data.slice(start, end);
        
        renderFunction(pageData);
        renderPaginationControls();
    }
    
    function renderPaginationControls() {
        const paginationContainer = document.getElementById(containerId);
        if (!paginationContainer) return;
        
        let html = '<div class="pagination">';
        
        // 이전 버튼
        html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">이전</button>`;
        
        // 페이지 번호들
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                html += `<button class="active">${i}</button>`;
            } else {
                html += `<button onclick="changePage(${i})">${i}</button>`;
            }
        }
        
        // 다음 버튼
        html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">다음</button>`;
        
        html += '</div>';
        paginationContainer.innerHTML = html;
    }
    
    window.changePage = function(page) {
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
            renderPage(currentPage);
        }
    };
    
    // 초기 렌더링
    renderPage(1);
}

// 데이터 정렬 기능
function sortTable(table, columnIndex, type = 'string') {
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const isAscending = table.dataset.sortDirection !== 'asc';
    
    rows.sort((a, b) => {
        const aValue = a.cells[columnIndex].textContent.trim();
        const bValue = b.cells[columnIndex].textContent.trim();
        
        let comparison = 0;
        
        if (type === 'number') {
            comparison = parseFloat(aValue) - parseFloat(bValue);
        } else if (type === 'date') {
            comparison = new Date(aValue) - new Date(bValue);
        } else {
            comparison = aValue.localeCompare(bValue);
        }
        
        return isAscending ? comparison : -comparison;
    });
    
    // 정렬된 행들을 다시 테이블에 추가
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
    
    // 정렬 방향 저장
    table.dataset.sortDirection = isAscending ? 'asc' : 'desc';
    
    // 헤더에 정렬 표시 업데이트
    const headers = table.querySelectorAll('th');
    headers.forEach((header, index) => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (index === columnIndex) {
            header.classList.add(isAscending ? 'sort-asc' : 'sort-desc');
        }
    });
}

// 폼 유효성 검사
function validateForm(formElement) {
    const requiredFields = formElement.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        const value = field.value.trim();
        const errorElement = field.parentNode.querySelector('.error-message');
        
        if (!value) {
            isValid = false;
            field.classList.add('error');
            if (errorElement) {
                errorElement.textContent = '이 필드는 필수입니다.';
                errorElement.style.display = 'block';
            }
        } else {
            field.classList.remove('error');
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }
    });
    
    return isValid;
}

// AJAX 요청 헬퍼
function makeRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        
        if (method === 'POST' && data) {
            xhr.setRequestHeader('Content-Type', 'application/json');
        }
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            }
        };
        
        xhr.onerror = function() {
            reject(new Error('네트워크 오류가 발생했습니다.'));
        };
        
        if (data && method === 'POST') {
            xhr.send(JSON.stringify(data));
        } else {
            xhr.send();
        }
    });
}

// 로컬 스토리지 관리
const storage = {
    set: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('로컬 스토리지 저장 실패:', e);
        }
    },
    
    get: function(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('로컬 스토리지 읽기 실패:', e);
            return null;
        }
    },
    
    remove: function(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('로컬 스토리지 삭제 실패:', e);
        }
    }
};

// 이미지 리사이즈 함수
function resizeImage(file, maxWidth, maxHeight, quality = 0.8) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // 원본 크기
            const { width, height } = img;
            
            // 새로운 크기 계산
            let newWidth = width;
            let newHeight = height;
            
            if (width > maxWidth) {
                newWidth = maxWidth;
                newHeight = (height * maxWidth) / width;
            }
            
            if (newHeight > maxHeight) {
                newHeight = maxHeight;
                newWidth = (newWidth * maxHeight) / newHeight;
            }
            
            // 캔버스 크기 설정
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            // 이미지 그리기
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            
            // Blob으로 변환
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 사이드바 네비게이션 활성화
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
    
    // 모바일에서 사이드바 외부 클릭 시 닫기
    document.addEventListener('click', function(e) {
        const sidebar = document.querySelector('.sidebar');
        const toggle = document.querySelector('.sidebar-toggle');
        
        if (window.innerWidth <= 768 && 
            !sidebar.contains(e.target) && 
            !toggle.contains(e.target) && 
            sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });
});
