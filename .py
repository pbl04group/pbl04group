from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/endpoint', methods=['POST'])
def handle_request():
    data = request.get_json()
    # JSONデータを取得して処理する
    key_value = data.get('key')
    # ここでPythonの処理を実行する
    result = {'message': '処理が成功しました', 'key_value': key_value}
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
