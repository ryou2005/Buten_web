# 20周年記念公演 チケット予約 API

予約フォーム（`ticket.html`）の受け付け先です。AWS Lambda + API Gateway + DynamoDB + SES で動きます。
お問い合わせフォーム（`backend/`）とは**別のスタック**なので、こちらをデプロイしてもお問い合わせフォームには影響しません。

## しくみ

- `GET /availability`：席種ごとの空き状況（受付中 / 残りわずか / 満席）
- `POST /reservations`：予約する
  - 席の確保と予約の保存を同時に行い、定員を超える予約は受け付けない（同時に申し込まれても超えない）
  - 予約番号（`BT-XXXXXX`）を発行し、お客さんに確認メール、運営に通知メールを送る
  - 確認メールが送れなくても予約は成立する（画面に予約番号が出る。運営への通知に「送信できませんでした」と書かれる）
- テーブル
  - `ButenTicketReservations`：予約（1件 = 1つの予約番号）
  - `ButenTicketInventory`：席種ごとの予約済み枚数

## 設定を変える

料金・席種・券種・上限枚数・受付状況は、**2か所を同じ内容にする**必要があります。

| ファイル | 中身 |
|---|---|
| `ticket-config.js`（サイト直下） | 画面に出す内容・API の URL |
| `backend/ticket/config.mjs` | 予約 API がチェックする内容・**席数（capacity）** |

書き換えたらサイト直下で `npm test` を実行すると、2か所がそろっているかを確かめられます。
`config.mjs` を変えたら、もう一度デプロイしてください。

- 席数（`capacity`）は、関係者席・招待席などを除いた「ネットで受け付ける数」にする
- 予約の途中で席数を変えても大丈夫（すでに予約された枚数はそのまま数える）

## 公開までの手順

### 1. SES の準備（初回のみ）

- 送信元のアドレス（例 `noreply@wadaiko-buten.net`）またはドメインを SES で検証する
- **SES が「サンドボックス」のままだと、検証済みのアドレスにしかメールを送れない**。
  お客さんに確認メールを送るため、AWS コンソールの SES →「本番アクセスをリクエスト」で申請する（通常1日ほど）

### 2. デプロイ

```bash
cd backend/ticket
sam build
sam deploy --guided   # 2回目以降は sam deploy
```

- Stack Name：`buten-ticket-backend`
- Region：`ap-northeast-1`
- NotificationEmail：予約の通知を受け取るアドレス
- SenderEmail：手順1で検証した送信元アドレス
- AllowedOrigins：そのままで OK（本番サイトとローカル確認用）

### 3. サイトに API をつなぐ

デプロイの出力に出る `ApiEndpoint` を、`ticket-config.js` の `apiEndpoint` に貼る。
空のあいだはテストモード（送信しても予約されない）。

### 4. 受付を始める・締め切る

両方の設定の `status` を `"open"`（受付中）、`"before"`（受付開始前）、`"closed"`（受付終了）のどれかにする。
公演日を過ぎると、設定に関係なく受付は自動で終わる。

## 運営で使う道具

AWS の認証情報（`aws configure` など）が設定されたパソコンで、最初に `backend/ticket` で `npm install` を実行しておく。

```bash
# 予約一覧を CSV に書き出す（フリガナ順。Excel でそのまま開ける。当日の受付名簿に）
npm run export -- reservations.csv

# 予約をキャンセルして、枚数を空き席に戻す
npm run cancel -- BT-XXXXXX
```

キャンセル・変更の連絡は、お問い合わせフォームの件名「20周年記念公演のチケットについて」で届きます。
この件名をメールに日本語で出すには、お問い合わせフォームの API（`backend/`）もデプロイし直す。
