// One-shot: writes a single doc to mail/ in the shape SubmitClaim will use,
// so we can verify the Trigger Email extension + Gmail SMTP credentials are
// wired before any app changes are deployed. The doc references a real
// claim, so we also create that first — same flow the client follows in
// production. Both writes use the privileged Admin SDK and therefore bypass
// Firestore rules, but the shape we write must still match what the rules
// will accept once the app submits real claims.
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=~/.config/scripture-card-admin.json \
//   TEST_EMAIL=you@example.com \
//   node scripts/send-test-mail.mjs [month] [day]
//
// month/day default to today's date.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PROJECT_ID = 'scripture-card';
const HOSTING_ORIGIN = 'https://scripture-card.web.app';

const to = process.env.TEST_EMAIL;
if (!to) {
  console.error('Set TEST_EMAIL to the recipient address.');
  process.exit(1);
}

const today = new Date();
const month = Number(process.argv[2] ?? today.getMonth() + 1);
const day = Number(process.argv[3] ?? today.getDate());

const pad2 = (n) => String(n).padStart(2, '0');
const filename = `${pad2(month)}-${pad2(day)}.jpg`;
const path = `${HOSTING_ORIGIN}/cards/${filename}`;

// Match the zh-Hant date label the app uses (e.g. 五月十六日). Kept inline
// here so the script has no app-code import.
const CN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const CN_MONTHS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const cnDay = (d) => {
  if (d < 10) return CN_DIGITS[d];
  if (d === 10) return '十';
  if (d < 20) return `十${CN_DIGITS[d - 10]}`;
  if (d === 20) return '二十';
  if (d < 30) return `二十${CN_DIGITS[d - 20]}`;
  if (d === 30) return '三十';
  return `三十${CN_DIGITS[d - 30]}`;
};
const dateLabel = `${CN_MONTHS[month - 1]}月${cnDay(day)}日`;

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

// Create a synthetic claim so the matchesClaim() rule check would pass.
const claimRef = await db.collection('claims').add({
  name: 'Test User',
  email: to,
  month,
  day,
  createdAt: FieldValue.serverTimestamp(),
});

// Then enqueue the mail doc exactly the way the use case will.
// Attachments must sit inside `message` — the Trigger Email extension reads
// payload.message.attachments when constructing the Nodemailer message.
const mailRef = await db.collection('mail').add({
  to,
  claimId: claimRef.id,
  template: {
    name: 'scripture-card',
    data: {
      name: 'Test User',
      dateLabel,
      month,
      day,
    },
  },
  message: {
    attachments: [
      {
        filename: `scripture-card-${filename}`,
        path,
        cid: 'cardImage',
      },
    ],
  },
  createdAt: FieldValue.serverTimestamp(),
});

console.log(`Queued mail/${mailRef.id} → ${to} (claim=${claimRef.id}, card=${filename}).`);
console.log('Watch the doc in Firestore Console: the extension will add a `delivery` field with status (PENDING → SUCCESS / ERROR).');
process.exit(0);
