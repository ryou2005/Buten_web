const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

// Initialize clients
const sesClient = new SESClient({});

// Environment variables
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || "admin@example.com";
const SENDER_EMAIL = process.env.SENDER_EMAIL || "noreply@example.com";

/**
 * Validate form data
 */
function validateFormData(data) {
  const errors = [];
  
  if (!data.name || data.name.trim() === "") {
    errors.push("お名前は必須です");
  }
  
  if (!data.email || data.email.trim() === "") {
    errors.push("メールアドレスは必須です");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("メールアドレスの形式が正しくありません");
  }
  
  if (!data.subject || data.subject.trim() === "") {
    errors.push("件名は必須です");
  }
  
  if (!data.message || data.message.trim() === "") {
    errors.push("お問い合わせ内容は必須です");
  }

  if (data.privacyConsent !== true) {
    errors.push("個人情報の取り扱いへの同意が必要です");
  }
  
  return errors;
}

/**
 * Get subject label in Japanese
 */
function getSubjectLabel(subject) {
  const labels = {
    trial: "体験レッスンのお申し込み",
    performance: "演奏のご依頼",
    workshop: "ワークショップのお申込み",
    ticket: "20周年記念公演のチケットについて",
    question: "ご質問・その他"
  };
  return labels[subject] || subject;
}

/**
 * Send notification email via SES
 */
async function sendNotificationEmail(data) {
  const subjectLabel = getSubjectLabel(data.subject);
  
  const emailBody = `
和太鼓 武天 ウェブサイトにお問い合わせが届きました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【お名前】
${data.name}

【メールアドレス】
${data.email}

【電話番号】
${data.tel || "未入力"}

【件名】
${subjectLabel}

【お問い合わせ内容】
${data.message}

【個人情報の取り扱いへの同意】
同意済み
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

送信日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
`;

  await sesClient.send(new SendEmailCommand({
    Source: SENDER_EMAIL,
    Destination: {
      ToAddresses: [NOTIFICATION_EMAIL]
    },
    // 「返信」を押すと問い合わせ者本人宛てになるようにする
    ReplyToAddresses: [data.email.trim()],
    Message: {
      Subject: {
        Data: `【武天】${subjectLabel} - ${data.name}様`,
        Charset: "UTF-8"
      },
      Body: {
        Text: {
          Data: emailBody,
          Charset: "UTF-8"
        }
      }
    }
  }));
}

/**
 * Create response with CORS headers
 */
function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

/**
 * Lambda handler
 */
exports.handler = async (event) => {
  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, { message: "OK" });
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return createResponse(405, { error: "Method not allowed" });
  }

  try {
    // Parse request body
    let data;
    try {
      data = JSON.parse(event.body);
    } catch {
      return createResponse(400, { error: "Invalid JSON" });
    }

    // Validate form data
    const errors = validateFormData(data);
    if (errors.length > 0) {
      return createResponse(400, { error: "Validation failed", details: errors });
    }

    // Send notification email
    // 送信に失敗した場合は下の catch でエラーを返し、利用者に再送や別の連絡手段を促す
    await sendNotificationEmail(data);
    console.log("Notification email sent");

    return createResponse(200, {
      success: true,
      message: "お問い合わせを受け付けました。ありがとうございます。"
    });

  } catch (error) {
    console.error("Error processing request:", error);
    return createResponse(500, {
      error: "送信に失敗しました。お手数ですが、しばらくしてから再度お試しいただくか、InstagramまたはFacebookのDMよりご連絡ください。"
    });
  }
};
