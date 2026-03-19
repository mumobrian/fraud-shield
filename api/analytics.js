// Simple Analytics Module
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Analytics module starting...');
    loadAnalytics();
    
    // Refresh every 10 seconds
    setInterval(loadAnalytics, 10000);
});

function loadAnalytics() {
    console.log('📊 Loading analytics data...');
    
    fetch('api/get_analytics.php')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('✅ Analytics data received:', data);
            
            if (data.success) {
                updateStats(data.stats);
                updateCharts(data.charts);
            } else {
                console.error('❌ Analytics error:', data.error);
                showError('Failed to load analytics');
            }
        })
        .catch(error => {
            console.error('❌ Failed to load analytics:', error);
            showError('Could not connect to analytics server');
        });
}

function updateStats(stats) {
    // Update stat cards
    document.getElementById('totalTransactions').textContent = stats.total || 0;
    document.getElementById('allowedTransactions').textContent = stats.allowed || 0;
    document.getElementById('suspiciousTransactions').textContent = stats.suspicious || 0;
    document.getElementById('blockedTransactions').textContent = stats.blocked || 0;
    
    // Update trend indicators
    document.getElementById('allowedTrend').innerHTML = `
        <i class="fas fa-arrow-up" style="color: #22c55e;"></i>
        <span>${stats.allowed_percentage || 0}% of total</span>
    `;
    
    document.getElementById('suspiciousTrend').innerHTML = `
        <i class="fas fa-exclamation-triangle" style="color: #f97316;"></i>
        <span>${stats.suspicious_percentage || 0}% of total</span>
    `;
    
    document.getElementById('blockedTrend').innerHTML = `
        <i class="fas fa-arrow-down" style="color: #ef4444;"></i>
        <span>${stats.blocked_percentage || 0}% of total</span>
    `;
    
    document.getElementById('totalTrend').innerHTML = `
        <i class="fas fa-chart-line" style="color: #667eea;"></i>
        <span>Avg Risk: ${stats.avg_risk || 0}%</span>
    `;
}

function updateCharts(charts) {
    if (!charts) return;
    
    // Status Distribution Chart
    if (charts.status_distribution) {
        const ctx = document.getElementById('statusChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: charts.status_distribution.labels,
                datasets: [{
                    data: charts.status_distribution.data,
                    backgroundColor: ['#22c55e', '#f97316', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
    
    // Risk Trend Chart
    if (charts.risk_trend && charts.risk_trend.data.length > 0) {
        const ctx = document.getElementById('trendChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: charts.risk_trend.labels,
                datasets: [{
                    data: charts.risk_trend.data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { display: false }
                    },
                    x: { display: false }
                }
            }
        });
    }
    
    // Location Chart
    if (charts.location_analysis && charts.location_analysis.labels.length > 0) {
        const ctx = document.getElementById('locationChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: charts.location_analysis.labels,
                datasets: [{
                    data: charts.location_analysis.counts,
                    backgroundColor: '#764ba2',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { display: false },
                        ticks: { stepSize: 1 }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }
}

function showError(message) {
    console.error(message);
    // Optionally show error on dashboard
}