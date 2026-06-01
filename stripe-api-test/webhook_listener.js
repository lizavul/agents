// Local webhook listener for testing Stripe events.
// Run this in one terminal and leave it running, then in another run:
//   stripe listen --forward-to localhost:3000/webhook
// The Stripe CLI will print a whsec_... secret — add it to .env as STRIPE_WEBHOOK_SECRET.
// If STRIPE_WEBHOOK_SECRET is not set, signature verification is skipped (fine for local testing).
const express = require('express');
const stripe = require('./client');
const { fulfillOrder } = require('./create_transfer');

// Set to true to auto-trigger the transfer from the webhook (production-like).
// Set to false to just log events — run create_transfer.js manually instead.
const AUTO_TRANSFER = false;

const app = express();

function isAccountUpdateType(type) {
  return (
    type === 'account.updated' ||
    type === 'v2.core.account.updated' ||
    (type.startsWith('v2.core.account') && type.endsWith('.updated'))
  );
}

function isCapabilityType(type) {
  return type === 'capability.updated' || type.includes('capability_status_updated');
}

async function logAccountState(accountId, label) {
  const account = await stripe.accounts.retrieve(accountId);
  console.log(`\n${label} — ${account.id}`);
  console.log('  charges_enabled:', account.charges_enabled);
  console.log('  payouts_enabled:', account.payouts_enabled);
  console.log('  capabilities:', JSON.stringify(account.capabilities, null, 4));
  console.log('  requirements.currently_due:', account.requirements?.currently_due);
}

async function parseWebhook(req) {
  const sig = req.headers['stripe-signature'];
  const rawBody = req.body;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;

  if (!webhookSecret) {
    return { kind: 'event', event: JSON.parse(bodyString) };
  }

  const peek = JSON.parse(bodyString);

  // Thin / v2 event notifications (API 2026+ Connect events from stripe listen)
  if (peek.object === 'v2.core.event') {
    const notification = await stripe.parseEventNotificationAsync(
      rawBody,
      sig,
      webhookSecret
    );
    return { kind: 'notification', notification };
  }

  const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  return { kind: 'event', event };
}

function accountIdFromEvent(event) {
  return event.data?.object?.id || event.account;
}

app.use('/webhook', express.raw({ type: 'application/json' }));

app.post('/webhook', async (req, res) => {
  try {
    const parsed = await parseWebhook(req);

    if (parsed.kind === 'notification') {
      const { notification } = parsed;
      console.log(`\n[webhook] ${notification.type} (${notification.id})`);

      if (isAccountUpdateType(notification.type) && notification.related_object?.id) {
        await logAccountState(notification.related_object.id, notification.type);
      } else if (isCapabilityType(notification.type) && notification.related_object?.id) {
        console.log('  related account:', notification.related_object.id);
      }

      return res.sendStatus(200);
    }

    const { event } = parsed;
    console.log(`\n[webhook] ${event.type} (${event.id})`);

    if (isAccountUpdateType(event.type)) {
      const accountId = accountIdFromEvent(event);
      if (accountId) {
        await logAccountState(accountId, event.type);
      } else {
        console.log('  (no account id on event — check event.data.object)');
      }
    } else if (isCapabilityType(event.type)) {
      console.log('  account:', event.account);
      console.log('  capability:', event.data?.object?.id, event.data?.object?.status);
    }

    // Payment authorised — for card payments this fires with payment_status 'paid' and we
    // transfer immediately. For async methods (bank transfer etc.) it fires as 'unpaid' —
    // we wait for async_payment_succeeded before transferring.
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log(`\ncheckout.session.completed — ${session.id}`);
      console.log('  payment_status:', session.payment_status);
      console.log('  amount_total:', session.amount_total, session.currency);
      if (session.payment_status === 'paid') {
        if (AUTO_TRANSFER) await fulfillOrder(session);
        else console.log('  → AUTO_TRANSFER is off — run create_transfer.js manually');
      }
    }

    if (event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object;
      console.log(`\ncheckout.session.async_payment_succeeded — ${session.id}`);
      if (AUTO_TRANSFER) await fulfillOrder(session);
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object;
      console.log(`\ncheckout.session.async_payment_failed — ${session.id}`);
      console.log('  customer_email:', session.customer_details?.email);
      console.log('  → contact customer to place a new order');
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(`Webhook error: ${err.message}`);
    res.sendStatus(400);
  }
});

app.listen(3000, () => {
  console.log('Webhook listener running on http://localhost:3000');
  console.log('Leave this terminal open — event logs appear here.');
});
