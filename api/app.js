// ============================================
// FRAUD SHIELD - WORKING DASHBOARD
// ============================================

const API_BASE = "http://localhost/fraud-shield/api";
let transactions = [];
let alerts = [];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard starting...');
    
    // Load all data immediately
    loadDashboardData();
    
    // Set up auto-refresh
    setInterval(loadDashboardData, 5000);
});

// Main function to load all data
function loadDashboardData() {
    console.log('Loading dashboard data...');
    
    // Load transactions
    fetch(API_BASE + '/get_transactions.php')
        .then(response => response.json())
        .then(data => {
            console.log('✅ Transactions loaded:', data.length);
            transactions = Array.isArray(data) ? data : [];
            displayTransactions();
            updateStats();
        })
        .catch(error => {
            console.error('❌ Error loading transactions:', error);
            document.querySelector("#transactionsTable tbody").innerHTML = `
                <tr><td colspan="7" style="text-align: center; color: red; padding: 30px;">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Connection error - but API is working! Check console.
                </td></tr>
            `;
        });
    
    // Load alerts
    fetch(API_BASE + '/get_alerts.php')
        .then(response => response.json())
        .then(data => {
            alerts = Array.isArray(data) ? data : [];
            displayAlerts();
            document.getElementById('alertCount').textContent = alerts.length;
        })
        .catch(error => console.error('Alert error:', error));
}

// Display transactions in table
function displayTransactions() {
    const tbody = document.querySelector("#transactionsTable tbody");
    if (!tbody) return;
    
    if (!transactions.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center;">No transactions</td></tr>`;
        return;
    }
    
    let html = '';
    transactions.slice(0, 15).forEach(tx => {
        const risk = (tx.risk_score || 0) * 100;
        const riskClass = risk < 30 ? 'low' : (risk < 70 ? 'medium' : 'high');
        
        html += `
            <tr onclick="showDetails(${tx.id})">
                <td>#${tx.id}</td>
                <td>KES ${Number(tx.amount).toLocaleString()}</td>
                <td>${tx.location || 'Unknown'}</td>
                <td>${(tx.device_id || 'Unknown').substring(0, 8)}...</td>
                <td><span class="status-badge-small status-${tx.status}">${tx.status}</span></td>
                <td>
                    <div class="risk-bar"><div class="risk-fill ${riskClass}" style="width: ${risk}%"></div></div>
                    <small>${risk.toFixed(0)}%</small>
                </td>
                <td>${timeAgo(tx.created_at)}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Display alerts
function displayAlerts() {
    const list = document.getElementById('alertsList');
    if (!list) return;
    
    if (!alerts.length) {
        list.innerHTML = '<div style="text-align: center; padding: 30px;">No alerts</div>';
        return;
    }
    
    let html = '';
    alerts.slice(0, 8).forEach(alert => {
        const isBlocked = alert.message?.includes('BLOCKED');
        html += `
            <div class="alert-item ${isBlocked ? 'blocked' : 'suspicious'}">
                <div class="alert-icon ${isBlocked ? 'blocked' : 'suspicious'}">
                    <i class="fas ${isBlocked ? 'fa-ban' : 'fa-exclamation-triangle'}"></i>
                </div>
                <div class="alert-content">
                    <div class="alert-title">${alert.message || 'Alert'}</div>
                    <div class="alert-time">${timeAgo(alert.created_at)}</div>
                </div>
            </div>
        `;
    });
    
    list.innerHTML = html;
}

// Update statistics cards
function updateStats() {
    if (!transactions.length) return;
    
    const total = transactions.length;
    const allowed = transactions.filter(t => t.status === 'allowed').length;
    const suspicious = transactions.filter(t => t.status === 'suspicious').length;
    const blocked = transactions.filter(t => t.status === 'blocked').length;
    
    document.getElementById('totalTransactions').textContent = total;
    document.getElementById('allowedTransactions').textContent = allowed;
    document.getElementById('suspiciousTransactions').textContent = suspicious;
    document.getElementById('blockedTransactions').textContent = blocked;
}

// Helper: time ago
function timeAgo(ts) {
    if (!ts) return 'N/A';
    try {
        const sec = Math.floor((new Date() - new Date(ts)) / 1000);
        if (sec < 60) return 'just now';
        if (sec < 3600) return Math.floor(sec/60) + 'm ago';
        if (sec < 86400) return Math.floor(sec/3600) + 'h ago';
        return Math.floor(sec/86400) + 'd ago';
    } catch (e) {
        return 'N/A';
    }
}

// Transaction details modal
function showDetails(id) {
    const tx = transactions.find(t => t.id == id);
    if (!tx) return;
    
    const content = document.getElementById('modalContent');
    content.innerHTML = `
        <div class="detail-row"><span>ID:</span><span>#${tx.id}</span></div>
        <div class="detail-row"><span>Amount:</span><span>KES ${Number(tx.amount).toLocaleString()}</span></div>
        <div class="detail-row"><span>Location:</span><span>${tx.location}</span></div>
        <div class="detail-row"><span>Device:</span><span>${tx.device_id}</span></div>
        <div class="detail-row"><span>Status:</span><span style="color:${tx.status === 'allowed'?'green':tx.status==='suspicious'?'orange':'red'}">${tx.status}</span></div>
        <div class="detail-row"><span>Risk:</span><span>${((tx.risk_score||0)*100).toFixed(1)}%</span></div>
        <div class="detail-row"><span>Time:</span><span>${new Date(tx.created_at).toLocaleString()}</span></div>
    `;
    
    document.getElementById('transactionModal').style.display = 'flex';
}

// Close modal
function closeModal() {
    document.getElementById('transactionModal').style.display = 'none';
}
// ============================================
// USER MENU FUNCTIONS - ADD THIS TO YOUR app.js
// ============================================

// User menu functions
window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }
};

window.viewProfile = function() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Create and show profile modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h2><i class="fas fa-user-circle" style="color: #667eea;"></i> My Profile</h2>
                <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div style="padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
                        <span style="color: white; font-size: 40px; font-weight: bold;">${(user.name || 'U').charAt(0).toUpperCase()}</span>
                    </div>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-user"></i> Name:</span>
                    <span class="detail-value">${user.name || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-envelope"></i> Email:</span>
                    <span class="detail-value">${user.email || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-tag"></i> Role:</span>
                    <span class="detail-value" style="text-transform: capitalize;">${user.role || 'user'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-face-smile"></i> Face Login:</span>
                    <span class="detail-value" style="color: ${user.face_enabled ? '#22c55e' : '#999'}">
                        ${user.face_enabled ? '✅ Enabled' : '❌ Disabled'}
                    </span>
                </div>
                
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button class="action-btn" onclick="this.closest('.modal').remove(); window.location.href='register_face.html'" style="flex: 1;">
                        <i class="fas fa-camera"></i> Setup Face
                    </button>
                    <button class="action-btn purple" onclick="this.closest('.modal').remove()" style="flex: 1;">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.faceSettings = function() {
    window.location.href = 'register_face.html';
};

window.viewSettings = function() {
    // Create settings modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header">
                <h2><i class="fas fa-cog" style="color: #667eea;"></i> Settings</h2>
                <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div style="padding: 20px;">
                <div style="margin-bottom: 25px;">
                    <h3 style="margin-bottom: 15px; color: #333;"><i class="fas fa-bell"></i> Notifications</h3>
                    <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <input type="checkbox" id="emailAlerts" checked> 
                        <span>Email Alerts</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <input type="checkbox" id="smsAlerts"> 
                        <span>SMS Alerts</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" id="browserAlerts" checked> 
                        <span>Browser Notifications</span>
                    </label>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <h3 style="margin-bottom: 15px; color: #333;"><i class="fas fa-shield"></i> Security</h3>
                    <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <input type="checkbox" id="twoFactor"> 
                        <span>Two-Factor Authentication</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" id="faceLogin" ${JSON.parse(localStorage.getItem('user') || '{}').face_enabled ? 'checked' : ''}> 
                        <span>Face Login</span>
                    </label>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <h3 style="margin-bottom: 15px; color: #333;"><i class="fas fa-chart-line"></i> Display</h3>
                    <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <select id="refreshRate" style="padding: 8px; border-radius: 5px; border: 1px solid #ddd;">
                            <option value="3">3 seconds</option>
                            <option value="5">5 seconds</option>
                            <option value="10">10 seconds</option>
                            <option value="30">30 seconds</option>
                        </select>
                        <span>Auto-refresh rate</span>
                    </label>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="action-btn" onclick="saveSettings(this)">
                        <i class="fas fa-save"></i> Save Settings
                    </button>
                    <button class="action-btn purple" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Set current refresh rate
    const currentRate = localStorage.getItem('refreshRate') || '3';
    document.getElementById('refreshRate').value = currentRate;
};
// ============================================
// ANALYTICS DASHBOARD - WORKING CHARTS
// ============================================

// Chart instances
let statusChart, trendChart, locationChart;

// Initialize charts when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing charts...');
    setTimeout(() => {
        initCharts();
        loadChartData();
    }, 300);
});

// Initialize all charts
function initCharts() {
    console.log('Creating chart instances...');
    
    try {
        // Status Distribution Chart (Doughnut)
        const statusCtx = document.getElementById('statusChart')?.getContext('2d');
        if (statusCtx) {
            statusChart = new Chart(statusCtx, {
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
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${context.label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
            console.log('✅ Status chart created');
        }

        // Risk Trend Chart (Line)
        const trendCtx = document.getElementById('trendChart')?.getContext('2d');
        if (trendCtx) {
            trendChart = new Chart(trendCtx, {
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
                    }
                }
            });
            console.log('✅ Trend chart created');
        }

        // Location Chart (Bar)
        const locationCtx = document.getElementById('locationChart')?.getContext('2d');
        if (locationCtx) {
            locationChart = new Chart(locationCtx, {
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
            console.log('✅ Location chart created');
        }
    } catch (error) {
        console.error('❌ Error creating charts:', error);
    }
}

// Load chart data from API
async function loadChartData() {
    console.log('Loading chart data...');
    
    try {
        const response = await fetch(`${API_BASE}/get_chart_data.php`);
        const data = await response.json();
        console.log('Chart data received:', data);
        
        if (data && !data.error) {
            updateCharts(data);
        } else {
            // Fallback to transaction data
            updateChartsFromTransactions();
        }
    } catch (error) {
        console.error('Error loading chart data:', error);
        updateChartsFromTransactions();
    }
}

// Update charts with data
function updateCharts(chartData) {
    console.log('Updating charts with data:', chartData);
    
    try {
        // Update Status Chart
        if (statusChart && chartData.status_distribution) {
            statusChart.data.datasets[0].data = [
                chartData.status_distribution.data[0] || 0,
                chartData.status_distribution.data[1] || 0,
                chartData.status_distribution.data[2] || 0
            ];
            statusChart.update();
            console.log('Status chart updated');
        }

        // Update Trend Chart
        if (trendChart && chartData.risk_trend) {
            trendChart.data.labels = chartData.risk_trend.labels || [];
            trendChart.data.datasets[0].data = chartData.risk_trend.data || [];
            trendChart.update();
            console.log('Trend chart updated');
        }

        // Update Location Chart
        if (locationChart && chartData.location_analysis) {
            locationChart.data.labels = chartData.location_analysis.labels || [];
            locationChart.data.datasets[0].data = chartData.location_analysis.counts || [];
            locationChart.update();
            console.log('Location chart updated');
        }
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

// Fallback: Update charts from transactions array
function updateChartsFromTransactions() {
    console.log('Using fallback chart data from transactions');
    
    if (!transactions || transactions.length === 0) {
        console.log('No transactions for fallback charts');
        return;
    }
    
    try {
        // Status distribution
        const allowed = transactions.filter(t => t.status === 'allowed').length;
        const suspicious = transactions.filter(t => t.status === 'suspicious').length;
        const blocked = transactions.filter(t => t.status === 'blocked').length;
        
        if (statusChart) {
            statusChart.data.datasets[0].data = [allowed, suspicious, blocked];
            statusChart.update();
        }
        
        // Risk trend (last 10)
        const recentTx = transactions.slice(0, 10).reverse();
        if (trendChart && recentTx.length > 0) {
            trendChart.data.labels = recentTx.map((_, i) => `#${i + 1}`);
            trendChart.data.datasets[0].data = recentTx.map(t => parseFloat(t.risk_score) || 0);
            trendChart.update();
        }
        
        // Location analysis
        const locations = {};
        transactions.slice(0, 5).forEach(tx => {
            if (tx.location && tx.location !== 'Unknown') {
                locations[tx.location] = (locations[tx.location] || 0) + 1;
            }
        });
        
        if (locationChart && Object.keys(locations).length > 0) {
            locationChart.data.labels = Object.keys(locations);
            locationChart.data.datasets[0].data = Object.values(locations);
            locationChart.update();
        }
        
        console.log('✅ Fallback charts updated');
    } catch (error) {
        console.error('❌ Error updating fallback charts:', error);
    }
}

// Add this to your loadDashboardData function
function loadDashboardData() {
    console.log('Loading dashboard data...');
    
    // Load transactions
    fetch(API_BASE + '/get_transactions.php')
        .then(response => response.json())
        .then(data => {
            console.log('✅ Transactions loaded:', data.length);
            transactions = Array.isArray(data) ? data : [];
            displayTransactions();
            updateStatsFromTransactions();
            
            // Update charts with new data
            if (typeof updateChartsFromTransactions === 'function') {
                updateChartsFromTransactions();
            }
        })
        .catch(error => {
            console.error('❌ Error loading transactions:', error);
        });
    
    // Load alerts
    fetch(API_BASE + '/get_alerts.php')
        .then(response => response.json())
        .then(data => {
            alerts = Array.isArray(data) ? data : [];
            displayAlerts();
            document.getElementById('alertCount').textContent = alerts.length;
        })
        .catch(error => console.error('Alert error:', error));
    
    // Load stats
    fetch(API_BASE + '/get_stats.php')
        .then(response => response.json())
        .then(data => {
            console.log('Stats loaded:', data);
            if (data.success && data.overall) {
                document.getElementById('totalTransactions').textContent = data.overall.total || 0;
                document.getElementById('allowedTransactions').textContent = data.overall.allowed || 0;
                document.getElementById('suspiciousTransactions').textContent = data.overall.suspicious || 0;
                document.getElementById('blockedTransactions').textContent = data.overall.blocked || 0;
            }
        })
        .catch(error => console.error('Stats error:', error));
}

// Force charts to reload (call this if charts disappear)
function reloadCharts() {
    console.log('Forcing chart reload...');
    
    // Destroy existing charts
    if (statusChart) statusChart.destroy();
    if (trendChart) trendChart.destroy();
    if (locationChart) locationChart.destroy();
    
    // Reinitialize
    initCharts();
    loadChartData();
    
    showNotification('Charts reloaded', 'success');
}

// Add a reload button to your control panel (add this HTML)
// <button class="action-btn purple" onclick="reloadCharts()"><i class="fas fa-chart-bar"></i> Reload Charts</button>

// Make functions globally available
window.reloadCharts = reloadCharts;

// Save settings function
window.saveSettings = function(btn) {
    const refreshRate = document.getElementById('refreshRate').value;
    localStorage.setItem('refreshRate', refreshRate);
    
    // Update auto-refresh if function exists
    if (typeof setAutoRefresh === 'function') {
        setAutoRefresh(parseInt(refreshRate));
    }
    
    showNotification('Settings saved successfully!', 'success');
    btn.closest('.modal').remove();
};

// Help & Support
window.helpSupport = function() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2><i class="fas fa-question-circle" style="color: #667eea;"></i> Help & Support</h2>
                <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div style="padding: 20px;">
                <div style="margin-bottom: 20px; padding: 15px; background: #f0f4ff; border-radius: 10px;">
                    <h3 style="color: #333; margin-bottom: 10px;"><i class="fas fa-robot"></i> AI Fraud Detection</h3>
                    <p style="color: #666; line-height: 1.6;">Our system uses 3 AI models (TensorFlow, Scikit-learn, PyTorch) to analyze transactions in real-time with 92% accuracy.</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #333; margin-bottom: 10px;">📞 Contact Support</h3>
                    <p><i class="fas fa-envelope" style="color: #667eea;"></i> support@fraudshield.local</p>
                    <p><i class="fas fa-phone" style="color: #667eea;"></i> +1 (555) 123-4567</p>
                    <p><i class="fas fa-clock" style="color: #667eea;"></i> 24/7 Available</p>
                </div>
                
                <div>
                    <h3 style="color: #333; margin-bottom: 10px;">📚 Quick Guides</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: 8px;"><i class="fas fa-play-circle" style="color: #22c55e;"></i> <a href="#" onclick="alert('Demo guide')">Getting Started</a></li>
                        <li style="margin-bottom: 8px;"><i class="fas fa-play-circle" style="color: #22c55e;"></i> <a href="#" onclick="alert('Demo guide')">Setting up Face Recognition</a></li>
                        <li style="margin-bottom: 8px;"><i class="fas fa-play-circle" style="color: #22c55e;"></i> <a href="#" onclick="alert('Demo guide')">Understanding Risk Scores</a></li>
                    </ul>
                </div>
                
                <button class="action-btn" onclick="this.closest('.modal').remove()" style="width: 100%; margin-top: 20px;">
                    <i class="fas fa-check"></i> Got it
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};
// ============================================
// FIXED LOGOUT FUNCTION
// ============================================

window.logout = function() {
    console.log('Logout clicked');
    
    // Show confirmation
    if (confirm('Are you sure you want to logout?')) {
        // Clear user data from localStorage
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshRate');
        
        console.log('User logged out, redirecting to login...');
        
        // Redirect to login page
        window.location.href = 'login.html';
    }
};

// Also add a direct logout function (in case the window binding fails)
function forceLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}
// About page
window.aboutInfo = function() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px; text-align: center;">
            <div class="modal-header">
                <h2><i class="fas fa-shield-alt" style="color: #667eea;"></i> About Fraud Shield</h2>
                <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div style="padding: 30px 20px;">
                <i class="fas fa-shield-alt" style="font-size: 60px; color: #667eea; margin-bottom: 20px;"></i>
                <h2 style="color: #333; margin-bottom: 10px;">Fraud Shield v2.0</h2>
                <p style="color: #666; margin-bottom: 20px;">Enterprise Fraud Detection System</p>
                
                <div style="background: #f0f4ff; padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: left;">
                    <p><i class="fas fa-check-circle" style="color: #22c55e;"></i> <strong>3 AI Models:</strong> TensorFlow, Scikit-learn, PyTorch</p>
                    <p><i class="fas fa-check-circle" style="color: #22c55e;"></i> <strong>Accuracy:</strong> 92% on test data</p>
                    <p><i class="fas fa-check-circle" style="color: #22c55e;"></i> <strong>Real-time:</strong> &lt;200ms per transaction</p>
                    <p><i class="fas fa-check-circle" style="color: #22c55e;"></i> <strong>Features:</strong> Face recognition, Telegram alerts, Explainable AI</p>
                </div>
                
                <p style="color: #999; font-size: 12px;">© 2026 Fraud Shield. All rights reserved.</p>
                <p style="color: #999; font-size: 12px;">Made for Hackathon Demo</p>
                
                <button class="action-btn purple" onclick="this.closest('.modal').remove()" style="margin-top: 20px;">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

// Update the user menu dropdown in your HTML
// Add these items to your user dropdown menu

// Simulate transaction
function simulateTransaction() {
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    fetch(API_BASE + '/process_transaction.php', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            if (data.requires_approval) {
                showApprovalPopup(data);
            } else {
                loadDashboardData();
                showToast('Transaction ' + data.status);
            }
        })
        .catch(err => showToast('Error', 'error'))
        .finally(() => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-bolt"></i> Simulate Transaction';
        });
}

// Show approval popup
function showApprovalPopup(data) {
    const modal = document.getElementById('approvalModal');
    document.getElementById('approvalMessage').innerHTML = `
        <i class="fas fa-exclamation-triangle" style="font-size:48px; color:#f97316;"></i>
        <div style="font-size:24px; margin:15px 0;">KES ${Number(data.amount).toLocaleString()}</div>
        <div>Location: ${data.location}</div>
        <div style="margin:15px 0;">Did you make this transaction?</div>
    `;
    modal.style.display = 'flex';
    window.pendingTransaction = data;
}

// Close popup
function closeApprovalPopup() {
    document.getElementById('approvalModal').style.display = 'none';
    window.pendingTransaction = null;
}

// User response
function userRespond(answer) {
    if (!window.pendingTransaction) return;
    
    fetch(API_BASE + '/user_respond.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            transaction_id: window.pendingTransaction.transaction_id,
            response: answer
        })
    })
    .then(() => {
        closeApprovalPopup();
        loadDashboardData();
        showToast(answer === 'yes' ? 'Approved' : 'Blocked');
    });
}

// Show toast notification
function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-info-circle"></i> ${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Refresh data
function refreshData() {
    loadDashboardData();
    showToast('Refreshed');
}

// Export functions
window.simulateTransaction = simulateTransaction;
window.refreshData = refreshData;
window.closeModal = closeModal;
window.userRespond = userRespond;
window.closeApprovalPopup = closeApprovalPopup;
window.showDetails = showDetails;
window.filterTransactions = () => loadDashboardData();
window.clearAlerts = () => {
    alerts = [];
    displayAlerts();
    document.getElementById('alertCount').textContent = '0';
};
window.setAutoRefresh = (s) => showToast('Auto-refresh ' + s + 's');
window.toggleSound = () => showToast('Sound toggled');
window.showStatsDetails = (t) => showToast(t + ' stats');
window.expandChart = (t) => showToast(t + ' chart');