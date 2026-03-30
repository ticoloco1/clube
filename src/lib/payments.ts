export type PaymentType = 'video' | 'cv' | 'subscription' | 'slug_sale' | 'slug_auction' | 'slug_renewal';

interface PaymentConfig {
  itemId: string;
  type: PaymentType;
  price: number;
  creatorWallet?: string; 
  userId: string;
}

export const handleTrustBankPayment = async (config: PaymentConfig) => {
  // ⚠️ DON'T FORGET TO ADD YOUR WALLET ADDRESS
  const YOUR_WALLET = "0xf841d9F5ba7eac3802e9A476a85775e23d084BBe"; 
  
  if (!process.env.NEXT_PUBLIC_HELIO_API_KEY) {
    console.error("Missing Helio API Key");
    return;
  }

  let splitPayments: any[] = [];
  let name = `TrustBank - ${config.type.toUpperCase()}`;
  let interval: string | undefined = undefined;

  switch (config.type) {
    case 'video':
      name = `Premium Video Unlock: ${config.itemId}`;
      splitPayments = [
        { address: config.creatorWallet, share: 70 },
        { address: YOUR_WALLET, share: 30 }
      ];
      break;
    case 'cv':
      name = `Resume/CV Unlock: ${config.itemId}`;
      splitPayments = [
        { address: config.creatorWallet, share: 50 },
        { address: YOUR_WALLET, share: 50 }
      ];
      break;
    case 'slug_sale':
      name = `Domain Purchase: ${config.itemId}`;
      splitPayments = [
        { address: config.creatorWallet, share: 90 },
        { address: YOUR_WALLET, share: 10 }
      ];
      break;
    case 'slug_auction':
      name = `Auction Winner: ${config.itemId}`;
      splitPayments = [
        { address: config.creatorWallet, share: 85 },
        { address: YOUR_WALLET, share: 15 }
      ];
      break;
    case 'slug_renewal':
      name = `Annual Slug Maintenance: ${config.itemId}`;
      break;
    case 'subscription':
      name = `TrustBank PRO Membership`;
      interval = 'month';
      break;
  }

  const endpoint = interval 
    ? 'https://api.helio.cash/v1/subscriptions/create' 
    : 'https://api.helio.cash/v1/paylink/create/fixed';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_HELIO_API_KEY}`
      },
      body: JSON.stringify({
        amount: (config.price * 100).toString(),
        currency: 'USDC',
        network: 'polygon',
        paymentMethods: ['card', 'wallet'],
        name,
        interval,
        splitPayments: splitPayments.length > 0 ? splitPayments : undefined,
        metaData: {
          user_id: config.userId,
          type: config.type,
          item_id: config.itemId
        },
        returnUrl: `${window.location.origin}/dashboard?payment=success`,
      }),
    });

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      console.error("Helio API Error:", data);
    }
  } catch (error) {
    console.error("Payment processing error:", error);
  }
};
