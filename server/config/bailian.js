import { readJsonWithDefault } from '../utils/helpers.js';
import { BAILIAN_CONFIG_FILE } from './index.js';

export const getBailianConfig = async () => {
  const config = await readJsonWithDefault(BAILIAN_CONFIG_FILE, {
    accessKeyId: '',
    accessKeySecret: '',
    workspaceId: '',
    appId: '', // Default App ID
    apiKey: '', // Default API Key
    knowledgeBaseId: ''
  });

  const decode = (str) => {
    if (!str || typeof str !== 'string') return str;
    
    const trimmed = str.trim();
    if (trimmed.startsWith('ENC_')) {
      try {
        const payload = trimmed.slice(4);
        const decoded = Buffer.from(payload, 'base64').toString('utf-8');
        
        // Smart Detection:
        // 1. If decoded value looks like a valid AccessKey (starts with LTAI or STS), use it.
        if (decoded.startsWith('LTAI') || decoded.startsWith('STS')) {
            return decoded;
        }
        
        // 2. If payload (original string without prefix) starts with LTAI, 
        // it means user added ENC_ prefix but didn't base64 encode it.
        if (payload.startsWith('LTAI') || payload.startsWith('STS')) {
            return payload;
        }

        return decoded;
      } catch (e) {
        console.warn('Failed to decode config value:', e);
        return str;
      }
    }
    return str;
  };

  return {
    ...config,
    accessKeyId: decode(config.accessKeyId),
    accessKeySecret: decode(config.accessKeySecret),
    apiKey: decode(config.apiKey)
  };
};
