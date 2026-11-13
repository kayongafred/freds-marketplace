type ListingWebhook = {
  type?: string;
  table?: string;
  schema?: string;
  record?: {
    id?: string;
    name?: string;
    category?: string;
    price?: number | string;
    seller?: string;
    email?: string;
    phone?: string;
    address?: string;
    description?: string;
  };
};

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookSecret = Deno.env.get("NOTIFICATION_WEBHOOK_SECRET");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const recipient = Deno.env.get("NOTIFICATION_EMAIL") || "kayongafred87@gmail.com";
  const sender = Deno.env.get("RESEND_FROM");

  if (!webhookSecret || request.headers.get("authorization") !== `Bearer ${webhookSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!resendApiKey || !sender) {
    return Response.json({ error: "Email provider is not configured." }, { status: 503 });
  }

  let payload: ListingWebhook;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  if (payload.type !== "INSERT" || payload.table !== "listings" || payload.schema !== "public") {
    return Response.json({ ignored: true });
  }

  const listing = payload.record;
  if (!listing?.id || !listing.name || !listing.category) {
    return Response.json({ error: "Listing details are missing." }, { status: 400 });
  }

  const emailBody = [
    "A seller published a new product on Kayonga eMarket.",
    "",
    `Product: ${listing.name}`,
    `Category: ${listing.category}`,
    `Price: ${listing.price ?? "Not provided"}`,
    `Seller: ${listing.seller ?? "Not provided"}`,
    `Seller email: ${listing.email ?? "Not provided"}`,
    `Seller phone: ${listing.phone ?? "Not provided"}`,
    `Seller address: ${listing.address ?? "Not provided"}`,
    `Description: ${listing.description ?? "Not provided"}`,
    `Listing ID: ${listing.id}`
  ].join("\n");

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: sender,
      to: [recipient],
      subject: `New Kayonga eMarket listing: ${listing.name}`,
      text: emailBody
    })
  });

  if (!emailResponse.ok) {
    console.error("Resend request failed:", emailResponse.status, await emailResponse.text());
    return Response.json({ error: "Email delivery failed." }, { status: 502 });
  }

  return Response.json({ sent: true });
});
