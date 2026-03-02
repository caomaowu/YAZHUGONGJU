import { createRequire } from 'module';
import { getBailianConfig } from '../config/bailian.js';

const require = createRequire(import.meta.url);
const BailianSDK = require('@alicloud/bailian20231229');

// Handle CJS export structure
const Client = BailianSDK.default || BailianSDK;
const OpenApiClient = require('@alicloud/openapi-client');
const Config = OpenApiClient.Config || OpenApiClient.default?.Config;

export const createBailianClient = async () => {
  const config = await getBailianConfig();
  if (!config.accessKeyId || !config.accessKeySecret) {
    throw new Error('Missing Bailian credentials');
  }
  const clientConfig = new Config({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    endpoint: 'bailian.cn-beijing.aliyuncs.com'
  });
  return new Client(clientConfig);
};

// Export SDK classes for usage in controllers
export const { 
  ApplyFileUploadLeaseRequest, 
  AddFileRequest, 
  ListFileRequest, 
  CompletionRequest, 
  RetrieveRequest 
} = BailianSDK;
