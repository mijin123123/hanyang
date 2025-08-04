const fs = require('fs');
const path = require('path');

// 파일에서 .html 링크를 수정하는 함수
function fixHtmlLinks(filePath) {
    console.log(`Processing: ${filePath}`);
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        // href="/*" 패턴을 찾아서 수정
        const patterns = [
            { pattern: /href="([^"]+)\.html"/g, replacement: 'href="/$1"' },
            { pattern: /href="/"/g, replacement: 'href="/"' },
            { pattern: /window\.location\.href\s*=\s*['"](.*?)\.html['"]/g, replacement: 'window.location.href = "/$1"' },
            { pattern: /window\.location\.href\s*=\s*['"]index['"]/g, replacement: 'window.location.href = "/"' }
        ];
        
        patterns.forEach(({ pattern, replacement }) => {
            const originalContent = content;
            content = content.replace(pattern, replacement);
            if (content !== originalContent) {
                modified = true;
            }
        });
        
        // 특별한 경우들 처리
        content = content.replace(/href="\/index"/g, 'href="/"');
        content = content.replace(/href="#([^"]+)\.html"/g, 'href="#/$1"');
        
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✓ Fixed: ${filePath}`);
        } else {
            console.log(`- No changes needed: ${filePath}`);
        }
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
    }
}

// 디렉토리를 재귀적으로 탐색하는 함수
function processDirectory(dirPath, extensions) {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            // node_modules, .git 등은 제외
            if (!['node_modules', '.git', 'uploads'].includes(item)) {
                processDirectory(fullPath, extensions);
            }
        } else if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase();
            if (extensions.includes(ext)) {
                fixHtmlLinks(fullPath);
            }
        }
    });
}

// 메인 실행
const projectRoot = __dirname;
const extensionsToProcess = ['.ejs', '.js', '.html'];

console.log('Starting HTML link fixing process...');
console.log(`Root directory: ${projectRoot}`);
console.log(`Processing file types: ${extensionsToProcess.join(', ')}`);
console.log('---');

processDirectory(projectRoot, extensionsToProcess);

console.log('---');
console.log('HTML link fixing completed!');
