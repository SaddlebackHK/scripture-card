// One-shot: writes the `email-templates/scripture-card` document that the
// Trigger Email extension renders for every claim confirmation. Re-running is
// safe — it overwrites with the latest template.
//
// Prerequisite (one-time per machine):
//   gcloud auth application-default login
// or set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON path. The
// Firebase Admin SDK auto-discovers either.
//
// Usage:  node scripts/seed-email-template.mjs

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'scripture-card';
const TEMPLATE_ID = 'scripture-card';

// Handlebars vars available from mail/<id>.template.data:
//   {{name}}       — claimant display name (escaped by default)
//   {{dateLabel}}  — zh-Hant date label e.g. 五月十六日
//   {{month}}      — 1..12
//   {{day}}        — 1..31
//
// The card image is attached at the mail/<id>.attachments level with
// cid=cardImage, so the body references it via `src="cid:cardImage"`.
const SUBJECT = '你的 {{dateLabel}} 靈修卡 · Saddleback Church 香港';

const HTML = String.raw`<!DOCTYPE html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>你的 {{dateLabel}} 靈修卡</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f1ea;font-family:'Noto Serif TC','PingFang TC','Songti TC',serif;color:#1a1410;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f1ea;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
            <tr>
              <td style="padding:0 0 24px;">
                <p style="margin:0;font-size:14px;letter-spacing:0.18em;color:#6b5b4a;">親愛的 {{name}}，</p>
                <p style="margin:12px 0 0;font-size:15px;line-height:1.85;color:#3a2f26;">
                  以下是你領取的 <strong style="color:#1a1410;">{{dateLabel}}</strong> 靈修卡。
                  願這段經文成為你今日的提醒。
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:4px 0;">
                <img src="cid:cardImage" alt="{{dateLabel}}靈修卡" width="500"
                     style="display:block;max-width:100%;height:auto;border-radius:16px;" />
              </td>
            </tr>
            <tr>
              <td style="padding:32px 0 0;">
                <p style="margin:0;font-size:13px;line-height:1.75;color:#6b5b4a;">
                  你可以隨時造訪
                  <a href="https://scripture-card.web.app" style="color:#8b6b33;text-decoration:underline;">scripture-card.web.app</a>
                  查看其他日子的靈修卡。
                </p>
                <hr style="border:0;border-top:1px solid #d8cdb6;margin:24px 0;" />
                <p style="margin:0;font-size:11px;letter-spacing:0.22em;color:#9a8b78;text-transform:uppercase;">
                  Saddleback Church Hong Kong
                </p>
                <p style="margin:8px 0 0;font-size:11px;line-height:1.7;color:#9a8b78;">
                  此郵件由系統自動發送，請勿直接回覆。
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
});

const db = getFirestore();
const ref = db.collection('email-templates').doc(TEMPLATE_ID);

await ref.set({ subject: SUBJECT, html: HTML });

console.log(`Wrote email-templates/${TEMPLATE_ID} on project ${PROJECT_ID}.`);
process.exit(0);
