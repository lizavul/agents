// Retrieves the status of a single capability on a connected account.
// Possible statuses: 'active', 'inactive', 'pending', 'unrequested'
// Swap 'card_payments' for 'transfers' or any other capability name as needed.
const stripe = require('./client');

async function run() {
  const capability = await stripe.accounts.retrieveCapability(
    'acct_1TcQFVAp8G85JGov',
    'card_payments'
  );

  console.log(JSON.stringify(capability, null, 2));
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});
