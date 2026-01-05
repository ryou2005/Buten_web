# Buten Contact Form Backend

お問い合わせフォームのバックエンド（AWS Lambda + API Gateway + DynamoDB + SES）

## 前提条件

- AWS CLI がインストール・設定済み
- AWS SAM CLI がインストール済み
- Node.js 20.x

## セットアップ

```bash
cd backend
npm install
```

## ローカルテスト

```bash
sam local start-api
```

## デプロイ

### 初回デプロイ

```bash
sam build
sam deploy --guided
```

プロンプトで以下を設定:

- **Stack Name**: `buten-contact-backend`
- **NotificationEmail**: 通知を受け取るメールアドレス
- **SenderEmail**: 送信元メールアドレス（SES で事前検証必要）

### 2 回目以降

```bash
sam build && sam deploy
```

## デプロイ後の設定

1. **API Gateway URL を取得**

   - デプロイ出力の `ApiEndpoint` をコピー

2. **フロントエンドに設定**

   - `contact.html` の `data-api-endpoint` 属性を更新:

   ```html
   <form
     class="contact-form"
     data-api-endpoint="https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/production/contact"
   ></form>
   ```

3. **SES でメールアドレスを検証**
   - AWS コンソール → SES → Verified identities
   - 送信元・送信先のメールアドレスを検証
   - 本番運用にはサンドボックス解除申請が必要

## 環境変数

| 変数名               | 説明                 |
| -------------------- | -------------------- |
| `TABLE_NAME`         | DynamoDB テーブル名  |
| `NOTIFICATION_EMAIL` | 通知先メールアドレス |
| `SENDER_EMAIL`       | 送信元メールアドレス |
