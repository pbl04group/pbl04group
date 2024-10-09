const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');


const app = express();
const db = new sqlite3.Database('./SQL/test.db');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // URLエンコードされたデータを解析
app.use(express.static(path.join(__dirname, 'PBL'))); // "PBL" ディレクトリから静的ファイルを提供

// セッションの設定
app.use(session({
    secret: 'your_secret_key', // セッションの秘密鍵
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // HTTPSを使用する場合はtrueに設定
}));

// データベースのテーブルを初期化
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS hinansaki_table(hinansakiID INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, zititaiID INTEGER NOT NULL, hinansakimei VARCHAR(32) NOT NULL, zyuusyo VARCHAR(128) NOT NULL, syousai VARCHAR(512) NOT NULL, hinansakiido NUMERIC NOT NULL, hinansakikeido NUMERIC NOT NULL, FOREIGN KEY (zititaiID) REFERENCES hinanzyo_table (zititaiID))");
    db.run("CREATE TABLE IF NOT EXISTS zititai_table(zititaiID INTEGER PRIMARY KEY NOT NULL, zititaimei VARCHAR(32) UNIQUE NOT NULL, password VARCHAR(32) NOT NULL)");
    db.run("CREATE TABLE IF NOT EXISTS toiawase_table(toiawaseID INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, zititaiID INTEGER UNIQUE NOT NULL, toiawase VARCHAR(512) NOT NULL, toiawase_mail VARCHAR(64) NOT NULL, create_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (zititaiID) REFERENCES hinanzyo_table (zititaiID))");
});

// ルートパスのエンドポイントを追加
app.get('/', (req, res) => {
    res.sendFile(path.join('C:', 'Users', 'user', 'OneDrive - 山形県立産業技術短期大学校', 'PBL', '自治体ログイン画面.html'));
});
app.get('/touroku', (req, res) => {
    res.sendFile(path.join('C:', 'Users', 'user', 'OneDrive - 山形県立産業技術短期大学校', 'PBL', '避難先の新規登録う.html'));
});
app.get('/home', (req, res) => {
    if (req.session.loggedin) {
        res.sendFile(path.join('C:', 'Users', 'user', 'OneDrive - 山形県立産業技術短期大学校', 'PBL', '自治体ホーム画面.html'));
    } else {
        res.redirect('/');
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.redirect('/');
    });
});
app.get('/pass-change', (req, res) => {
    res.sendFile(path.join('C:', 'Users', 'user', 'OneDrive - 山形県立産業技術短期大学校', 'PBL', 'パスワード変更.html'));
});

//問い合わせ
app.get('/contact', (req, res) => {
    res.sendFile(path.join('C:', 'Users', 'user', 'OneDrive - 山形県立産業技術短期大学校', 'PBL', '問い合わせ.html'));
});

// フォームの送信を処理するエンドポイント 避難所登録
app.post('/save', (req, res) => {
    const { lat, lng, address, name, details } = req.body;
    const zititaiID = req.session.zititaiID; // セッションから zititaiID を取得

    console.log(`セッションから取得した zititaiID: ${zititaiID}`); // デバッグ情報
    console.log(`提供される値: ${lat}, ${lng}, ${address}, ${name}, ${details}, ${zititaiID}`); // デバッグ情報

    if (!zititaiID) {
        return res.status(400).json({ error: 'ログインしていません。' });
    }

    const stmt = db.prepare("INSERT INTO hinansaki_table (hinansakiido, hinansakikeido, zyuusyo, hinansakimei, syousai, zititaiID) VALUES (?, ?, ?, ?, ?, ?)");
    stmt.run(lat, lng, address, name, details, zititaiID, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'データが正常に保存されました！' });
    });
    stmt.finalize();
});

app.post('/rogin-save', (req, res) => {
    const { zititai_id, zititai_password } = req.body;
    console.log(`入力された自治体ID: ${zititai_id}`);
    console.log(`入力されたパスワード: ${zititai_password}`);

    db.get("SELECT * FROM zititai_table WHERE zititaiID = ? AND password = ?", [zititai_id, zititai_password], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (row) {
            req.session.loggedin = true;
            req.session.zititaiID = zititai_id;
            console.log(`セッションに保存された zititaiID: ${req.session.zititaiID}`);
            res.redirect('/home');
        } else {
            // ログイン失敗
            res.status(401).json({ message: '自治体IDまたはパスワードが正しくありません' });
        }
    });
});
app.post('/change-password', (req, res) => {
    const { new_password } = req.body;
    const zititaiID = req.session.zititaiID;

    // パスワードを更新
    db.run("UPDATE zititai_table SET password = ? WHERE zititaiID = ?", [new_password, zititaiID], (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'パスワードが正常に変更されました！' });
    });
});

app.post('/contact-save', (req, res) => {
    const { mail_address, syudan, contact_content } = req.body;

    const stmt = db.prepare("INSERT INTO toiawase_table (toiawaseID, zititaiID, toiawase, toiawase_mail, create_at) VALUES (?, ?, ?, ?, ?)");
    stmt.run(mail_address, syudan, contact_content, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'データが正常に保存されました！' });
    });
    stmt.finalize();
});

// ログアウトのエンドポイントを追加
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.redirect('/');
    });
});

app.listen(3000, () => {
    console.log('サーバーが http://localhost:3000 で実行中');
});

