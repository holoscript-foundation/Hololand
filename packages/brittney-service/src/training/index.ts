/**
 * Brittney Training Module
 *
 * Generates training data for fine-tuning models on HoloScript+ via:
 * - Azure AI Foundry
 * - OpenAI Fine-tuning API
 * - Local dataset export (JSONL)
 *
 * Training Data Categories:
 * 1. HoloScript generation from natural language
 * 2. Code explanation and documentation
 * 3. Error diagnosis and fixes
 * 4. VR interaction patterns
 * 5. Performance optimization
 */

export { TrainingDataGenerator, type TrainingExample, type TrainingDataset } from './TrainingDataGenerator.js';
// TODO: AzureFoundryClient implementation pending
// export { AzureFoundryClient, type FoundryConfig, type FineTuneJob } from './AzureFoundryClient.js';
export { exportToJSONL, exportToOpenAI, type ExportOptions } from './exporters.js';
