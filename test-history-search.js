// Test file for Enhanced History Search functionality
// This file can be run in the browser console to test the search functionality

// Test data for EAN search functionality
const testHistoryData = [
    {
        id: 1,
        desc: 'Produto A',
        coddv: '123456',
        barcode: '7891234567890',
        matricula: '12345',
        address: 'PG06.001.019.934',
        type: 'pulmao',
        validity: null,
        timestamp: '2024-12-22T10:00:00.000Z'
    },
    {
        id: 2,
        desc: 'Produto B',
        coddv: '123457',
        barcode: '7891234567891',
        matricula: '12346',
        address: 'PG06.001.019.935',
        type: 'separacao',
        validity: '01/26',
        timestamp: '2024-12-22T11:00:00.000Z'
    },
    {
        id: 3,
        desc: 'Produto C',
        coddv: '123458',
        barcode: null,
        matricula: '12347',
        address: 'PG06.001.019.936',
        type: 'pulmao',
        validity: null,
        timestamp: '2024-12-22T12:00:00.000Z'
    },
    {
        id: 4,
        desc: 'Produto D',
        coddv: '654321',
        barcode: '1234567890123',
        matricula: '54321',
        address: 'M205.001.001.001',
        type: 'separacao',
        validity: null,
        timestamp: '2024-12-22T13:00:00.000Z'
    }
];

// Test functions
function runEANSearchTests() {
    console.log('🧪 Running EAN Search Tests...');
    
    // Backup original data
    const originalHistoryData = window.historyData;
    window.historyData = testHistoryData;
    
    let testsPassed = 0;
    let totalTests = 0;
    
    // Test 1: Search partial EAN "789123" should return first two items
    totalTests++;
    console.log('\n📋 Test 1: Partial EAN search "789123"');
    
    // Simulate search input
    document.querySelector('#search-input').value = '789123';
    document.querySelector('input[name="searchType"][value="ean"]').checked = true;
    
    // Run filter
    filterHistory();
    
    // Check results (we'll check the DOM)
    const resultItems = document.querySelectorAll('#historico-list .historico-item');
    if (resultItems.length === 2) {
        console.log('✅ PASS: Found 2 items as expected');
        testsPassed++;
    } else {
        console.log(`❌ FAIL: Expected 2 items, found ${resultItems.length}`);
    }
    
    // Test 2: Search specific EAN "7890" should return first item only
    totalTests++;
    console.log('\n📋 Test 2: Specific EAN search "7890"');
    
    document.querySelector('#search-input').value = '7890';
    filterHistory();
    
    const resultItems2 = document.querySelectorAll('#historico-list .historico-item');
    if (resultItems2.length === 1) {
        console.log('✅ PASS: Found 1 item as expected');
        testsPassed++;
    } else {
        console.log(`❌ FAIL: Expected 1 item, found ${resultItems2.length}`);
    }
    
    // Test 3: Search with null barcode should handle gracefully
    totalTests++;
    console.log('\n📋 Test 3: Search non-existent EAN "999999"');
    
    document.querySelector('#search-input').value = '999999';
    filterHistory();
    
    const resultItems3 = document.querySelectorAll('#historico-list .historico-item');
    if (resultItems3.length === 0) {
        console.log('✅ PASS: No items found as expected');
        testsPassed++;
    } else {
        console.log(`❌ FAIL: Expected 0 items, found ${resultItems3.length}`);
    }
    
    // Test 4: Empty search should return all items
    totalTests++;
    console.log('\n📋 Test 4: Empty search should return all items');
    
    document.querySelector('#search-input').value = '';
    filterHistory();
    
    const resultItems4 = document.querySelectorAll('#historico-list .historico-item');
    if (resultItems4.length === testHistoryData.length) {
        console.log('✅ PASS: All items returned as expected');
        testsPassed++;
    } else {
        console.log(`❌ FAIL: Expected ${testHistoryData.length} items, found ${resultItems4.length}`);
    }
    
    // Restore original data
    window.historyData = originalHistoryData;
    
    console.log(`\n🏁 EAN Search Tests Complete: ${testsPassed}/${totalTests} passed`);
    return { passed: testsPassed, total: totalTests };
}

function runEnhancedAllSearchTests() {
    console.log('\n🧪 Running Enhanced "All" Search Tests...');
    
    // Backup original data
    const originalHistoryData = window.historyData;
    window.historyData = testHistoryData;
    
    let testsPassed = 0;
    let totalTests = 0;
    
    // Test 1: Search EAN with "all" filter should find items
    totalTests++;
    console.log('\n📋 Test 1: Search EAN "7891234567890" with "all" filter');
    
    document.querySelector('#search-input').value = '7891234567890';
    document.querySelector('input[name="searchType"][value="all"]').checked = true;
    
    filterHistory();
    
    const resultItems = document.querySelectorAll('#historico-list .historico-item');
    if (resultItems.length === 1) {
        console.log('✅ PASS: Found item by barcode in "all" search');
        testsPassed++;
    } else {
        console.log(`❌ FAIL: Expected 1 item, found ${resultItems.length}`);
    }
    
    // Test 2: Search description with "all" filter
    totalTests++;
    console.log('\n📋 Test 2: Search "Produto A" with "all" filter');
    
    document.querySelector('#search-input').value = 'Produto A';
    filterHistory();
    
    const resultItems2 = document.querySelectorAll('#historico-list .historico-item');
    if (resultItems2.length === 1) {
        console.log('✅ PASS: Found item by description in "all" search');
        testsPassed++;
    } else {
        console.log(`❌ FAIL: Expected 1 item, found ${resultItems2.length}`);
    }
    
    // Test 3: Search CODDV with "all" filter
    totalTests++;
    console.log('\n📋 Test 3: Search "123456" with "all" filter');
    
    document.querySelector('#search-input').value = '123456';
    filterHistory();
    
    const resultItems3 = document.querySelectorAll('#historico-list .historico-item');
    if (resultItems3.length === 1) {
        console.log('✅ PASS: Found item by CODDV in "all" search');
        testsPassed++;
    } else {
        console.log(`❌ FAIL: Expected 1 item, found ${resultItems3.length}`);
    }
    
    // Restore original data
    window.historyData = originalHistoryData;
    
    console.log(`\n🏁 Enhanced "All" Search Tests Complete: ${testsPassed}/${totalTests} passed`);
    return { passed: testsPassed, total: totalTests };
}

function runFilterSwitchingTests() {
    console.log('\n🧪 Running Filter Switching Tests...');
    
    // Backup original data
    const originalHistoryData = window.historyData;
    window.historyData = testHistoryData;
    
    let testsPassed = 0;
    let totalTests = 0;
    
    // Test 1: Switch filters with existing search term
    totalTests++;
    console.log('\n📋 Test 1: Switch from "all" to "ean" filter with search term');
    
    document.querySelector('#search-input').value = '789123';
    document.querySelector('input[name="searchType"][value="all"]').checked = true;
    filterHistory();
    
    const allResults = document.querySelectorAll('#historico-list .historico-item').length;
    
    // Switch to EAN filter
    document.querySelector('input[name="searchType"][value="ean"]').checked = true;
    filterHistory();
    
    const eanResults = document.querySelectorAll('#historico-list .historico-item').length;
    
    if (eanResults === 2 && document.querySelector('#search-input').value === '789123') {
        console.log('✅ PASS: Filter switching preserved search term and updated results');
        testsPassed++;
    } else {
        console.log(`❌ FAIL: Filter switching failed. EAN results: ${eanResults}, Search term: ${document.querySelector('#search-input').value}`);
    }
    
    // Restore original data
    window.historyData = originalHistoryData;
    
    console.log(`\n🏁 Filter Switching Tests Complete: ${testsPassed}/${totalTests} passed`);
    return { passed: testsPassed, total: totalTests };
}

// Main test runner
function runAllTests() {
    console.log('🚀 Starting Enhanced History Search Tests');
    console.log('==========================================');
    
    // Check if we're in the right context
    if (typeof filterHistory !== 'function') {
        console.error('❌ filterHistory function not found. Make sure you\'re running this in the app context.');
        return;
    }
    
    if (!document.querySelector('#search-input')) {
        console.error('❌ Search input not found. Make sure the history modal is open.');
        return;
    }
    
    const eanResults = runEANSearchTests();
    const allResults = runEnhancedAllSearchTests();
    const switchResults = runFilterSwitchingTests();
    
    const totalPassed = eanResults.passed + allResults.passed + switchResults.passed;
    const totalTests = eanResults.total + allResults.total + switchResults.total;
    
    console.log('\n🎯 FINAL RESULTS');
    console.log('================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalTests - totalPassed}`);
    console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
    
    if (totalPassed === totalTests) {
        console.log('🎉 All tests passed! The enhanced history search is working correctly.');
    } else {
        console.log('⚠️ Some tests failed. Please check the implementation.');
    }
}

// Instructions for running tests
console.log('📖 To run tests:');
console.log('1. Open the history modal in the app');
console.log('2. Run: runAllTests()');
console.log('3. Or run individual test suites:');
console.log('   - runEANSearchTests()');
console.log('   - runEnhancedAllSearchTests()');
console.log('   - runFilterSwitchingTests()');