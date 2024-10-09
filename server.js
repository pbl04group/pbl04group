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

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'public')));

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

app.get('/ho', (req, res) => {
    res.sendFile(path.join('C:', 'Users', 'user', 'OneDrive - 山形県立産業技術短期大学校', 'PBL', 'ホ.html'));
});

app.get('/hazard', (req, res) => {
    res.sendFile(path.join('C:', 'Users', 'user', 'OneDrive - 山形県立産業技術短期大学校', 'PBL', 'test3-pbl21-2.html'));
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
    res.sendFile(path.join('C:', 'Users', 'user', 'OneDrive - 山形県立産業技術短期大学校', 'PBL','パスワード変更.html'));
});

// 情報編集1
app.get('/information-change_1', (req, res) => {
    if (!req.session.loggedin) {
        return res.status(401).json({ error: 'ログインしてください' });
    }
    res.sendFile(path.join('C:', 'Users', 'user', 'OneDrive - 山形県立産業技術短期大学校', 'PBL', '避難先の情報編集1.html'));
});

// 避難先の取得
app.get('/get-shelters', (req, res) => {
    const zititaiID = req.session.zititaiID;
    console.log(`セッションから取得した zititaiID: ${zititaiID}`); // デバッグ情報

    db.all("SELECT hinansakiID, hinansakimei FROM hinansaki_table WHERE zititaiID = ?", [zititaiID], (err, rows) => {
        if (err) {
            console.error('Error fetching shelters:', err); // デバッグ情報
            return res.status(500).json({ error: err.message });
        }
        console.log('取得した避難先:', rows); // デバッグ情報
        res.json(rows);
    });
});

app.get('/get-shelter-details', (req, res) => {
    const shelterId = req.query.shelter;
    db.get("SELECT * FROM hinansaki_table WHERE hinansakiID = ?", [shelterId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: '避難先が見つかりません' });
        }
        res.json(row);
    });
});


app.post('/change-shelter-database', (req, res) => {
    const { id, lat, lng, address, name, details } = req.body;
    const zititaiID = req.session.zititaiID; // セッションから zititaiID を取得

    console.log(`セッションから取得した zititaiID: ${zititaiID}`); // デバッグ情報
    console.log(`提供される値: ${id}, ${lat}, ${lng}, ${address}, ${name}, ${details}, ${zititaiID}`); // デバッグ情報

    if (!zititaiID) {
        return res.status(400).json({ error: 'ログインしていません。' });
    }

    const stmt = db.prepare("UPDATE hinansaki_table SET hinansakiido = ?, hinansakikeido = ?, zyuusyo = ?, hinansakimei = ?, syousai = ? WHERE hinansakiID = ? AND zititaiID = ?");
    stmt.run(lat, lng, address, name, details, id, zititaiID, function(err) {
        if (err) {
            console.error('Error updating shelter:', err); // デバッグ情報
            return res.status(500).json({ error: err.message });
        }
        console.log('避難先の情報が正常に更新されました'); // デバッグ情報
        res.redirect('/home');
    });
    stmt.finalize();
});


// 情報編集2
app.get('/information-change_2', (req, res) => {
    if (!req.session.loggedin) {
        return res.status(401).json({ error: 'ログインしてください' });
    }
    const shelterId = req.query.shelter;
    db.all("SELECT * FROM hinansaki_table WHERE hinansakiID = ?", [shelterId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.sendFile(path.join('C:', 'Users', 'user', 'OneDrive - 山形県立産業技術短期大学校', 'PBL', '避難先の情報編集2.html'));
    });
});

//
app.get('/target-shelter', (req, res) => {
    db.all("SELECT hinansakiID, hinansakimei, hinansakiido, hinansakikeido FROM hinansaki_table", (err, rows) => {
        if (err) {
            console.error('Error fetching contact data:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join('C:', 'Users', 'user', 'OneDrive - 山形県立産業技術短期大学校', 'PBL', '問い合わせ.html'));
});

// ユーザー認証が行われ、ユーザーIDがセッションに保存されている
app.get('/get-inquiries', (req, res) => {
    const zititaiID = req.session.zititaiID; // セッションからログインしているzititaiのIDを取得
    if (!zititaiID) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.all("SELECT toiawaseID, toiawase, toiawase_mail, create_at FROM toiawase_table WHERE zititaiID = ?", [zititaiID], (err, rows) => {
        if (err) {
            console.error('Error fetching inquiries:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/inquiries', (req, res) => {
    res.sendFile(path.join('C:', 'Users', 'user', 'OneDrive - 山形県立産業技術短期大学校', 'PBL', '問い合わせ一覧.html'));
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


// 避難先の削除
app.post('/delete', (req, res) => {
    const shelterId = req.body.shelter_delete;
    const sql = 'DELETE FROM hinansaki_table WHERE hinansakiID = ?';

    db.run(sql, [shelterId], function(err) {
        if (err) {
            return console.error(err.message);
        }
        console.log(`避難先ID ${shelterId} を削除しました`);
        res.redirect('/home');
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

// 問い合わせデータの保存
app.post('/contact-save', (req, res) => {
    const { mail_address, shelter, contact_content } = req.body;
    const sql = 'INSERT INTO toiawase_table (zititaiID, toiawase, toiawase_mail) VALUES (?, ?, ?)';

    db.run(sql, [shelter, contact_content, mail_address], function(err) {
        if (err) {
            return console.error(err.message);
        }
        console.log(`問い合わせID ${this.lastID} を保存しました`);
        res.redirect('/ho');
    });
});

// /delete-inquiry エンドポイントの実装
app.post('/delete-inquiry', (req, res) => {
    const inquiryId = req.body.id;

    if (!inquiryId) {
        return res.status(400).json({ success: false, message: 'IDが提供されていません' });
    }

    const query = 'DELETE FROM toiawase_table WHERE toiawaseID = ?';
    db.run(query, [inquiryId], function(error) {
        if (error) {
            console.error('Error deleting inquiry:', error);
            return res.status(500).json({ success: false, message: '削除に失敗しました' });
        }

        return res.json({ success: true, message: '問い合わせが削除されました' });
    });
});
// 問い合わせ先の取得
app.get('/contact_all', (req, res) => {
    db.all("SELECT zititaiID, zititaimei FROM zititai_table", (err, rows) => {
        if (err) {
            console.error('Error fetching contact data:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
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

