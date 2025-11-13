import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { customer_id, pet_name } = req.body;

  if (!customer_id || !pet_name) {
    return res.status(400).json({
      error: "Missing customer_id or pet_name",
    });
  }

  try {
    const mutation = `
      mutation updateCustomerMeta($customerId: ID!, $petName: String!) {
        customerUpdate(input: {
          id: $customerId,
          metafields: [
            {
              namespace: "pets",
              key: "name",
              type: "single_line_text_field",
              value: $petName
            }
          ]
        }) {
          customer { id }
          userErrors { field message }
        }
      }
    `;

    const response = await axios.post(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/graphql.json`,
      {
        query: mutation,
        variables: {
          customerId: `gid://shopify/Customer/${customer_id}`,
          petName: pet_name,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error(error.response?.data || error);
    return res.status(500).json({
      error: "Server error",
      details: error.response?.data,
    });
  }
}
