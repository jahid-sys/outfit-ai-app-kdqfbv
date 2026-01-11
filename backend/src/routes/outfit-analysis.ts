import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { gateway } from '@specific-dev/framework';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { App } from '../index.js';

// Schema for the outfit analysis response
const outfitAnalysisSchema = z.object({
  category: z.enum(['Sport', 'Casual', 'Professional', 'Chill']),
  explanation: z.string(),
  confidence: z.string(),
});

type OutfitAnalysis = z.infer<typeof outfitAnalysisSchema>;

export function register(app: App, fastify: FastifyInstance) {
  fastify.post<{ Reply: OutfitAnalysis }>(
    '/api/analyze-outfit',
    {
      schema: {
        description: 'Analyze an outfit image and categorize it',
        tags: ['outfit-analysis'],
        response: {
          200: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                enum: ['Sport', 'Casual', 'Professional', 'Chill'],
                description: 'The category of the outfit',
              },
              explanation: {
                type: 'string',
                description: 'Brief explanation of the categorization (2-3 sentences)',
              },
              confidence: {
                type: 'string',
                description: 'Confidence level of the analysis',
              },
            },
            required: ['category', 'explanation', 'confidence'],
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Get the uploaded file with size limit
        const data = await request.file({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit
        if (!data) {
          return reply.status(400).send({ error: 'No file provided' });
        }

        // Convert file to buffer
        let buffer: Buffer;
        try {
          buffer = await data.toBuffer();
        } catch (err) {
          return reply
            .status(413)
            .send({ error: 'File size limit exceeded (max 10MB)' });
        }

        // Convert buffer to base64
        const base64 = buffer.toString('base64');

        // Analyze the outfit using GPT-5.2 vision
        const { object } = await generateObject({
          model: gateway('openai/gpt-5.2'),
          schema: outfitAnalysisSchema,
          schemaName: 'OutfitAnalysis',
          schemaDescription:
            'Outfit analysis with category, explanation, and confidence level',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  image: base64,
                },
                {
                  type: 'text',
                  text: `Analyze this outfit photo and categorize it into one of these categories: Sport, Casual, Professional, or Chill.

Provide:
1. category: One of "Sport", "Casual", "Professional", or "Chill"
2. explanation: A 2-3 sentence explanation focusing on style, formality, and use case
3. confidence: Your confidence level in this categorization (e.g., "High", "Medium", "Low")

Consider the following:
- Sport: Athletic wear, gym clothes, sports equipment visible
- Casual: Comfortable everyday wear, jeans, t-shirts, sneakers
- Professional: Business attire, formal wear, work-appropriate
- Chill: Relaxed, comfortable home wear, loungewear, laid-back style`,
                },
              ],
            },
          ],
        });

        return object;
      } catch (error) {
        app.logger.error(error, 'Error analyzing outfit');
        return reply
          .status(500)
          .send({ error: 'Failed to analyze outfit image' });
      }
    }
  );
}
