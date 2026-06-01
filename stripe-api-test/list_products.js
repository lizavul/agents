// Sanity-check script — lists up to 5 products to verify the API key is working.
const stripe = require('./client');

async function run() {
  const products = await stripe.products.list({ limit: 5 });
  console.log(JSON.stringify(products.data, null, 2));
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});
