// Transfers funds from the platform account to a connected account after a charge.
// Can be triggered automatically from webhook_listener.js or run manually.
// amount is in cents — 7000 = $70.00 (platform keeps the $30.00 difference as fee)
// transfer_group must match the one set in create_checkout_session.js to link them together.
// destination is the connected account ID — looked up server-side from your DB, never from the client.
const stripe = require('./client');

const PLATFORM_FEE = 3000; // $30.00 kept by the platform

// Called automatically by webhook_listener.js when checkout.session.completed fires.
// In production, replace connectedAccountId lookup with a real DB query using session metadata.
async function fulfillOrder(session) {
  const transferAmount = session.amount_total - PLATFORM_FEE;
  const connectedAccountId = 'acct_REPLACE_ME';

  const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);

  const transfer = await stripe.transfers.create({
    amount: transferAmount,
    currency: session.currency,
    destination: connectedAccountId,
    transfer_group: paymentIntent.transfer_group,
  });

  console.log(`  → transfer created: ${transfer.id} (${transferAmount} ${session.currency} to ${connectedAccountId})`);
  return transfer;
}

// Manual test — run directly with: node stripe-api-test/create_transfer.js
async function run() {
  const transfer = await stripe.transfers.create({
    amount: 100, 
    currency: 'eur',
    destination: 'acct_1TcAetPKfIb1LCz4',
    transfer_group: 'ORDER100',
  });

  console.log(JSON.stringify(transfer, null, 2));
}

module.exports = { fulfillOrder };

if (require.main === module) {
  run().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
