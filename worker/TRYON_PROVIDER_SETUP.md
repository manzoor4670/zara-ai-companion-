# Zara Dress Change: optional Replicate integration

This branch includes an optional third-party virtual try-on adapter. It is disabled until deliberately configured. Existing legacy provider mode still works.

## Cloudflare Worker settings

In Cloudflare > Workers & Pages > `muddy-bread-fc64zara-ai-tryon` > Settings > Variables and Secrets:

- `TRYON_PROVIDER` = `replicate` (ordinary variable)
- `REPLICATE_API_TOKEN` = your private Replicate token (Secret; **never** paste into GitHub or frontend)
- Do not set these until billing and provider privacy terms have been reviewed.

The Worker sends the chosen avatar and clothing photos to the Replicate `prunaai/p-image-try-on` endpoint. Its input is `person_image` plus `garment_images`. Third-party processing is **not private/on-device**, and generation may cost money. Only use photos you are authorized to upload. Replicate pricing, data retention, licensing and terms must be reviewed before enabling.

The synchronous request waits for the provider. If it is still processing, the response warns against immediately resubmitting: doing so could result in an additional paid generation. An asynchronous job-status flow is not yet implemented.

## Testing

Run `node worker/tryon.test.mjs`. The Replicate success case is **mocked** and sends no images or token over the internet.

## Important limits

- A green test does NOT imply real images are generated successfully.
- No token is configured by this PR.
- This does NOT change Zara's live production Worker.
- The provider URL is deliberately fixed to the official API host so untrusted frontend requests cannot redirect the token.
- If users need a free option, use the existing manual upload/export feature while a free provider is evaluated.
