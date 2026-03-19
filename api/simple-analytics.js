// Simple Analytics - No complicated stuff
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Simple Analytics starting...');
    loadSimpleAnalytics();
    
    // Refresh every 10 seconds
    setInterval(loadSimpleAnalytics, 10000);
});

function loadSimpleAnalytics() {
    console.log('Fetching analytics data...');
    
    fetch('api/simple_analytics.php')
        .then(response => response.json())
        .then(data => {
            console.log('Analytics data:', data);
            
            if (data.success) {
                updateSimpleStats(data.stats);
                createSimpleCharts(data);
            } else {
                console.error('Error:', data.error);
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
        });
}

function updateSimpleStats(stats) {
    // Update the big numbers
    document.getElementById('totalTransactions').textContent = stats.total;
    document.getElementById('allowedTransactions').textContent = stats.allowed;
    document.getElementById('suspiciousTransactions').textContent = stats.suspicious;
    document.getElementById('blockedTransactions').textContent = stats.blocked;
    
    // Update the small text below
    document.getElementById('totalTrend').innerHTML = 
        `<i class="fas fa-chart-line"></i> Avg Risk: ${stats.avg_risk}%`;
    
    document.getElementById('allowedTrend').innerHTML = 
        `<i class="fas fa-arrow-up" style="color: #22c55e;"></i> ${stats.allowed_pct}% of total`;
    
    document.getElementById('suspiciousTrend').innerHTML = 
        `<i class="fas fa-exclamation-triangle" style="color: #f97316;"></i> ${stats.suspicious_pct}% of total`;
    
    document.getElementById('blockedTrend').innerHTML = 
        `<i class="fas fa-arrow-down" style="color: #ef4444;"></i> ${stats.blocked_pct}% of total`;
}

function createSimpleCharts(data) {
    // Clear existing charts
    destroyCharts();
    
    // Create new charts
    createStatusChart(data.stats);
    createTrendChart(data.trend);
    createLocationChart(data.locations);
}

function destroyCharts() {
    // Remove existing canvases and recreate them
    ['statusChart', 'trendChart', 'locationChart'].forEach(id => {
        const oldCanvas = document.getElementById(id);
        if (oldCanvas) {
            const parent = oldCanvas.parentNode;
            const newCanvas = document.createElement('canvas');
            newCanvas.id = id;
            newCanvas.style.width = '100%';
            newCanvas.style.height = '160px';
            parent.replaceChild(newCanvas, oldCanvas);
        }
    });
}

function createStatusChart(stats) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Allowed', 'Suspicious', 'Blocked'],
            datasets: [{
                data: [stats.allowed, stats.suspicious, stats.blocked],
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

function createTrendChart(trend) {
    if (!trend.labels || trend.labels.length === 0) {
        trend.labels = ['No data'];
        trend.data = [0];
    }
    
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: trend.labels,
            datasets: [{
                data: trend.data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 3
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
                    grid: { display: false },
                    ticks: { 
                        callback: v => v + '%',
                        font: { size: 8 }
                    }
                },
                x: { 
                    display: false 
                }
            }
        }
    });
}

function createLocationChart(locations) {
    if (!locations.labels || locations.labels.length === 0) {
        locations.labels = ['No data'];
        locations.data = [0];
    }
    
    const ctx = document.getElementById('locationChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: locations.labels,
            datasets: [{
                data: locations.data,
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
}