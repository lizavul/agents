// Creates a Checkout Session using separate charges and transfers.
// Unlike destination charges, the full payment lands on the PLATFORM account first.
// After payment succeeds, a separate Transfer is made to the connected account (see create_transfer.js).
// transfer_group links the charge and the transfer(s) together — use a unique order/session ID.
// unit_amount is in the smallest currency unit (cents) — 10000 = $100.00
// success_url receives the session ID so you can look up the PaymentIntent and transfer funds.
const stripe = require('./client');

async function run() {
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Restaurant delivery service',
          },
          unit_amount: 200, // $2.00
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      transfer_group: 'ORDER100', // links this charge to any transfers made for this order
    },
    mode: 'payment',
    success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
  });

  console.log(JSON.stringify(session, null, 2));
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});
