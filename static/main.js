// グローバル変数
let myChart = null;
let allTickers = [];
const famousTickers = ["7203", "9984", "6758", "9432", "8306"];
let highlightedIndex = -1;

/**
 * 銘柄リストをJSONファイルから読み込む
 */
async function loadTickers() {
    try {
        const response = await fetch('/static/tse_list.json');
        allTickers = await response.json();
    } catch (error) {
        console.error("銘柄リストの読み込みに失敗しました:", error);
    }
}

/**
 * 指定されたティッカーシンボルでグラフを描画する関数
 */
async function drawChart(tickerSymbol) {
    const response = await fetch(`/api/stock/${tickerSymbol}`);
    const responseData = await response.json();
    if (responseData.error) {
        alert(`エラー: ${responseData.error}`);
        return;
    }
    const history = responseData.history;
    const info = responseData.info;
    const labels = history.map(item => new Date(item.Date).toLocaleDateString());
    const closingPrices = history.map(item => item.Close);

    // 月ごとの騰落を事前に計算
    const monthlyTrends = {};
    const monthlyData = {};
    history.forEach(item => {
        const date = new Date(item.Date);
        const yearMonth = `${date.getFullYear()}-${date.getMonth()}`;
        if (!monthlyData[yearMonth]) {
            monthlyData[yearMonth] = [];
        }
        monthlyData[yearMonth].push(item.Close);
    });
    const upColor = '46, 204, 113';
    const downColor = '231, 76, 60';
    const neutralColor = '204, 204, 204';
    for (const yearMonth in monthlyData) {
        const prices = monthlyData[yearMonth];
        if (prices.length > 1) {
            monthlyTrends[yearMonth] = prices[prices.length - 1] >= prices[0] ? upColor : downColor;
        } else {
            monthlyTrends[yearMonth] = neutralColor;
        }
    }

    const ctx = document.getElementById('stockChart').getContext('2d');
    if (myChart) {
        myChart.destroy();
    }
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${tickerSymbol} (${info.name}) (終値)`,
                data: closingPrices,
                fill: 'origin',
                segment: {
                    borderColor: (context) => `rgb(${monthlyTrends[`${new Date(history[context.p0DataIndex].Date).getFullYear()}-${new Date(history[context.p0DataIndex].Date).getMonth()}`]})`,
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return null;
                        const rgbColor = monthlyTrends[`${new Date(history[context.p0DataIndex].Date).getFullYear()}-${new Date(history[context.p0DataIndex].Date).getMonth()}`];
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, `rgba(${rgbColor}, 0.5)`);
                        gradient.addColorStop(1, `rgba(${rgbColor}, 0)`);
                        return gradient;
                    },
                },
                borderWidth: 2,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { ticks: { color: '#FFFFFF' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                y: { ticks: { color: '#FFFFFF' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
            },
            plugins: {
                legend: { labels: { color: '#FFFFFF' } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const item = history[context.dataIndex];
                            return [
                                `日付: ${new Date(item.Date).toLocaleDateString()}`,
                                `終値: ${item.Close.toFixed(2)}`, `始値: ${item.Open.toFixed(2)}`,
                                `高値: ${item.High.toFixed(2)}`, `安値: ${item.Low.toFixed(2)}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

async function fetchNews() {
    // ... (fetchNews関数の中身は変更なし) ...
    const newsContainer = document.getElementById('news-container');
    try {
        const response = await fetch('/api/news');
        const articles = await response.json();
        if (!newsContainer) return;
        if (articles.error) {
            console.error("ニュースの取得に失敗:", articles.error);
            newsContainer.innerHTML = '<h2>ニュースの取得に失敗しました</h2>';
            return;
        }
        newsContainer.innerHTML = '<h2>関連ニュース</h2>';
        articles.slice(0, 10).forEach(article => {
            const articleEl = document.createElement('div');
            articleEl.className = 'news-article';
            articleEl.innerHTML = `<h4><a href="${article.url}" target="_blank" rel="noopener noreferrer">${article.title}</a></h4><p>${article.description || ''}</p>`;
            newsContainer.appendChild(articleEl);
        });
    } catch (error) {
        console.error("ニュースの取得に失敗:", error);
        if (newsContainer) {
            newsContainer.innerHTML = '<h2>ニュースの取得に失敗しました</h2>';
        }
    }
}

function updateSuggestions(query) {
    // ... (updateSuggestions関数の中身は変更なし) ...
    const suggestionsBox = document.getElementById('suggestions-box');
    if (!suggestionsBox) return;
    suggestionsBox.innerHTML = '';
    highlightedIndex = -1;
    let suggestions = [];
    if (query === '') {
        suggestions = allTickers.filter(t => famousTickers.includes(t.code));
    } else {
        suggestions = allTickers.filter(t => t.code.includes(query))
                                .sort((a, b) => parseInt(a.code, 10) - parseInt(b.code, 10))
                                .slice(0, 10);
    }
    if (suggestions.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
    }
    suggestions.forEach(ticker => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = `${ticker.code}: ${ticker.name}`;
        item.dataset.ticker = ticker.code;
        suggestionsBox.appendChild(item);
    });
    suggestionsBox.style.display = 'block';
}

function updateHighlight() {
    // ... (updateHighlight関数の中身は変更なし) ...
    const suggestionsBox = document.getElementById('suggestions-box');
    if (!suggestionsBox) return;
    const items = suggestionsBox.querySelectorAll('.suggestion-item');
    items.forEach((item, index) => {
        if (index === highlightedIndex) {
            item.classList.add('highlighted');
        } else {
            item.classList.remove('highlighted');
        }
    });
}


// ページの読み込みが完了したらすべての処理を開始
window.addEventListener('load', async () => {
    if (document.getElementById('search-button')) {
        const loadTickersPromise = loadTickers();
        const fetchNewsPromise = fetchNews();
        
        const searchButton = document.getElementById('search-button');
        const tickerInput = document.getElementById('ticker-input');
        const suggestionsBox = document.getElementById('suggestions-box');

        // ★★★ ここからが修正箇所 ★★★
        function performSearch() {
            const ticker = tickerInput.value.trim(); // 入力値の前後にある空白を削除
            if (!ticker) return;

            // 日経平均の特別扱い
            const nikkeiAliases = ['^N225', 'nikkei', 'にっけい', '日経', '日経平均'];
            if (nikkeiAliases.includes(ticker.toLowerCase())) {
                drawChart('^N225');
            } else {
                // 通常の個別銘柄
                drawChart(ticker + ".T");
            }
            suggestionsBox.style.display = 'none';
        }
        // ★★★ ここまでが修正箇所 ★★★

        searchButton.addEventListener('click', performSearch);
        
        tickerInput.addEventListener('keydown', (event) => {
            // ... (keydownリスナーの中身は変更なし) ...
            const items = suggestionsBox.querySelectorAll('.suggestion-item');
            if (items.length === 0 || suggestionsBox.style.display === 'none') {
                if(event.key === 'Enter') performSearch();
                return;
            };
            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    highlightedIndex = (highlightedIndex + 1) % items.length;
                    updateHighlight();
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    highlightedIndex = (highlightedIndex - 1 + items.length) % items.length;
                    updateHighlight();
                    break;
                case 'Enter':
                    event.preventDefault();
                    if (highlightedIndex > -1) {
                        items[highlightedIndex].click();
                    } else {
                        performSearch();
                    }
                    break;
                case 'Escape':
                    suggestionsBox.style.display = 'none';
                    break;
            }
        });

        tickerInput.addEventListener('input', () => updateSuggestions(tickerInput.value));
        tickerInput.addEventListener('focus', () => updateSuggestions(tickerInput.value));
        
        suggestionsBox.addEventListener('click', (event) => {
            if (event.target.classList.contains('suggestion-item')) {
                tickerInput.value = event.target.dataset.ticker;
                performSearch();
            }
        });
        
        // 初期表示
        drawChart('^N225');
        await loadTickersPromise;
    }

    const menuToggle = document.getElementById('menu-toggle');
    document.addEventListener('click', (event) => {
        const suggestionsBox = document.getElementById('suggestions-box');
        if (suggestionsBox && !event.target.closest('#search-wrapper')) {
            suggestionsBox.style.display = 'none';
        }
        if (menuToggle && !event.target.closest('.hamburger-menu')) {
            menuToggle.checked = false;
        }
    });
});