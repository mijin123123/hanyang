const fs = require('fs');
const path = require('path');
const glob = require('glob');

// views 폴더의 모든 ejs 파일을 찾습니다
const ejsFiles = glob.sync('views/*.ejs', { cwd: __dirname });

console.log('Checking for double footer issues...\n');

let issuesFound = 0;

ejsFiles.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        
        const hasInlineFooter = content.includes('<footer class="modern-footer">');
        const hasIncludeFooter = content.includes("include('partials/footer')");
        
        if (hasInlineFooter && hasIncludeFooter) {
            console.log(`❌ ISSUE: ${file} has both inline footer and partials/footer include`);
            issuesFound++;
        } else if (hasInlineFooter) {
            console.log(`✅ OK: ${file} has inline footer only`);
        } else if (hasIncludeFooter) {
            console.log(`✅ OK: ${file} uses partials/footer only`);
        } else {
            console.log(`⚠️  WARNING: ${file} has no footer`);
        }
    } catch (error) {
        console.error(`❌ Error reading ${file}:`, error.message);
    }
});

console.log(`\n=== SUMMARY ===`);
console.log(`Issues found: ${issuesFound}`);
if (issuesFound === 0) {
    console.log('🎉 All footer issues have been resolved!');
} else {
    console.log('❌ Some issues still need to be fixed.');
}
