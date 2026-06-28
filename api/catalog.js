export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Fetch all pages of ITEMS
    let items = [];
    let cursor = null;
    do {
      const url = cursor
        ? `https://connect.squareup.com/v2/catalog/list?types=ITEM&cursor=${cursor}`
        : 'https://connect.squareup.com/v2/catalog/list?types=ITEM';
      const response = await fetch(url, {
        headers: {
          'Square-Version': '2024-01-18',
          'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data });
      items = items.concat(data.objects || []);
      cursor = data.cursor || null;
    } while (cursor);

    // Fetch all pages of IMAGES separately
    let images = [];
    cursor = null;
    do {
      const url = cursor
        ? `https://connect.squareup.com/v2/catalog/list?types=IMAGE&cursor=${cursor}`
        : 'https://connect.squareup.com/v2/catalog/list?types=IMAGE';
      const response = await fetch(url, {
        headers: {
          'Square-Version': '2024-01-18',
          'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) break;
      images = images.concat(data.objects || []);
      cursor = data.cursor || null;
    } while (cursor);

    // Build image map
    const imageMap = {};
    images.forEach(img => {
      imageMap[img.id] = img.image_data?.url || null;
    });

    const products = items.map(item => {
      const variations = item.item_data?.variations || [];
      const firstVariation = variations[0];
      const priceAmount = firstVariation?.item_variation_data?.price_money?.amount || 0;
      const imageId = item.item_data?.image_ids?.[0] || item.image_ids?.[0] || null;
      const imageUrl = imageId ? imageMap[imageId] : null;

      return {
        id: item.id,
        name: item.item_data?.name || '',
        description: item.item_data?.description || '',
        price: priceAmount,
        priceFormatted: `$${(priceAmount / 100).toFixed(2)}`,
        currency: firstVariation?.item_variation_data?.price_money?.currency || 'USD',
        imageUrl,
        variants: variations.map(v => ({
          id: v.id,
          name: v.item_variation_data?.name || '',
          price: v.item_variation_data?.price_money?.amount || priceAmount,
          priceFormatted: `$${((v.item_variation_data?.price_money?.amount || priceAmount) / 100).toFixed(2)}`,
          sku: v.item_variation_data?.sku || '',
        })),
      };
    });

    res.status(200).json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
