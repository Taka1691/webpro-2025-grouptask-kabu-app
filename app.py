import os
from flask import Flask, jsonify, render_template
import yfinance as yf
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

@app.route('/')
def index():
    """
    トップページ（株価確認ページ）を表示します。
    """
    return render_template('index.html')

@app.route('/study')
def study():
    """
    勉強用のページを表示します。
    """
    return render_template('study.html')

@app.route('/api/stock/<string:ticker_symbol>')
def get_stock_data(ticker_symbol):
    """
    指定されたティッカーシンボルの株価データを取得するAPI
    """
    try:
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info
        hist = ticker.history(period="1y")
        if hist.empty:
            return jsonify({"error": "銘柄コードが見つかりません"}), 404
            
        history_data = hist.reset_index().to_dict(orient="records")
        
        response_data = {
            "info": {
                "name": info.get('longName', info.get('shortName', 'N/A'))
            },
            "history": history_data
        }
        
        return jsonify(response_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/news')
def get_stock_news():
    """
    NewsAPIから日本のビジネストップニュースを取得するAPI。
    """
    # 環境変数からAPIキーを取得
    API_KEY = os.environ.get('NEWS_API_KEY')
    if not API_KEY:
        # 環境変数が設定されていない場合のエラー
        return jsonify({"error": "NEWS_API_KEY is not configured on the server."}), 500

    url = (
        'https://newsapi.org/v2/top-headlines?'
        'country=jp&'
        'category=business&'
        f'apiKey={API_KEY}'
    )
    try:
        response = requests.get(url)
        news_data = response.json()
        if news_data.get("status") == "error":
            return jsonify({"error": news_data.get("message")}), 500

        articles = news_data.get("articles", [])
        
        # 記事が0件だった場合にサンプルを返す
        if not articles:
            articles = [
                {
                    "title": "（サンプル）日経平均株価、史上最高値を更新",
                    "description": "東京証券取引所で日経平均株価が大幅に上昇し、取引時間中の史上最高値を更新しました。",
                    "url": "https://www.nikkei.com/"
                },
                {
                    "title": "（サンプル）政府、新たな経済対策を発表",
                    "description": "政府は本日、物価高騰に対応するための新たな経済対策を発表しました。",
                    "url": "https://www.asahi.com/"
                }
            ]
        return jsonify(articles)
        
    except Exception as e:
        return jsonify([{"title": "ニュースサーバーへの接続に失敗しました", "description": str(e)}])

if __name__ == '__main__':
    app.run(debug=True)