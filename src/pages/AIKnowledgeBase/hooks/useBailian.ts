import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';

export interface BailianConfig {
  accessKeyId: string;
  accessKeySecret: string;
  workspaceId: string;
  appId: string;
  apiKey: string;
  knowledgeBaseId?: string; // Add Knowledge Base ID (Index ID)
}

export interface BailianFile {
  fileId: string;
  fileName: string;
  sizeInBytes: number;
  status: string; // UPLOADING, PARSING, PARSE_SUCCESS, PARSE_FAILED
  categoryId: string;
  tags: string[];
  createTime: string;
}

export const useBailian = () => {
  const [config, setConfig] = useState<BailianConfig>({
    accessKeyId: '',
    accessKeySecret: '',
    workspaceId: '',
    appId: '',
    apiKey: ''
  });
  const [files, setFiles] = useState<BailianFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/bailian/config');
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to fetch Bailian config', error);
    }
  }, []);

  const saveConfig = useCallback(async (newConfig: BailianConfig) => {
    try {
      const res = await fetch('http://localhost:3001/api/bailian/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (!res.ok) throw new Error('Failed to save config');
      message.success('配置已保存');
      setConfig(prev => ({ ...prev, ...newConfig }));
    } catch (error) {
      message.error('保存配置失败');
      console.error(error);
    }
  }, []);

  const fetchFiles = useCallback(async () => {
    if (!config.workspaceId) return;
    setLoadingFiles(true);
    try {
      const res = await fetch('http://localhost:3001/api/bailian/files');
      const data = await res.json();
      if (Array.isArray(data)) {
        setFiles(data);
      }
    } catch (error) {
      console.error('Failed to fetch files', error);
    } finally {
      setLoadingFiles(false);
    }
  }, [config.workspaceId]);

  const uploadFile = useCallback(async (file: File) => {
    if (!config.workspaceId) {
      message.error('请先配置 Workspace ID');
      return;
    }
    setUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        const res = await fetch('http://localhost:3001/api/bailian/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileContentBase64: base64
          })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Upload failed');
        }

        message.success('文件上传成功，正在解析中...');
        fetchFiles(); // Refresh list
      };
      
      reader.onerror = () => {
        throw new Error('Failed to read file');
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      message.error(`上传失败: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  }, [config.workspaceId, fetchFiles]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (config.workspaceId) {
      fetchFiles();
    }
  }, [config.workspaceId, fetchFiles]);

  return {
    config,
    files,
    loadingFiles,
    uploading,
    saveConfig,
    fetchFiles,
    uploadFile
  };
};
