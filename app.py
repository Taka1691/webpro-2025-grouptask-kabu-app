from flask import Flask, jsonify, render_template
import yfinance as yf
import requests

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/stock/<string:ticker_symbol>')
def get_stock_data(ticker_symbol):
    try:
        ticker = yf.Ticker(ticker_symbol)
        
        # ★★★ 変更点(1): 企業の詳細情報を取得 ★★★
        info = ticker.info
        
        hist = ticker.history(period="1y")
        if hist.empty:
            return jsonify({"error": "銘柄コードが見つかりません"}), 404
        
        history_data = hist.reset_index().to_dict(orient="records")
        
        # ★★★ 変更点(2): 株価履歴と企業情報の両方を返す ★★★
        response_data = {
            "info": {
                # longNameがなければshortName、それもなければN/A
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
    NewsAPIから日本の株・経済ニュースを取得するAPI
    """
    # ↓↓↓ ★★★ あなたがNewsAPI.orgで取得したAPIキーに書き換えてください ★★★ ↓↓↓
    API_KEY = "9d444565edff4823acc2431ed3792594"

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
            # APIキーの間違いなど、明らかなエラーの場合
            articles = []
        else:
            articles = news_data.get("articles", [])

        # ★★★ ここからが追加した「保険」の処理 ★★★
        if not articles: # 取得した記事が空リストだった場合
            # サンプルニュースを代わりに用意する
            articles = [
                {
                    "title": "日経平均株価、史上最高値を更新",
                    "description": "東京証券取引所で日経平均株価が大幅に上昇し、取引時間中の史上最高値を更新しました。半導体関連株が相場を牽引しています。",
                    "url": "https://www.nikkei.com/",
                    "source": {"name": "Nikkei"}
                },
                {
                    "title": "政府、新たな経済対策を発表",
                    "description": "政府は本日、物価高騰に対応するための新たな経済対策を発表しました。家計への支援として、給付金の支給などが盛り込まれています。",
                    "url": "https://www.asahi.com/",
                    "source": {"name": "Asahi Shimbun"}
                },
                {
                    "title": "円相場、一時1ドル150円台に",
                    "description": "外国為替市場で円安が進行し、円相場は一時1ドル150円台まで値下がりしました。今後の金融政策の動向が注目されます。",
                    "url": "https://www.yomiuri.co.jp/",
                    "source": {"name": "Yomiuri Shimbun"}
                }
            ]
        # ★★★ ここまで ★★★

        return jsonify(articles)
        
    except Exception as e:
        return jsonify([{"title": "ニュースサーバーへの接続に失敗しました", "description": str(e)}])

@app.route('/study')
def study():
    return render_template('study.html')

if __name__ == '__main__':
    app.run(debug=True)