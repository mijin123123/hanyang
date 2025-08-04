// 비밀번호 해시 계산기
// 이 파일을 실행하여 정확한 해시값을 얻을 수 있습니다.

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'hanyang_salt'); // 솔트 추가
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 비밀번호 해시 계산
async function calculateHashes() {
    const passwords = ['minj0010', 'admin123'];
    
    for (const password of passwords) {
        const hash = await hashPassword(password);
        console.log(`Password: ${password}`);
        console.log(`Hash: ${hash}`);
        console.log('---');
    }
}

// 실행
calculateHashes();
