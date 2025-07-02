from flask import Flask, jsonify, render_template
import yfinance as yf

app = Flask(__name__)

@app.route('/')
def index():
    """
    トップページを表示します。
    """
    return render_template('index.html')

@app.route('/api/nikkei')
def get_nikkei_data():
    """
    yfinanceで日経平均の過去6ヶ月分データを取得し、JSON形式で返します。
    """
    ticker = yf.Ticker("^N225")
    hist = ticker.history(period="6mo")
    
    # 日付をインデックスから列に変換し、扱いやすい辞書の配列形式 (records) でJSON化
    data = hist.reset_index().to_dict(orient="records")
    return jsonify(data)

if __name__ == '__main__':
    # デバッグモードでアプリケーションを実行
    app.run(debug=True)