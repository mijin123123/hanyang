// 투자 수익률 계산기 스크립트
function formatNumber(input) {
    let value = input.value.replace(/[^0-9]/g, '');
    input.value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatRate(input) {
    input.value = input.value.replace(/[^0-9.]/g, '');
}

function parseAmount(value) {
    return parseInt(value.replace(/,/g, ''), 10) || 0;
}

function validateAmount() {
    const rawAmount = document.getElementById('investment').value;
    const rawRate = document.getElementById('rate').value;

    const amount = parseAmount(rawAmount);
    const rate = parseFloat(rawRate);

    if (isNaN(amount) || amount < 300) {
        resetProfits();
        return;
    }

    if (isNaN(rate) || rate <= 0) {
        resetProfits();
        return;
    }

    calculateProfit(amount, rate);
}

function calculateProfit(amount, rate) {
    const wonAmount = amount * 10000;
    const daily = Math.floor(wonAmount * (rate / 100));
    const weekly = daily * 7;
    const monthly = daily * 30;

    document.getElementById('dailyProfit').textContent = daily.toLocaleString() + '원';
    document.getElementById('weeklyProfit').textContent = weekly.toLocaleString() + '원';
    document.getElementById('monthlyProfit').textContent = monthly.toLocaleString() + '원';
}

function setAmount(amount) {
    document.getElementById('investment').value = amount.toLocaleString();
    validateAmount();
}

function toggleReset() {
    document.getElementById('investment').value = '';
    document.getElementById('rate').value = '';
    resetProfits();
}

function resetProfits() {
    document.getElementById('dailyProfit').textContent = '0원';
    document.getElementById('weeklyProfit').textContent = '0원';
    document.getElementById('monthlyProfit').textContent = '0원';
}

// 자동 초기 계산
window.addEventListener('DOMContentLoaded', validateAmount);
