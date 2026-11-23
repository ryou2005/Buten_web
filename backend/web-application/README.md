# 20周年記念公演 Web申込（座席割り当てツールとのつなぎ方）

サイトの申込フォーム（`ticket.html`）は、座席割り当てツールの「Web申込」に申し込みを送ります。
**席の数を数えるのも、席を決めるのもツールだけ**です（団員の分と一般の分を同じ404席・224席から数え、売りすぎを防ぐ）。
ツールはまだできていないので、それまでフォームはテストモードで動きます（`ticket-config.js` の `apiEndpoint` が空）。

## 流れ

1. お客さんがフォームで申し込む（1件 = 1組、最大8人）
2. ツールが申し込みを保存して受付番号（通し番号 1, 2, 3…）を付け、お客さんに「受付メール」、りょうに通知メールを送る
3. りょうがツールの「Web申込」一覧で「割り当て」を押す。指定席は組のルールで席が決まり、自由席は枚数を数える
4. ツールがお客さんに「席の決定メール」を送る（指定席は「C列5〜7番」のように座席番号入り）
5. 当日、受付で受付番号かお名前で探し（F10）、代金と引き換えにチケットを渡して配布済みにする

## ツールに作る API

`ticket-config.js` の `apiEndpoint` に、この2つを持つ URL を設定する。

### `POST {apiEndpoint}/applications` 申し込み

送られてくる JSON：

```json
{
  "seatType": "reserved",
  "tickets": { "adult": 2, "student": 1 },
  "care": ["mobility"],
  "name": "山田 太郎",
  "kana": "ヤマダ タロウ",
  "email": "yamada@example.com",
  "tel": "090-1234-5678",
  "message": "",
  "privacyConsent": true,
  "website": ""
}
```

- `seatType`：`reserved`（指定席）/ `free`（自由席）
- `tickets`：券種ごとの人数（`adult` 一般・`student` 高校生以下）。合計 = 組の人数
- `care`：配慮が必要なこと（ツールの配慮メモ F14 に入れる）。`mobility` 足が不自由・`wheelchair` 車椅子・`smallChild` 小さな子連れ
- `website`：ボット対策の欄。入力があれば受け付けない

返すもの：

| 状況 | ステータス | 中身 |
|---|---|---|
| 受け付けた | 200 | `{ "success": true, "receiptNo": 12, "emailSent": true }` |
| 入力ミス | 400 | `{ "error": "入力内容をご確認ください。", "details": ["…"] }` |
| 受付期間外 | 403 | `{ "error": "現在、お申し込みは受け付けておりません。" }` |
| 選んだ席種の残りがない | 409 | `{ "error": "…", "availability": { … } }` |

`emailSent` は受付メールを送れたかどうか。送れなくても受け付けは成立し、画面に受付番号が出る。

### `GET {apiEndpoint}/availability` 空き状況

```json
{ "open": true, "availability": { "reserved": "available", "free": "few" } }
```

`available`（受付中）/ `few`（残りわずか）/ `soldout`（満席）。正確な残り枚数は出さない。
指定席は「残り席数 − 割り当て待ちの Web申込の人数」で判定すると、割り当て待ちのぶん売りすぎにくい。

## このフォルダの部品（`application.mjs`）

ツールのサーバー側の処理から読み込んで使う。AWS や Supabase には依存しない。
`config`・`event` には、サイトの `ticket-config.js` の `TICKET_CONFIG`・`EVENT` と同じものを渡す。

| 関数 | 使う場面 |
|---|---|
| `validateApplication(body, config)` | 申し込みを保存する前のチェック。`{ errors, value }` を返す |
| `isSalesOpen(config, event)` | 受付期間内か（公演日を過ぎたら締め切る） |
| `receivedEmail(application, config, event)` | 受付メール（申し込み直後） |
| `adminEmail(application, config, event)` | りょうへの通知メール（申し込み直後） |
| `assignedEmail(application, seats, config, event)` | 席の決定メール（りょうが割り当てたとき）。`seats` は指定席なら `{ row: "C", from: 5, to: 7 }`、自由席なら `null` |

`application` は `validateApplication` の `value` に、保存時に付けた `receiptNo` を足したもの。

## 決まっていないこと

- メールの送り方（ツールのサーバーから送る仕組み。お問い合わせフォームで使っている AWS SES を使うか、別のサービスにするか）
- 指定席が埋まったあとに届いた指定席の申し込みの扱い（自由席に切り替えて案内するか）
