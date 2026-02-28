import React from 'react';
import { Drawer, Button, Table, Upload, Space, Tag } from 'antd';
import { UploadOutlined, FileTextOutlined, ReloadOutlined } from '@ant-design/icons';
import type { BailianFile } from '../hooks/useBailian';

interface KnowledgeBaseDrawerProps {
  visible: boolean;
  onClose: () => void;
  files: BailianFileRecord[];
  loading: boolean;
  onUpload: (file: File) => Promise<void>;
  onRefresh: () => void;
}

type BailianFileRecord = BailianFile & {
  FileName?: string;
  FileId?: string;
  SizeInBytes?: number;
  Status?: string;
};

export const KnowledgeBaseDrawer: React.FC<KnowledgeBaseDrawerProps> = ({ 
  visible, 
  onClose, 
  files, 
  loading, 
  onUpload, 
  onRefresh 
}) => {
  const uploadProps = {
    beforeUpload: (file: File) => {
      onUpload(file);
      return false; // Prevent auto upload
    },
    showUploadList: false,
  };

  const columns = [
    {
      title: '文件名',
      dataIndex: 'FileName', // Note: Bailian API usually returns capitalized keys, check response! 
      // Actually SDK usually returns camelCase if using Tea. 
      // Let's assume server returns whatever SDK returns. 
      // Server does: res.json(response.body.data.fileList || []);
      // If using Tea SDK, it might be camelCase `fileName`. 
      // Let's check typical Alibaba Cloud SDK response. It's often PascalCase in API but camelCase in SDK.
      // I'll check response key in render or try both.
      key: 'fileName',
      render: (_text: string, record: BailianFileRecord) => (
        <Space>
          <FileTextOutlined />
          {record.fileName || record.FileName}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'Status',
      key: 'status',
      render: (status: string, record: BailianFileRecord) => {
        const s = status || record.status;
        let color = 'default';
        let text = s;
        if (s === 'PARSE_SUCCESS' || s === 'SUCCESS') {
            color = 'success';
            text = '解析成功';
        } else if (s === 'PARSING' || s === 'INIT') {
            color = 'processing';
            text = '解析中';
        } else if (s === 'PARSE_FAILED' || s === 'FAILED') {
            color = 'error';
            text = '解析失败';
        }
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
        title: '大小',
        dataIndex: 'SizeInBytes',
        key: 'size',
        render: (size: number, record: BailianFileRecord) => {
            const s = size || record.sizeInBytes;
            return (s / 1024).toFixed(2) + ' KB';
        }
    }
  ];

  return (
    <Drawer
      title="知识库文件管理"
      placement="right"
      width={600}
      onClose={onClose}
      open={visible}
      extra={
        <Space>
            <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>刷新</Button>
            <Upload {...uploadProps}>
                <Button type="primary" icon={<UploadOutlined />}>上传文档</Button>
            </Upload>
        </Space>
      }
    >
      <Table 
        dataSource={files} 
        columns={columns} 
        rowKey={(record) => record.FileId || record.fileId} 
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </Drawer>
  );
};
