// Fetches the full account object for a connected account.
// Key fields to check: charges_enabled, payouts_enabled, capabilities, requirements.currently_due
const stripe = require('./client');

async function run() {
  const account = await stripe.accounts.retrieve('acct_1TcOQrPMcRPqYP9Z');

  console.log(JSON.stringify(account, null, 2));
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});
