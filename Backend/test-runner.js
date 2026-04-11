const { execSync } = require('child_process');

try {
  console.log('🧪 Đang chạy Cart Controller Unit Tests...\n');
  
  const result = execSync('npm test -- cartController.unit.test.js', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  // Lấy các dòng cuối chứa kết quả tóm tắt
  const lines = result.split('\n');
  const summaryIndex = lines.findLastIndex(line => 
    line.includes('Test Suites:') || line.includes('Tests:')
  );
  
  if (summaryIndex !== -1) {
    console.log('\n' + '='.repeat(50));
    console.log('📊 KẾT QUẢ TEST:');
    console.log('='.repeat(50));
    
    // In 3-4 dòng cuối chứa kết quả
    for (let i = Math.max(0, summaryIndex - 1); i < lines.length; i++) {
      if (lines[i].trim()) {
        console.log(lines[i]);
      }
    }
  } else {
    // Nếu không tìm thấy summary, in toàn bộ
    console.log(result);
  }
  
} catch (error) {
  console.error('❌ Test failed:');
  console.error(error.stdout || error.message);
  process.exit(1);
}
