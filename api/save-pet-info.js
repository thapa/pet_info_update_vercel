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
    const customerId = `gid://shopify/Customer/${customer_id}`;
    const shopifyUrl = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/graphql.json`;
    const headers = {
      "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
      "Content-Type": "application/json",
    };

    const metafieldQuery = `
      query getCustomerPetInfo($customerId: ID!) {
        customer(id: $customerId) {
          metafield(namespace: "custom", key: "pet_info") {
            id
            value
          }
        }
      }
    `;

    const existingMetafieldResponse = await axios.post(
      shopifyUrl,
      {
        query: metafieldQuery,
        variables: { customerId },
      },
      { headers }
    );

    if (existingMetafieldResponse.data.errors?.length) {
      throw new Error(
        existingMetafieldResponse.data.errors
          .map((error) => error.message)
          .join(", ")
      );
    }

    const existingValue =
      existingMetafieldResponse.data?.data?.customer?.metafield?.value?.trim() || "";
    const newPetInfoValue = existingValue
      ? `${existingValue}, ${pet_name}`
      : pet_name;

    const mutation = `
      mutation updateCustomerMeta($customerId: ID!, $petInfoValue: String!) {
        customerUpdate(input: {
          id: $customerId,
          metafields: [
            {
              namespace: "custom",
              key: "pet_info",
              type: "single_line_text_field",
              value: $petInfoValue
            }
          ]
        }) {
          customer { id }
          userErrors { field message }
        }
      }
    `;

    const response = await axios.post(
      shopifyUrl,
      {
        query: mutation,
        variables: {
          customerId,
          petInfoValue: newPetInfoValue,
        },
      },
      { headers }
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
