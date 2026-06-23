export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sourceId, items, customerEmail, customerName } = req.body;
  if (!sourceId || !items || items.length === 0)
    return res.status(400).json({ error: 'Missing sourceId or items' });

  const totalAmount = items.reduce((sum, item) => sum + Math.round(item.price * 100) * (item.quantity || item.qty || 1), 0);

  try {
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const response = await fetch('https://connect.squareup.com/v2/payments', {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        source_id: sourceId,
        amount_money: { amount: totalAmount, currency: 'USD' },
        location_id: process.env.SQUARE_LOCATION_ID,
        buyer_email_address: customerEmail || undefined,
        note: `Shield Pros Shop — ${items.map(i => `${i.name} x${i.quantity || i.qty || 1}`).join(', ')}`,
      }),
    });

    const data = await response.json();
    if (!response.ok || data.errors)
      return res.status(400).json({ error: data.errors?.[0]?.detail || 'Payment failed' });

    res.status(200).json({ success: true, paymentId: data.payment?.id, status: data.payment?.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
