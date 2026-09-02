import { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, Popconfirm, Card, Space } from 'antd';
import { message } from '@/utils/antdStatic';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { getAnnouncementsApi, addAnnouncementApi, updateAnnouncementApi, deleteAnnouncementApi } from '@/api/modules/system';
import { t } from '@/i18n';
import { formatTime } from '@/utils/formatTime';
import DictSelect from '@/components/DictSelect';
import { useDict } from '@/hooks/useDict';
import useAuthStore from '@/store/useAuthStore';

const { Option } = Select;

const priorityColorMap = { high: 'red', normal: 'blue', low: 'default' };

const Announcements = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  // 当前编辑的公告 ID（null 表示新增）
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();
  const [submitLoading, setSubmitLoading] = useState(false);

  const { map: priorityMap } = useDict('announcement_priority');
  const { hasPermission } = useAuthStore();
  const canAnnUpdate = hasPermission('settings:announcements:update');
  const canAnnDelete = hasPermission('settings:announcements:delete');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAnnouncementsApi({ page, pageSize: 10 });
      setData(res?.list || []); setTotal(res?.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 打开编辑弹窗：回填公告数据（支持修改标题/内容/优先级/状态）
  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({
      title: record.title,
      content: record.content,
      priority: record.priority,
      status: record.status,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);
      if (editingId) {
        await updateAnnouncementApi({ id: editingId, ...values });
        message.success('公告修改成功');
      } else {
        await addAnnouncementApi(values);
        message.success('公告发布成功');
      }
      setModalVisible(false);
      void fetchData();
    } catch (e) {
      if (e.errorFields) return;
      message.error(editingId ? '修改失败' : '发布失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAnnouncementApi(id);
      message.success('删除成功');
      void fetchData();
    } catch {
      /* request.js 已统一提示 */
    }
  };

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '标题', dataIndex: 'title', key: 'title', width: 300, ellipsis: true },
    { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (p) => <Tag color={priorityColorMap[p] || 'default'}>{priorityMap[p]?.label || p}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v) => v ? <Tag color="green">发布</Tag> : <Tag color="default">下线</Tag>,
    },
    { title: '发布时间', dataIndex: 'createdAt', key: 'createdAt', width: 160, render: formatTime.render },
    ...(canAnnUpdate || canAnnDelete ? [{
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size={0}>
          {canAnnUpdate && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>}
          {canAnnDelete && (
            <Popconfirm title="确定删除该公告？" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    }] : []),
  ], [priorityMap, canAnnUpdate, canAnnDelete, handleEdit, handleDelete]);

  return (
    <div className="page-container">
      <h2 className="page-title">{t('pageTitle.announcements')}</h2>
      <Card variant="borderless">
        <div style={{ marginBottom: 16 }}>
          {hasPermission('settings:announcements:add') && <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>发布公告</Button>}
        </div>
        <div>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 10,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p) => setPage(p),
          }}
        />
        </div>
      </Card>

      <Modal
        title={editingId ? '修改公告' : '发布公告'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitLoading}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="title" label="公告标题" rules={[{ required: true, message: '请输入公告标题' }]}>
            <Input placeholder="公告标题" />
          </Form.Item>
          <Form.Item name="content" label="公告内容" rules={[{ required: true, message: '请输入公告内容' }]}>
            <Input.TextArea rows={4} placeholder="公告内容" />
          </Form.Item>
          <Form.Item name="priority" label="优先级" initialValue="normal">
            <DictSelect dictType="announcement_priority" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select>
              <Option value={1}>发布</Option>
              <Option value={0}>下线</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

Announcements.routeConfig = { path: '/announcements', permission: 'settings' };
export default Announcements;
