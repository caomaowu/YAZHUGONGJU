import React, { useCallback, useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Tag, Space, Popconfirm, Tabs, Checkbox, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuth } from '../core/auth/useAuth';
import type { User, RoleDefinition } from '../core/auth/types';
import { builtinToolRegistry } from '../tools/builtinRegistry';

const { Option } = Select;

export const UserManagementPage: React.FC = () => {
  const { user, token, roles: authRoles, refreshRoles } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  // --- User Management State ---
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm] = Form.useForm();

  // --- Role Management State ---
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [roleForm] = Form.useForm();

  // --- Fetch Data ---
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch {
      message.error('获取用户列表失败');
    } finally {
      setLoadingUsers(false);
    }
  }, [token]);

  const fetchRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const response = await fetch('/api/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch roles');
      const data = await response.json();
      setRoles(data);
    } catch {
      message.error('获取角色列表失败');
    } finally {
      setLoadingRoles(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'roles') fetchRoles();
  }, [activeTab, fetchUsers, fetchRoles]);

  // Ensure we have roles for the user form select
  useEffect(() => {
    if (authRoles.length > 0) setRoles(authRoles);
  }, [authRoles]);


  // --- User Handlers ---
  const handleAddUser = () => {
    setEditingUser(null);
    userForm.resetFields();
    setUserModalVisible(true);
  };

  const handleEditUser = (record: User) => {
    setEditingUser(record);
    userForm.setFieldsValue({
      username: record.username,
      name: record.name,
      role: record.role,
    });
    setUserModalVisible(true);
  };

  const handleDeleteUser = async (username: string) => {
    try {
      const response = await fetch(`/api/users/${username}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      message.success('用户已删除');
      fetchUsers();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : '删除用户失败';
      message.error(messageText);
    }
  };

  const handleUserOk = async () => {
    try {
      const values = await userForm.validateFields();
      const isEdit = !!editingUser;
      const url = isEdit ? `/api/users/${editingUser.username}` : '/api/users';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Operation failed');
      }

      message.success(isEdit ? '用户更新成功' : '用户创建成功');
      setUserModalVisible(false);
      fetchUsers();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : '操作失败';
      message.error(messageText);
    }
  };

  // --- Role Handlers ---
  const handleAddRole = () => {
    setEditingRole(null);
    roleForm.resetFields();
    // Default values
    roleForm.setFieldsValue({
      permissions: ['dashboard'],
      canEdit: false,
      canDelete: false
    });
    setRoleModalVisible(true);
  };

  const handleEditRole = (record: RoleDefinition) => {
    setEditingRole(record);
    roleForm.setFieldsValue({
      id: record.id,
      name: record.name,
      description: record.description,
      permissions: record.permissions.includes('*') 
        ? builtinToolRegistry.list().map(t => t.id) 
        : record.permissions,
      canEdit: record.canEdit,
      canDelete: record.canDelete,
    });
    setRoleModalVisible(true);
  };

  const handleDeleteRole = async (id: string) => {
    try {
      const response = await fetch(`/api/roles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete role');
      }
      message.success('角色已删除');
      fetchRoles();
      refreshRoles();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : '删除角色失败';
      message.error(messageText);
    }
  };

  const handleRoleOk = async () => {
    try {
      const values = await roleForm.validateFields();
      const isEdit = !!editingRole;
      const url = isEdit ? `/api/roles/${editingRole.id}` : '/api/roles';
      const method = isEdit ? 'PUT' : 'POST';

      // Check if all tools selected -> convert to '*'? Maybe not necessary for UI consistency
      // but good for admin.
      // For now, just save array.

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Operation failed');
      }

      message.success(isEdit ? '角色更新成功' : '角色创建成功');
      setRoleModalVisible(false);
      fetchRoles();
      refreshRoles();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : '操作失败';
      message.error(messageText);
    }
  };

  // --- Columns ---
  const userColumns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { 
      title: '角色', 
      dataIndex: 'role', 
      key: 'role',
      render: (roleId: string) => {
        const roleDef = roles.find(r => r.id === roleId);
        return <Tag color="geekblue">{roleDef?.name || roleId}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: User) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEditUser(record)}
            disabled={record.username === 'admin' && user?.username !== 'admin'}
          />
          {record.username !== 'admin' && (
            <Popconfirm title="确定要删除吗?" onConfirm={() => handleDeleteUser(record.username)}>
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const roleColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { 
      title: '权限', 
      key: 'permissions',
      render: (_: unknown, record: RoleDefinition) => {
        if (record.permissions.includes('*')) return <Tag color="red">所有权限</Tag>;
        return (
          <div style={{ maxWidth: 300 }}>
            {record.permissions.map(p => {
               const tool = builtinToolRegistry.getById(p);
               return <Tag key={p}>{tool?.navLabel || p}</Tag>;
            })}
          </div>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: RoleDefinition) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEditRole(record)}
            // Prevent editing admin ID or critical system roles structure? 
            // We allow editing permissions but backend blocks revoking admin * permission.
          />
          {!['admin', 'engineer', 'operator', 'viewer'].includes(record.id) && (
            <Popconfirm title="确定要删除吗?" onConfirm={() => handleDeleteRole(record.id)}>
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const allTools = builtinToolRegistry.list().map(t => ({ label: t.navLabel, value: t.id }));

  return (
    <div style={{ padding: 24 }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'users',
            label: '用户管理',
            children: (
              <>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>
                    添加用户
                  </Button>
                </div>
                <Table 
                  columns={userColumns} 
                  dataSource={users} 
                  rowKey="username" 
                  loading={loadingUsers}
                  pagination={{ pageSize: 10 }}
                />
              </>
            )
          },
          {
            key: 'roles',
            label: '角色权限',
            children: (
              <>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRole}>
                    创建新角色
                  </Button>
                </div>
                <Table 
                  columns={roleColumns} 
                  dataSource={roles} 
                  rowKey="id" 
                  loading={loadingRoles}
                  pagination={{ pageSize: 10 }}
                />
              </>
            )
          }
        ]}
      />

      {/* User Modal */}
      <Modal
        title={editingUser ? "编辑用户" : "添加用户"}
        open={userModalVisible}
        onOk={handleUserOk}
        onCancel={() => setUserModalVisible(false)}
      >
        <Form form={userForm} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input disabled={!!editingUser} />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select>
              {roles.map(r => (
                <Option key={r.id} value={r.id}>{r.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="password" label={editingUser ? "密码 (留空则不修改)" : "密码"} rules={[{ required: !editingUser }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>

      {/* Role Modal */}
      <Modal
        title={editingRole ? "编辑角色" : "创建角色"}
        open={roleModalVisible}
        onOk={handleRoleOk}
        onCancel={() => setRoleModalVisible(false)}
        width={600}
      >
        <Form form={roleForm} layout="vertical">
          <Form.Item name="id" label="角色ID" rules={[{ required: true }]} help="唯一标识符，如: manager">
            <Input disabled={!!editingRole} />
          </Form.Item>
          <Form.Item name="name" label="角色名称" rules={[{ required: true }]}>
            <Input placeholder="如: 生产经理" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea />
          </Form.Item>
          
          <Form.Item name="permissions" label="可访问页面" rules={[{ required: true }]}>
            <Checkbox.Group options={allTools} />
          </Form.Item>

          <Space size={24}>
            <Form.Item name="canEdit" label="允许编辑数据" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="canDelete" label="允许删除数据" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};
