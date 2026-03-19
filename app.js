// Configuration
const API_BASE = "http://localhost/fraud-shield/api";
let transactions = [];
let alerts = [];
let charts = {};
let chartData = null;
let autoRefreshInterval = 3000;
let refreshTimer;
let soundEnabled = true;
let selectedTransaction = null;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard initializing...');
    
    // Initialize charts after a tiny delay to ensure DOM is ready
    setTimeout(() => {
        initCharts();
        loadAllData();
        startAutoRefresh();
    }, 100);
});

// Load all data
async function loadAllData() {
    console.log('📊 Loading all data...');
    await Promise.all([
        loadTransactions(),
        loadAlerts(),
        loadStats(),
        loadChartData()
    ]);
}

// Load transactions
async function loadTransactions() {
    try {
        const response = await fetch(`${API_BASE}/get_transactions.php`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        transactions = Array.isArray(data) ? data : [];
        renderTransactions();
        
    } catch (error) {
        console.error('Failed to load transactions:', error);
        showTransactionsError();
    }
}

// Show error in transactions table
function showTransactionsError() {
    const tbody = document.querySelector("#transactionsTable tbody");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 30px; color: #ef4444;">
                    <i class="fas fa-exclamation-circle" style="font-size: 40px; margin-bottom: 10px;"></i>
                    <div>Failed to load transactions</div>
                </td>
            </tr>
        `;
    }
}

// Load alerts
async function loadAlerts() {
    try {
        const response = await fetch(`${API_BASE}/get_alerts.php`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        alerts = Array.isArray(data) ? data : [];
        renderAlerts();
        document.getElementById('alertCount').textContent = alerts.length;
        
    } catch (error) {
        console.error('Failed to load alerts:', error);
        showAlertsError();
    }
}

// Show error in alerts
function showAlertsError() {
    const list = document.getElementById('alertsList');
    if (list) {
        list.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #999;">
                <i class="fas fa-bell-slash" style="font-size: 40px; margin-bottom: 10px;"></i>
                <div>Failed to load alerts</div>
            </div>
        `;
    }
}

// Load real statistics
async function loadStats() {
    try {
        console.log('📊 Loading stats from get_stats.php...');
        const response = await fetch(`${API_BASE}/get_stats.php`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Stats response:', data);
        
        if (data.success && data.overall) {
            // Update stats cards with REAL totals
            document.getElementById('totalTransactions').textContent = data.overall.total || 0;
            document.getElementById('allowedTransactions').textContent = data.overall.allowed || 0;
            document.getElementById('suspiciousTransactions').textContent = data.overall.suspicious || 0;
            document.getElementById('blockedTransactions').textContent = data.overall.blocked || 0;
            
            // Update trend indicators
            document.getElementById('totalTrend').innerHTML = `
                <i class="fas fa-database"></i> <span>${data.overall.total} total</span>
            `;
            
            document.getElementById('allowedTrend').innerHTML = `
                <i class="fas fa-arrow-up trend-up"></i> <span>${data.overall.allowed_percentage || 0}%</span>
            `;
            
            document.getElementById('suspiciousTrend').innerHTML = `
                <i class="fas fa-chart-line"></i> <span>${data.overall.suspicious_percentage || 0}%</span>
            `;
            
            document.getElementById('blockedTrend').innerHTML = `
                <i class="fas fa-arrow-down trend-down"></i> <span>${data.overall.blocked_percentage || 0}%</span>
            `;
            
            console.log('✅ Stats loaded:', data.overall);
        } else {
            console.warn('Stats data not in expected format:', data);
            // Fallback to transaction count
            updateStatsFromTransactions();
        }
    } catch (error) {
        console.error('❌ Failed to load stats:', error);
        // Fallback to transaction count
        updateStatsFromTransactions();
    }
}

// Fallback function to update stats from transactions array
function updateStatsFromTransactions() {
    if (!transactions || transactions.length === 0) return;
    
    const total = transactions.length;
    const allowed = transactions.filter(t => t.status === 'allowed').length;
    const suspicious = transactions.filter(t => t.status === 'suspicious').length;
    const blocked = transactions.filter(t => t.status === 'blocked').length;
    
    document.getElementById('totalTransactions').textContent = total;
    document.getElementById('allowedTransactions').textContent = allowed;
    document.getElementById('suspiciousTransactions').textContent = suspicious;
    document.getElementById('blockedTransactions').textContent = blocked;
    
    console.log('📊 Stats updated from transactions (fallback):', {total, allowed, suspicious, blocked});
}
// Store current transaction waiting for approval
let pendingTransaction = null;

// Modified simulateTransaction function
async function simulateTransaction() {
    try {
        const response = await fetch(`${API_BASE}/process_transaction.php`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.requires_approval) {
            // Show popup for user to decide
            pendingTransaction = data;
            showApprovalPopup(data);
        } else {
            // Normal transaction processing
            await loadAllData();
            showNotification(`Transaction ${data.status}`, data.status);
        }
    } catch (error) {
        console.error('Simulation error:', error);
    }
}

// Show approval popup
function showApprovalPopup(data) {
    const modal = document.getElementById('approvalModal');
    const message = document.getElementById('approvalMessage');
    
    message.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #f97316; margin-bottom: 15px;"></i>
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">
            KES ${Number(data.amount).toLocaleString()}
        </div>
        <div style="margin-bottom: 5px;">Location: ${data.location}</div>
        <div style="color: #666;">Did you make this transaction?</div>
    `;
    
    modal.style.display = 'flex';
    
    // Auto-timeout after 60 seconds
    setTimeout(() => {
        if (pendingTransaction) {
            closeApprovalPopup();
            userRespond('no'); // Auto-block if no response
        }
    }, 60000);
}
// Store pending transaction for explanation
let pendingExplanation = null;

// Show explanation modal
function showExplanationModal(transactionId) {
    const transaction = transactions.find(t => t.id == transactionId);
    if (!transaction) return;
    
    pendingExplanation = transaction;
    
    fetch(`${API_BASE}/get_explanation.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            transaction_id: transaction.id,
            amount: transaction.amount,
            location: transaction.location,
            device_id: transaction.device_id,
            risk_score: transaction.risk_score,
            status: transaction.status
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderExplanation(data.explanation);
        } else {
            showNotification('Failed to load explanation', 'error');
        }
    })
    .catch(error => {
        console.error('Explanation error:', error);
        showFallbackExplanation(transaction);
    });
}

// Render explanation in modal
function renderExplanation(explanation) {
    const modal = document.getElementById('explanationModal');
    const content = document.getElementById('explanationContent');
    const factorsDiv = document.getElementById('explanationFactors');
    
    // Summary
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 20px; font-weight: bold; color: #333; margin-bottom: 10px;">
                ${explanation.summary}
            </div>
            <div style="color: #666; font-size: 14px;">
                Confidence: ${(explanation.confidence * 100).toFixed(0)}% • 
                Risk Score: ${(explanation.risk_score * 100).toFixed(0)}%
            </div>
        </div>
    `;
    
    // Factors
    let factorsHtml = '';
    explanation.factors.forEach((factor, index) => {
        const riskClass = factor.impact > 0.6 ? 'high-risk' : (factor.impact > 0.3 ? 'medium-risk' : 'low-risk');
        const delay = index * 0.1;
        
        factorsHtml += `
            <div class="factor-item ${riskClass}" style="animation-delay: ${delay}s">
                <div class="factor-header">
                    <div class="factor-icon ${riskClass}">
                        <i class="fas ${getFactorIcon(factor.feature)}"></i>
                    </div>
                    <div class="factor-title">${factor.title}</div>
                </div>
                <div class="factor-description">
                    ${factor.description}
                </div>
                <div class="factor-impact">
                    <span style="color: #666;">Impact on decision:</span>
                    <div class="impact-bar">
                        <div class="impact-fill ${riskClass}" style="width: ${factor.impact * 100}%"></div>
                    </div>
                    <span class="impact-value">${(factor.impact * 100).toFixed(0)}%</span>
                </div>
            </div>
        `;
    });
    
    // Learning message
    factorsHtml += `
        <div class="learning-badge">
            <i class="fas fa-robot"></i>
            <div>
                <strong>AI Learning Enabled</strong><br>
                Your response will help improve future predictions
            </div>
        </div>
    `;
    
    factorsDiv.innerHTML = factorsHtml;
    modal.style.display = 'flex';
}

// Get icon for factor
function getFactorIcon(feature) {
    const icons = {
        'amount': 'fa-coins',
        'location': 'fa-map-marker-alt',
        'device': 'fa-mobile-alt',
        'time': 'fa-clock',
        'velocity': 'fa-tachometer-alt',
        'pattern': 'fa-chart-line'
    };
    return icons[feature] || 'fa-circle';
}

// Fallback explanation if API fails
function showFallbackExplanation(transaction) {
    const modal = document.getElementById('explanationModal');
    const content = document.getElementById('explanationContent');
    const factorsDiv = document.getElementById('explanationFactors');
    
    const riskScore = transaction.risk_score || 0.5;
    
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 20px; font-weight: bold; color: #333;">
                Transaction Risk Analysis
            </div>
        </div>
    `;
    
    let factors = [];
    
    // Amount factor
    if (transaction.amount > 5000) {
        factors.push({
            title: 'High Amount',
            description: `KES ${transaction.amount.toLocaleString()} is above your typical transaction amount`,
            impact: 0.5,
            feature: 'amount',
            riskClass: transaction.amount > 10000 ? 'high-risk' : 'medium-risk'
        });
    }
    
    // Location factor
    if (transaction.location !== 'Nairobi') {
        factors.push({
            title: 'Unusual Location',
            description: `${transaction.location} is not your usual transaction location`,
            impact: 0.3,
            feature: 'location',
            riskClass: 'medium-risk'
        });
    }
    
    // Device factor
    if (transaction.device_id && !transaction.device_id.includes('known')) {
        factors.push({
            title: 'New Device',
            description: `This device hasn't been used for transactions before`,
            impact: 0.4,
            feature: 'device',
            riskClass: 'medium-risk'
        });
    }
    
    // Time factor
    const hour = new Date(transaction.created_at).getHours();
    if (hour < 6 || hour > 22) {
        factors.push({
            title: 'Unusual Time',
            description: `Transaction at ${hour}:00 is outside your normal hours`,
            impact: 0.2,
            feature: 'time',
            riskClass: 'low-risk'
        });
    }
    
    let factorsHtml = '';
    factors.forEach((factor, index) => {
        const delay = index * 0.1;
        factorsHtml += `
            <div class="factor-item ${factor.riskClass}" style="animation-delay: ${delay}s">
                <div class="factor-header">
                    <div class="factor-icon ${factor.riskClass}">
                        <i class="fas ${getFactorIcon(factor.feature)}"></i>
                    </div>
                    <div class="factor-title">${factor.title}</div>
                </div>
                <div class="factor-description">${factor.description}</div>
                <div class="factor-impact">
                    <span>Impact:</span>
                    <div class="impact-bar">
                        <div class="impact-fill ${factor.riskClass}" style="width: ${factor.impact * 100}%"></div>
                    </div>
                    <span class="impact-value">${(factor.impact * 100).toFixed(0)}%</span>
                </div>
            </div>
        `;
    });
    
    factorsDiv.innerHTML = factorsHtml;
    modal.style.display = 'flex';
}

// Close explanation modal
function closeExplanationModal() {
    document.getElementById('explanationModal').style.display = 'none';
    pendingExplanation = null;
}

// UPDATED userRespond function - with learning
async function userRespond(response) {
    if (!pendingTransaction) return;
    
    const transactionId = pendingTransaction.transaction_id;
    const amount = pendingTransaction.amount;
    const location = pendingTransaction.location;
    const device = pendingTransaction.device_id;
    
    try {
        const res = await fetch(`${API_BASE}/user_respond.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transaction_id: transactionId,
                response: response,
                amount: amount,
                location: location,
                device: device
            })
        });
        
        const data = await res.json();
        
        if (data.success) {
            closeApprovalPopup();
            await loadAllData();
            
            if (response === 'yes') {
                showNotification('✅ Transaction approved - AI will learn from this', 'success');
            } else {
                showNotification('🚫 Transaction blocked - Device blacklisted', 'warning');
            }
            
            // Show explanation after response
            setTimeout(() => {
                showExplanationModal(transactionId);
            }, 500);
        }
    } catch (error) {
        console.error('Response error:', error);
        showNotification('Failed to process response', 'error');
    } finally {
        pendingTransaction = null;
    }
}

// Close approval popup
function closeApprovalPopup() {
    document.getElementById('approvalModal').style.display = 'none';
}

// UPDATED simulateTransaction function
async function simulateTransaction() {
    const btn = event.target.closest('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE}/process_transaction.php`, {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        
        const data = await response.json();
        
        if (data.requires_approval) {
            // Show popup for user to decide
            pendingTransaction = data;
            showApprovalPopup(data);
        } else if (data.success) {
            await loadAllData();
            
            let message = `Transaction ${data.status}`;
            if (data.risk_score) {
                message += ` with ${(data.risk_score * 100).toFixed(0)}% risk`;
            }
            
            showNotification(message, 
                data.status === 'allowed' ? 'success' : 
                data.status === 'suspicious' ? 'warning' : 'error');
            
            // Show explanation for suspicious/blocked
            if (data.status !== 'allowed') {
                setTimeout(() => {
                    showExplanationModal(data.transaction_id);
                }, 1000);
            }
        }
        
    } catch (error) {
        console.error('Simulation error:', error);
        showNotification('Failed to simulate transaction', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Export functions
window.showExplanationModal = showExplanationModal;
window.closeExplanationModal = closeExplanationModal;
window.userRespond = userRespond;
window.closeApprovalPopup = closeApprovalPopup;

// Add to window object
window.userRespond = userRespond;
window.closeApprovalPopup = closeApprovalPopup;

// Load chart data
async function loadChartData() {
    try {
        const response = await fetch(`${API_BASE}/get_chart_data.php`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        chartData = data;
        updateCharts();
        console.log('✅ Chart data loaded');
        
    } catch (error) {
        console.error('Failed to load chart data:', error);
        // Fallback to transaction data
        generateChartDataFromTransactions();
    }
}

// Initialize charts
function initCharts() {
    console.log('📈 Initializing charts...');
    
    try {
        // Status Distribution Chart
        const statusCanvas = document.getElementById('statusChart');
        if (statusCanvas) {
            const statusCtx = statusCanvas.getContext('2d');
            
            if (charts.status) {
                charts.status.destroy();
            }
            
            charts.status = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Allowed', 'Suspicious', 'Blocked'],
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: ['#22c55e', '#f97316', '#ef4444'],
                        borderWidth: 0,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    cutout: '65%',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
            console.log('✅ Status chart initialized');
        }
        
        // Risk Trend Chart
        const trendCanvas = document.getElementById('trendChart');
        if (trendCanvas) {
            const trendCtx = trendCanvas.getContext('2d');
            
            if (charts.trend) {
                charts.trend.destroy();
            }
            
            charts.trend = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Risk Score',
                        data: [],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Risk: ${(context.raw * 100).toFixed(0)}%`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 1,
                            grid: { display: false },
                            ticks: {
                                callback: function(value) {
                                    return (value * 100) + '%';
                                },
                                font: { size: 8 }
                            }
                        },
                        x: { display: false }
                    },
                    elements: {
                        line: { borderWidth: 1 }
                    }
                }
            });
            console.log('✅ Trend chart initialized');
        }
        
        // Location Chart
        const locationCanvas = document.getElementById('locationChart');
        if (locationCanvas) {
            const locationCtx = locationCanvas.getContext('2d');
            
            if (charts.location) {
                charts.location.destroy();
            }
            
            charts.location = new Chart(locationCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Transactions',
                        data: [],
                        backgroundColor: '#764ba2',
                        borderRadius: 4,
                        barPercentage: 0.6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Count: ${context.raw}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { display: false },
                            ticks: {
                                stepSize: 1,
                                font: { size: 8 }
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: {
                                font: { size: 8 },
                                maxRotation: 0
                            }
                        }
                    }
                }
            });
            console.log('✅ Location chart initialized');
        }
    } catch (error) {
        console.error('❌ Error initializing charts:', error);
    }
}

// Update charts with data
function updateCharts() {
    if (!charts.status || !charts.trend || !charts.location) {
        console.log('Charts not ready yet');
        return;
    }
    
    try {
        // Update Status Chart
        if (chartData && chartData.status_distribution) {
            charts.status.data.datasets[0].data = chartData.status_distribution.data || [0, 0, 0];
            charts.status.update();
            console.log('✅ Status chart updated:', chartData.status_distribution.data);
        } else {
            generateChartDataFromTransactions();
        }
        
        // Update Trend Chart
        if (chartData && chartData.risk_trend) {
            charts.trend.data.labels = chartData.risk_trend.labels || [];
            charts.trend.data.datasets[0].data = chartData.risk_trend.data || [];
            charts.trend.update();
            console.log('✅ Trend chart updated');
        } else {
            generateChartDataFromTransactions();
        }
        
        // Update Location Chart
        if (chartData && chartData.location_analysis) {
            charts.location.data.labels = chartData.location_analysis.labels || [];
            charts.location.data.datasets[0].data = chartData.location_analysis.counts || [];
            charts.location.update();
            console.log('✅ Location chart updated');
        } else {
            generateChartDataFromTransactions();
        }
        
    } catch (error) {
        console.error('❌ Error updating charts:', error);
    }
}

// Generate chart data from transactions (fallback)
function generateChartDataFromTransactions() {
    if (!transactions || transactions.length === 0) {
        console.log('No transactions for fallback charts');
        return;
    }
    
    try {
        console.log('Using fallback chart data from transactions');
        
        // Status distribution
        const allowed = transactions.filter(t => t.status === 'allowed').length;
        const suspicious = transactions.filter(t => t.status === 'suspicious').length;
        const blocked = transactions.filter(t => t.status === 'blocked').length;
        
        if (charts.status) {
            charts.status.data.datasets[0].data = [allowed, suspicious, blocked];
            charts.status.update();
        }
        
        // Risk trend (last 10)
        const recentTx = transactions.slice(0, 10).reverse();
        if (charts.trend && recentTx.length > 0) {
            charts.trend.data.labels = recentTx.map((_, i) => `#${i + 1}`);
            charts.trend.data.datasets[0].data = recentTx.map(t => parseFloat(t.risk_score) || 0);
            charts.trend.update();
        }
        
        // Location analysis
        const locations = {};
        transactions.slice(0, 20).forEach(tx => {
            if (tx.location && tx.location !== 'Unknown') {
                locations[tx.location] = (locations[tx.location] || 0) + 1;
            }
        });
        
        if (charts.location && Object.keys(locations).length > 0) {
            charts.location.data.labels = Object.keys(locations);
            charts.location.data.datasets[0].data = Object.values(locations);
            charts.location.update();
        }
        
    } catch (error) {
        console.error('❌ Error generating fallback chart data:', error);
    }
}

// Render transactions
function renderTransactions() {
    const tbody = document.querySelector("#transactionsTable tbody");
    if (!tbody) return;
    
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 30px; color: #999;">
                    <i class="fas fa-exchange-alt" style="font-size: 40px; margin-bottom: 10px;"></i>
                    <div>No transactions found</div>
                </td>
            </tr>
        `;
        return;
    }
    
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    const filtered = transactions.filter(tx => 
        tx.id?.toString().includes(searchTerm) ||
        tx.amount?.toString().includes(searchTerm) ||
        (tx.location && tx.location.toLowerCase().includes(searchTerm)) ||
        (tx.status && tx.status.toLowerCase().includes(searchTerm))
    );
    
    tbody.innerHTML = filtered.map(tx => {
        const riskScore = parseFloat(tx.risk_score) || 0;
        const riskClass = riskScore < 0.3 ? 'low' : (riskScore < 0.7 ? 'medium' : 'high');
        
        return `
            <tr onclick="showTransactionModal(${tx.id})">
                <td><strong>#${tx.id || 'N/A'}</strong></td>
                <td><strong>KES ${Number(tx.amount || 0).toLocaleString()}</strong></td>
                <td><i class="fas fa-map-marker-alt" style="color: #667eea;"></i> ${tx.location || 'Unknown'}</td>
                <td><i class="fas fa-mobile-alt" style="color: #764ba2;"></i> ${shortenDevice(tx.device_id) || 'Unknown'}</td>
                <td><span class="status-badge-small status-${tx.status || 'unknown'}">${tx.status || 'unknown'}</span></td>
                <td>
                    <div class="risk-bar">
                        <div class="risk-fill ${riskClass}" style="width: ${riskScore * 100}%"></div>
                    </div>
                    <small>${(riskScore * 100).toFixed(0)}%</small>
                </td>
                <td><small>${getTimeAgo(tx.created_at)}</small></td>
            </tr>
        `;
    }).join('');
}

// Render alerts
function renderAlerts() {
    const list = document.getElementById('alertsList');
    if (!list) return;
    
    if (!alerts || alerts.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #999;">
                <i class="fas fa-bell-slash" style="font-size: 40px; margin-bottom: 10px;"></i>
                <div>No alerts to display</div>
            </div>
        `;
        return;
    }
    
    list.innerHTML = alerts.map(alert => {
        const isBlocked = alert.message && alert.message.includes('BLOCKED');
        return `
            <div class="alert-item ${isBlocked ? 'blocked' : 'suspicious'}" onclick="showAlertDetails(${alert.id})">
                <div class="alert-icon ${isBlocked ? 'blocked' : 'suspicious'}">
                    <i class="fas ${isBlocked ? 'fa-ban' : 'fa-exclamation-triangle'}"></i>
                </div>
                <div class="alert-content">
                    <div class="alert-title">${alert.message || 'Alert'}</div>
                    <div class="alert-time">
                        <i class="far fa-clock"></i> ${getTimeAgo(alert.created_at)} • Transaction #${alert.transaction_id || 'N/A'}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Show transaction modal
function showTransactionModal(transactionId) {
    const transaction = transactions.find(t => t.id == transactionId);
    if (!transaction) return;
    
    selectedTransaction = transaction;
    
    const modal = document.getElementById('transactionModal');
    const content = document.getElementById('modalContent');
    
    content.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Transaction ID:</span>
            <span class="detail-value">#${transaction.id}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span class="detail-value">KES ${Number(transaction.amount).toLocaleString()}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Location:</span>
            <span class="detail-value">${transaction.location || 'Unknown'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Device:</span>
            <span class="detail-value">${transaction.device_id || 'Unknown'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="detail-value" style="color: ${
                transaction.status === 'allowed' ? '#22c55e' : 
                transaction.status === 'suspicious' ? '#f97316' : 
                '#ef4444'
            }">${transaction.status || 'Unknown'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Risk Score:</span>
            <span class="detail-value">${((transaction.risk_score || 0) * 100).toFixed(1)}%</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Time:</span>
            <span class="detail-value">${new Date(transaction.created_at).toLocaleString()}</span>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Close modal
function closeModal() {
    document.getElementById('transactionModal').style.display = 'none';
    selectedTransaction = null;
}

// Approve transaction
async function approveTransaction() {
    if (!selectedTransaction) return;
    
    try {
        const res = await fetch(`${API_BASE}/update_transaction.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: selectedTransaction.id,
                status: 'allowed'
            })
        });
        
        const data = await res.json();
        if (data.success) {
            showNotification('Transaction approved successfully', 'success');
            loadAllData();
            closeModal();
        }
    } catch (error) {
        showNotification('Failed to approve transaction', 'error');
    }
}

// Block transaction
async function blockTransaction() {
    if (!selectedTransaction) return;
    
    try {
        const res = await fetch(`${API_BASE}/update_transaction.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: selectedTransaction.id,
                status: 'blocked'
            })
        });
        
        const data = await res.json();
        if (data.success) {
            showNotification('Transaction blocked', 'warning');
            loadAllData();
            closeModal();
        }
    } catch (error) {
        showNotification('Failed to block transaction', 'error');
    }
}

// Simulate new transaction
async function simulateTransaction() {
    const btn = event.target.closest('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE}/process_transaction.php`, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            await loadAllData();
            showNotification(`Transaction ${data.status} with ${(data.risk_score * 100).toFixed(0)}% risk`, 
                data.status === 'allowed' ? 'success' : 
                data.status === 'suspicious' ? 'warning' : 'error');
        }
        
    } catch (error) {
        console.error('Simulation error:', error);
        showNotification('Failed to simulate transaction', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Export data
function exportData() {
    if (!transactions || transactions.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    const csv = [
        ['ID', 'Amount', 'Location', 'Device', 'Status', 'Risk Score', 'Time'],
        ...transactions.map(tx => [
            tx.id,
            tx.amount,
            tx.location,
            tx.device_id,
            tx.status,
            tx.risk_score,
            tx.created_at
        ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Data exported successfully', 'success');
}

// Filter transactions
function filterTransactions() {
    renderTransactions();
}

// Clear alerts
function clearAlerts() {
    alerts = [];
    renderAlerts();
    document.getElementById('alertCount').textContent = '0';
    showNotification('Alerts cleared', 'info');
}

// Set auto refresh interval
function setAutoRefresh(seconds) {
    autoRefreshInterval = seconds * 1000;
    clearInterval(refreshTimer);
    startAutoRefresh();
    showNotification(`Auto-refresh set to ${seconds}s`, 'info');
}

// Start auto refresh
function startAutoRefresh() {
    refreshTimer = setInterval(() => {
        loadAllData();
    }, autoRefreshInterval);
}

// Toggle sound
function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.querySelector('.action-btn.purple i');
    if (btn) {
        btn.className = soundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
    }
    showNotification(`Sound ${soundEnabled ? 'enabled' : 'disabled'}`, 'info');
}

// Show notification
function showNotification(message, type = 'info') {
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Show stats details
function showStatsDetails(type) {
    const count = document.getElementById(`${type}Transactions`).textContent;
    showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)}: ${count} transactions`, 'info');
}

// Show alert details
function showAlertDetails(alertId) {
    const alert = alerts.find(a => a.id == alertId);
    if (alert) {
        showNotification(`Alert: ${alert.message}`, 'warning');
    }
}

// Expand chart
function expandChart(chartType) {
    let message = '';
    switch(chartType) {
        case 'status':
            const allowed = charts.status?.data.datasets[0].data[0] || 0;
            const suspicious = charts.status?.data.datasets[0].data[1] || 0;
            const blocked = charts.status?.data.datasets[0].data[2] || 0;
            message = `Status Distribution - Allowed: ${allowed}, Suspicious: ${suspicious}, Blocked: ${blocked}`;
            break;
        case 'trend':
            message = 'Risk Trend - Showing last 10 transactions risk scores';
            break;
        case 'location':
            message = 'Location Analysis - Transaction distribution by location';
            break;
    }
    showNotification(message, 'info');
}

// Helper functions
function shortenDevice(device) {
    if (!device) return 'N/A';
    return device.length > 10 ? device.substr(0, 8) + '...' : device;
}

function getTimeAgo(timestamp) {
    if (!timestamp) return 'N/A';
    
    try {
        const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        return Math.floor(seconds / 86400) + 'd ago';
    } catch (e) {
        return 'N/A';
    }
}

// Refresh data manually
function refreshData() {
    loadAllData();
    showNotification('Data refreshed', 'info');
}

// Export functions globally
window.showTransactionModal = showTransactionModal;
window.closeModal = closeModal;
window.approveTransaction = approveTransaction;
window.blockTransaction = blockTransaction;
window.simulateTransaction = simulateTransaction;
window.refreshData = refreshData;
window.exportData = exportData;
window.setAutoRefresh = setAutoRefresh;
window.toggleSound = toggleSound;
window.filterTransactions = filterTransactions;
window.clearAlerts = clearAlerts;
window.showStatsDetails = showStatsDetails;
window.showAlertDetails = showAlertDetails;
window.expandChart = expandChart;