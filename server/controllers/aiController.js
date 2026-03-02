import fs from 'fs-extra';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { BAILIAN_CONFIG_FILE } from '../config/index.js';
import { getBailianConfig } from '../config/bailian.js';
import { 
  createBailianClient, 
  ApplyFileUploadLeaseRequest, 
  AddFileRequest, 
  ListFileRequest, 
  RetrieveRequest 
} from '../utils/bailian.js';
import { maskSensitive, isMasked } from '../utils/helpers.js';

// --- Config ---
export const getConfig = async (req, res) => {
  try {
    const config = await getBailianConfig();
    // Hide secret and mask IDs
    const safeConfig = { 
        ...config, 
        accessKeyId: maskSensitive(config.accessKeyId),
        workspaceId: maskSensitive(config.workspaceId),
        appId: maskSensitive(config.appId),
        knowledgeBaseId: maskSensitive(config.knowledgeBaseId),
        accessKeySecret: config.accessKeySecret ? '******' : '',
        apiKey: config.apiKey ? '******' : '' 
    };
    res.json(safeConfig);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get config' });
  }
};

export const updateConfig = async (req, res) => {
  try {
    const { accessKeyId, accessKeySecret, workspaceId, appId, apiKey, knowledgeBaseId } = req.body;
    const currentConfig = await getBailianConfig();
    
    const newConfig = { ...currentConfig };

    // Update fields only if they are not masked
    if (accessKeyId && !isMasked(accessKeyId)) newConfig.accessKeyId = accessKeyId;
    if (workspaceId && !isMasked(workspaceId)) newConfig.workspaceId = workspaceId;
    if (appId && !isMasked(appId)) newConfig.appId = appId;
    if (knowledgeBaseId && !isMasked(knowledgeBaseId)) newConfig.knowledgeBaseId = knowledgeBaseId;
    
    // Only update secret if provided and not masked
    if (accessKeySecret && accessKeySecret !== '******') {
      newConfig.accessKeySecret = accessKeySecret;
    }
    
    // Only update apiKey if provided and not masked
    if (apiKey && apiKey !== '******') {
      newConfig.apiKey = apiKey;
    }

    await fs.writeJson(BAILIAN_CONFIG_FILE, newConfig, { spaces: 2 });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save config' });
  }
};

// --- Files ---
export const listFiles = async (req, res) => {
    try {
        const config = await getBailianConfig();
        if (!config.workspaceId) {
             return res.json([]); // Return empty if no workspace configured
        }
        
        const client = await createBailianClient();
        
        const request = new ListFileRequest({
            categoryId: 'default',
            limit: 20,
            offset: 0
        });
        
        const response = await client.listFile(config.workspaceId, request);
        
        if (!response.body.success) {
            throw new Error(response.body.message || 'Failed to list files');
        }
        
        res.json(response.body.data.fileList || []);
    } catch (error) {
        console.error('Bailian List Files Error:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
};

export const uploadDocument = async (req, res) => {
  try {
    const { fileName, fileContentBase64, categoryId } = req.body; // fileContentBase64: base64 string
    if (!fileName || !fileContentBase64) {
      return res.status(400).json({ error: 'Missing file data' });
    }

    const config = await getBailianConfig();
    if (!config.workspaceId) return res.status(400).json({ error: 'Missing Workspace ID' });

    const client = await createBailianClient();
    const buffer = Buffer.from(fileContentBase64, 'base64');
    
    // 1. Apply Lease
    const md5 = crypto.createHash('md5').update(buffer).digest('hex');
    
    const leaseRequest = new ApplyFileUploadLeaseRequest({
      fileName,
      md5,
      sizeInBytes: buffer.length.toString(),
    });

    const leaseResponse = await client.applyFileUploadLease(categoryId || 'default', config.workspaceId, leaseRequest);
    const leaseData = leaseResponse.body;
    
    if (!leaseData.param) {
      throw new Error('Failed to get upload parameters');
    }

    // 2. Upload to OSS
    const uploadUrl = leaseData.param.url;
    const uploadHeaders = leaseData.param.headers; 

    const fetchHeaders = {};
    if (uploadHeaders) {
        Object.keys(uploadHeaders).forEach(key => {
            fetchHeaders[key] = uploadHeaders[key];
        });
    }
    fetchHeaders['Content-Type'] = ''; 

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: fetchHeaders,
      body: buffer
    });

    if (!uploadRes.ok) {
       const text = await uploadRes.text();
       throw new Error(`OSS Upload failed: ${uploadRes.status} ${text}`);
    }

    // 3. Add File to Knowledge Base
    const addFileRequest = new AddFileRequest({
      leaseId: leaseData.data.fileUploadLeaseId,
      parser: 'DAS', // Default parsing
      categoryId: categoryId || 'default',
    });

    const addFileResponse = await client.addFile(config.workspaceId, addFileRequest);

    res.json({ 
      success: true, 
      fileId: addFileResponse.body.data.fileId,
      message: 'File uploaded. Please add it to your Knowledge Base Index in Bailian Console.'
    });

  } catch (error) {
    console.error('Bailian Upload Error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
};

// --- Chat & Proxy ---
export const proxy = async (req, res) => {
  try {
    const { apiKey, baseUrl, model, messages, temperature } = req.body;

    if (!apiKey || !baseUrl || !messages) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await client.chat.completions.create({
      model,
      messages,
      temperature: temperature || 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('AI Proxy Error:', error);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: error.message || 'AI Proxy Error' });
    }
  }
};

export const chat = async (req, res) => {
  try {
    const { messages, appId, useExternalModel, providerConfig } = req.body; 
    const config = await getBailianConfig();
    const targetAppId = appId || config.appId;

    if (!targetAppId) {
      return res.status(400).json({ error: 'App ID is not configured' });
    }
    
    const kbId = config.knowledgeBaseId;
    
    if (kbId && useExternalModel) {
        // --- Hybrid RAG Mode ---
        const client = await createBailianClient();
        
        const query = messages[messages.length - 1].content;
        
        const retrieveReq = new RetrieveRequest({
            indexId: kbId,
            query: query,
            limit: 5, // Top 5 chunks
        });
        
        let context = "";
        try {
            const retrieveResp = await client.retrieve(config.workspaceId, retrieveReq);
            
            if (retrieveResp.body.success && retrieveResp.body.data && retrieveResp.body.data.nodes) {
                context = retrieveResp.body.data.nodes.map(n => n.text).join("\n\n");
                
                if (context.includes('http') && (context.includes('.png') || context.includes('.jpg') || context.includes('.jpeg'))) {
                     context += "\n\n[System Note: The context above contains image URLs. Please display them in your response using Markdown image syntax: ![description](url)]";
                }
            }
        } catch (e) {
            console.error("Retrieval failed", e);
             if (e.code === 'InvalidAccessKeyId.NotFound') {
                 context = `[System Error: Knowledge Retrieval Failed. Cause: Invalid AccessKey ID.]\n\n`;
            } else if (e.code === 'Index.NoWorkspacePermissions' || e.statusCode === 403) {
                 context = `[System Error: Knowledge Retrieval Failed. Cause: Permission Denied (403).]\n\n`;
            } else {
                 context = `[System Error: Knowledge Retrieval Failed. Cause: ${e.message || 'Unknown Error'}]\n\n`;
            }
        }
        
        const systemPrompt = `You are a helpful assistant. Use the following context to answer the user's question.
        
Context:
${context}

If the answer is not in the context, say so, but try to be helpful.`;

        if (!providerConfig) {
             throw new Error("External provider config missing");
        }
        
        const openai = new OpenAI({
            apiKey: providerConfig.apiKey,
            baseURL: providerConfig.baseUrl,
        });
        
        const newMessages = [
            { role: 'system', content: systemPrompt },
            ...messages
        ];
        
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const stream = await openai.chat.completions.create({
            model: providerConfig.model,
            messages: newMessages,
            temperature: providerConfig.temperature || 0.7,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
        }
        res.write('data: [DONE]\n\n');
        res.end();
        return;
    }

    // --- Original Bailian App Mode ---
    if (!config.apiKey) {
         return res.status(400).json({ error: 'API Key is not configured. Please set API Key in Bailian settings.' });
    }

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await client.chat.completions.create({
      model: targetAppId,
      messages: messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Bailian Chat Error:', error);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};
