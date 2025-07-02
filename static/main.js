/**
 * APIから株価データを取得し、グラフを描画する非同期関数
 */
async function drawChart() {
    // FlaskのAPIエンドポイントから株価データを取得
    const response = await fetch('/api/nikkei');
    const data = await response.json();

    const labels = data.map(item => new Date(item.Date).toLocaleDateString());
    const closingPrices = data.map(item => item.Close);

    // ★★★ ここからカスタムプラグインを定義 ★★★
    const centeredCrosshairPlugin = {
        id: 'centeredCrosshair',
        afterEvent: (chart, args) => {
            const { event } = args;
            if (event.type === 'mousemove') {
                const activePoint = chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, true);
                if (activePoint.length > 0) {
                    chart.crosshair = {
                        xValue: chart.data.labels[(activePoint?.[0]?.element?.index)],
                        yValue: chart.data.datasets[(activePoint?.[0]?.datasetIndex)]?.data[(activePoint?.[0]?.element?.index)],
                        xPixel: activePoint?.[0]?.element?.x,
                        yPixel: activePoint?.[0]?.element?.y,
                    };
                } else {
                    chart.crosshair = null;
                }
                chart.draw();
            }

            if (event.type === 'mouseout') {
                chart.crosshair = null;
                chart.draw();
            }
        },
        afterDraw: (chart) => {
            if (!chart.crosshair) {
                return;
            }

            const { ctx, chartArea: { top, bottom, left, right } } = chart;
            const { xPixel, yPixel } = chart.crosshair;

            if (xPixel && yPixel && xPixel >= left && xPixel <= right && yPixel >= top && yPixel <= bottom) {
                ctx.save();
                ctx.beginPath();
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(102, 102, 102, 0.7)';
                ctx.setLineDash([6, 6]);

                // 縦線 (データ点のX座標)
                ctx.moveTo(xPixel, top);
                ctx.lineTo(xPixel, bottom);

                // 横線 (データ点のY座標)
                ctx.moveTo(left, yPixel);
                ctx.lineTo(right, yPixel);

                ctx.stroke();
                ctx.restore();
            }
        }
    };
    // ★★★ ここまでカスタムプラグイン ★★★

    // カスタムプラグインをChart.jsに登録
    Chart.register(centeredCrosshairPlugin);

    const ctx = document.getElementById('stockChart').getContext('2d');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '日経平均株価 (終値)',
                data: closingPrices,
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'nearest', // カーソルに最も近い要素をインタラクションの対象とする
                intersect: false,
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            const item = data[(index)];
                            const date = new Date(item.Date).toLocaleDateString();
                            return [
                                `${date}`,
                                `終値: ${item.Close?.toFixed(2)}`,
                                `始値: ${item.Open?.toFixed(2)}`,
                                `高値: ${item.High?.toFixed(2)}`,
                                `安値: ${item.Low?.toFixed(2)}`
                            ];
                        }
                    }
                },
            }
        }
    });
}

// 関数の実行
drawChart();