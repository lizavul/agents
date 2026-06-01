// Shared Stripe client — imported by all test scripts.
// Reads STRIPE_SECRET_KEY from .env in this directory.
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in .env');
}

module.exports = Stripe(process.env.STRIPE_SECRET_KEY);
