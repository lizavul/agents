// Requests a capability on a connected account (sets requested: true).
// In test mode this usually activates immediately.
// In live mode it may go through 'pending' — listen for account.updated via webhook_listener.js to track the status change.
const stripe = require('./client');

async function run() {
  const capability = await stripe.accounts.updateCapability(
    'acct_REPLACE_ME',
    'card_payments',
    { requested: true }
  );

  console.log(JSON.stringify(capability, null, 2));
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});
