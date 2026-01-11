import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { gateway } from '@specific-dev/framework';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import type { App } from '../index.js';

// Schema for the outfit analysis response
const outfitAnalysisSchema = z.object({
  category: z.enum(['Sport', 'Casual', 'Professional', 'Chill']),
  explanation: z.string(),
  confidence: z.string(),
});

type OutfitAnalysis = z.infer<typeof outfitAnalysisSchema>;

// Schema for outfit suggestion response
const outfitSuggestionResponseSchema = z.object({
  category: z.string(),
  explanation: z.string(),
  confidence: z.string(),
  suggestionImageUrl: z.string(),
});

export function register(app: App, fastify: FastifyInstance) {
  fastify.post<{ Reply: z.infer<typeof outfitSuggestionResponseSchema> }>(
    '/api/analyze-outfit',
    {
      schema: {
        description: 'Analyze an outfit image and generate a suggestion outfit',
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
              suggestionImageUrl: {
                type: 'string',
                description: 'URL to the generated outfit suggestion image',
              },
            },
            required: ['category', 'explanation', 'confidence', 'suggestionImageUrl'],
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

        // Generate outfit suggestion image based on category
        const categoryDescriptions: Record<string, string> = {
          Sport: 'athletic wear with performance fabrics, sneakers, and sport accessories for active activities',
          Casual: 'comfortable everyday outfit with jeans or casual pants, t-shirt or casual top, and comfortable sneakers',
          Professional: 'business suit or formal dress with polished shoes, subtle accessories, and a clean, professional appearance',
          Chill: 'relaxed and comfortable loungewear outfit, cozy layers, and casual house shoes for relaxing at home',
        };

        const suggestionPrompt = `Generate a high-quality fashion illustration of a complete outfit styled for the "${object.category}" category.
The outfit should showcase typical pieces and styling for this category: ${categoryDescriptions[object.category as keyof typeof categoryDescriptions]}.
Create a detailed, professional-looking outfit illustration with a person wearing the suggested clothing.`;

        const generationResult = await generateText({
          model: gateway('google/gemini-2.5-flash-image'),
          prompt: suggestionPrompt,
        });

        // Extract the first image from the generation result
        let suggestionImageUrl = '';
        if (generationResult.files && generationResult.files.length > 0) {
          const imageFile = generationResult.files.find(f =>
            f.mediaType?.startsWith('image/')
          );
          if (imageFile && imageFile.uint8Array) {
            // Convert image to buffer
            const imageBuffer = Buffer.from(imageFile.uint8Array);
            // Upload to storage
            const timestamp = Date.now();
            const storageKey = `outfit-suggestions/${timestamp}-${object.category.toLowerCase()}.png`;
            await app.storage.upload(storageKey, imageBuffer);
            // Generate signed URL
            const { url } = await app.storage.getSignedUrl(storageKey);
            suggestionImageUrl = url;
          }
        }

        // Return the combined response
        return {
          category: object.category,
          explanation: object.explanation,
          confidence: object.confidence,
          suggestionImageUrl,
        };
      } catch (error) {
        app.logger.error(error, 'Error analyzing outfit');
        return reply
          .status(500)
          .send({ error: 'Failed to analyze outfit image' });
      }
    }
  );
}
