// Generates a short-lived Stripe-hosted onboarding URL for a connected account.
// Use this to direct merchants to complete or fix their verification requirements.
// Account links expire after ~5 minutes — always generate fresh, never store them.
// type: 'account_onboarding' = first-time setup; 'account_update' = fix existing requirements
const stripe = require('./client');

async function run() {
  const accountLink = await stripe.accountLinks.create({
    account: 'acct_1TdQ9OA7CEFuKdiB',
    refresh_url: 'https://example.com/reauth',
    return_url: 'https://example.com/return',
    type: 'account_onboarding',
  });

  console.log(JSON.stringify(accountLink, null, 2));
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});
