export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { items } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'No items provided' });

  try {
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const lineItems = items.map(i => ({
      name: i.name,
      quantity: String(i.quantity || i.qty || 1),
      base_price_money: {
        amount: Math.round((i.price || 0) * 100),
        currency: 'USD'
      }
    }));

    const response = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        order: {
          location_id: process.env.SQUARE_LOCATION_ID,
          line_items: lineItems
        },
        checkout_options: {
          allow_tipping: false,
          redirect_url: 'https://www.shieldproshop.com',
          merchant_support_email: 'shieldprosfilms@gmail.com'
        }
      })
    });

    const data = await response.json();
    if (!response.ok || data.errors) {
      return res.status(400).json({ error: data.errors?.[0]?.detail || 'Checkout failed' });
    }

    res.status(200).json({ checkoutUrl: data.payment_link?.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
