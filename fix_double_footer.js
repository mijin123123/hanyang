const fs = require('fs');
const path = require('path');

// 이중 푸터 문제가 있는 파일들
const files = [
    'views/faq.ejs',
    'views/announcements.ejs', 
    'views/inquiry_list.ejs'
];

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // 인라인 푸터가 있고 partials/footer include도 있는지 확인
        const hasInlineFooter = content.includes('<footer class="modern-footer">');
        const hasIncludeFooter = content.includes("include('partials/footer')");
        
        if (hasInlineFooter && hasIncludeFooter) {
            console.log(`Fixing ${file}...`);
            
            // 인라인 푸터 전체를 찾아서 제거하고 include로 교체
            const footerStart = content.indexOf('<footer class="modern-footer">');
            const footerEnd = content.indexOf('</footer>') + '</footer>'.length;
            
            if (footerStart !== -1 && footerEnd !== -1) {
                const beforeFooter = content.substring(0, footerStart);
                const afterFooter = content.substring(footerEnd);
                
                // partials/footer include가 이미 있다면 중복 제거
                const cleanAfterFooter = afterFooter.replace(/<%- include\('partials\/footer'\) %>/g, '');
                
                // 새로운 내용 생성
                const newContent = beforeFooter + "<%- include('partials/footer') %>" + cleanAfterFooter;
                
                fs.writeFileSync(filePath, newContent);
                console.log(`✅ Fixed ${file}`);
            }
        }
    } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
    }
});

console.log('Footer fix script completed!');
