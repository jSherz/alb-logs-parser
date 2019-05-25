import { handler } from "./index";

/**
 * Run the handler locally (without Lambda) for testing. Only the parts of the
 * event & context etc that we used are provided.
 */
(async () => {
  await handler(
    {
      Records: [
        {
          s3: {
            object: {
              key: process.env.TEST_KEY,
            },
            bucket: {
              name: process.env.TEST_BUCKET,
            },
          },
        } as any,
      ],
    },
    null as any,
    null as any,
  );
})().catch(console.error);
