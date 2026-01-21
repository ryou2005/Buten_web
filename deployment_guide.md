# AWS デプロイ手順書

このドキュメントでは、本ウェブサイト（和太鼓 武天）をAWSにデプロイする手順を説明します。
システムは以下の2つの部分で構成されています。

1.  **フロントエンド**: ユーザーが見るウェブサイト（HTML/CSS/JS）。AWS S3 と CloudFront で配信します。
2.  **バックエンド**: お問い合わせフォーム機能。AWS Lambda と API Gateway で動作します。

---

## 0. 事前準備

以下のツールがインストールされていることを確認してください。

- **AWS CLI**: AWSのリソースを操作するコマンドラインツール
  - インストール後、`aws configure` で認証情報を設定してください。
- **AWS SAM CLI**: サーバーレスアプリケーションをデプロイするツール
- **Node.js**: ビルド環境

---

## 1. バックエンドのデプロイ

お問い合わせフォームの機能をAWS上に構築します。

1.  **ディレクトリの移動**

    ```bash
    cd backend
    ```

2.  **ビルド**

    ```bash
    sam build
    ```

3.  **デプロイ（初回）**
    以下のコマンドを実行し、対話モードで設定を行います。

    ```bash
    sam deploy --guided
    ```

    **設定の例:**
    - **Stack Name**: `buten-backend` （任意の名前）
    - **AWS Region**: `ap-northeast-1` （東京リージョン推奨）
    - **NotificationEmail**: `contact@wadaiko-buten.com` （お問い合わせ通知を受け取るメールアドレス）
    - **SenderEmail**: `noreply@wadaiko-buten.com` （送信元メールアドレス。※SESで検証済みである必要があります）
    - **Confirm changes before deploy**: `y`
    - **Allow SAM CLI IAM role creation**: `y`
    - **Disable rollback**: `n`
    - **ContactFormApi may not have authorization defined**: `y` （認証なしでPOSTを受け付けるため）
    - **Save arguments to configuration file**: `y`

    デプロイが完了すると、画面に `Outputs` が表示されます。その中の **`ApiEndpoint`** のURL（例: `https://xxxxxx.execute-api.ap-northeast-1.amazonaws.com/production/contact`）を控えてください。

---

## 2. フロントエンドの設定更新

バックエンドのURLをフロントエンドに反映させます。

1.  **ファイルの編集**
    `contact.html` を開き、フォームの `action` または JavaScript の送信先設定を探します（現在は `contact.html` の `<form>` タグ内にある `data-api-endpoint` 属性、または `main.js` 内の定数を確認してください）。

    ```html
    <!-- contact.html の例 -->
    <form
      id="contact-form"
      class="contact-form"
      data-api-endpoint="【ここにステップ1で控えたURLを入力】"
    ></form>
    ```

---

## 3. フロントエンドのビルドと公開

ウェブサイトのファイルを最適化してアップロードします。

1.  **プロジェクトルートに戻る**

    ```bash
    cd ..
    ```

2.  **ビルド**

    ```bash
    npm run build
    ```

    `dist` フォルダに公開用のファイルが生成されます。

3.  **S3バケットの作成（まだない場合）**
    AWSコンソールまたはCLIで、ウェブサイトホスティング用のS3バケットを作成します。

4.  **アップロード**
    生成された `dist` フォルダの中身をS3バケットにアップロードします。

    ```bash
    aws s3 sync dist/ s3://【あなたのバケット名】 --delete
    ```

5.  **（推奨）CloudFrontの設定**
    HTTPS化と高速化のため、CloudFrontディストリビューションを作成し、オリジンとして上記S3バケットを設定することをお勧めします。

---

## 4. 動作確認

1.  公開されたURLにアクセスし、ウェブサイトが表示されることを確認します。
2.  お問い合わせフォームからテスト送信を行い、指定したメールアドレスに通知が届くことを確認します。
    （※注意: 初回はSESのサンドボックス制限により、送信元・送信先メールアドレス共に検証済みである必要があります）
