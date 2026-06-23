export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const response = await fetch('https://connect.squareup.com/v2/catalog/list?types=ITEM,IMAGE', {
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data });

    const allObjects = data.objects || [];
    const items = allObjects.filter(obj => obj.type === 'ITEM');
    const images = allObjects.filter(obj => obj.type === 'IMAGE');

    const imageMap = {};
    images.forEach(img => {
      imageMap[img.id] = img.image_data?.url || null;
    });

    const products = items.map(item => {
      const variation = item.item_data?.variations?.[0];
      const priceAmount = variation?.item_variation_data?.price_money?.amount || 0;
      const imageId = item.item_data?.image_ids?.[0] || item.image_ids?.[0];

      return {
        id: item.id,
        variationId: variation?.id,
        name: item.item_data?.name || '',
        description: item.item_data?.description || '',
        price: priceAmount,
        priceFormatted: `$${(priceAmount / 100).toFixed(2)}`,
        currency: variation?.item_variation_data?.price_money?.currency || 'USD',
        imageUrl: imageId ? imageMap[imageId] : null,
      };
    });

    res.status(200).json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
