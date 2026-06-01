// Fetches a PaymentIntent — typically using the ID from checkout.session.payment_intent.
// Key field for marketplace flows: transfer_group (must match the transfer you create later).
// Run after checkout completes: node retrieve_payment_intent.js
const stripe = require('./client');

async function run() {
  const paymentIntent = await stripe.paymentIntents.retrieve('pi_3TdR8vPKfI5PdBj10mobJCLo');

  console.log(JSON.stringify(paymentIntent, null, 2));
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});
