import { createApplication } from "@specific-dev/framework";
import * as schema from './db/schema.js';
import * as outfitAnalysisRoutes from './routes/outfit-analysis.js';

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Enable storage for file uploads
app.withStorage();

// Export App type for use in route files
export type App = typeof app;

// Register routes
outfitAnalysisRoutes.register(app, app.fastify);

await app.run();
app.logger.info('Application running');
