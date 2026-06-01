// Creates a new Connect-managed account (custom/platform-controlled).
// - fees.payer: 'application' means the platform pays Stripe fees
// - losses.payments: 'application' means the platform covers negative balances
// - stripe_dashboard.type: 'none' — no Stripe-hosted dashboard; platform owns the UX
// - requirement_collection: 'application' — platform collects KYC, not Stripe
// - capabilities must be requested upfront when requirement_collection is 'application'
const stripe = require('./client');

async function run() {
  const account = await stripe.accounts.create({
    country: 'IE',
    email: 'liza.vul@example.com',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    controller: {
      fees: {
        payer: 'application',
      },
      losses: {
        payments: 'application',
      },
      stripe_dashboard: {
        type: 'none',
      },
      requirement_collection: 'application',
    },
  });

  console.log(JSON.stringify(account, null, 2));
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});
