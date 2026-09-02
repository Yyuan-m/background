import { useState, useEffect, useCallback } from 'react';
import { Card, Form, Input, InputNumber, Button, Spin, Row, Col, Divider } from 'antd';
import { message } from '@/utils/antdStatic';
import { SaveOutlined } from '@ant-design/icons';
import { getSystemSettingsApi, updateSystemSettingsApi } from '@/api/modules/system';
import { t } from '@/i18n';
import useAuthStore from '@/store/useAuthStore';

const SystemSettings = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const { hasPermission } = useAuthStore();

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSystemSettingsApi();
      // 兜底：API 响应整体可能为 null/undefined
      const safeRes = res && typeof res === 'object' ? res : {};
      // 兜底：将 null/undefined 字段统一转为 undefined，避免 Input/InputNumber 显示异常
      const sanitized = Object.fromEntries(
        Object.entries(safeRes).map(([k, v]) => [k, v ?? undefined])
      );
      form.setFieldsValue(sanitized);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await updateSystemSettingsApi(values);
      message.success('系统设置保存成功');
    } catch (e) {
      if (e.errorFields) return;
      message.error('保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <h2 className="page-title">{t('pageTitle.systemSettings')}</h2>
      <Spin spinning={loading}>
        <Card variant="borderless" style={{ maxWidth: 800 }}>
          <Form form={form} layout="vertical">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>基本信息</h3>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="siteName" label="网站名称" rules={[{ required: true }]}>
                  <Input placeholder="网站名称" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="contactPhone" label="联系电话" rules={[{ required: true }]}>
                  <Input placeholder="联系电话" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="contactEmail" label="联系邮箱" rules={[{ required: true, type: 'email' }]}>
                  <Input placeholder="联系邮箱" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="address" label="公司地址" rules={[{ required: true }]}>
                  <Input placeholder="公司地址" />
                </Form.Item>
              </Col>
            </Row>

            <Divider />
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>租赁规则</h3>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="minRentDays" label="最短租期(天)" rules={[{ required: true }]}>
                  <InputNumber min={1} max={30} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="maxRentDays" label="最长租期(天)" rules={[{ required: true }]}>
                  <InputNumber min={1} max={365} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="lateFeePerDay" label="逾期费(元/天)" rules={[{ required: true }]}>
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="cancellationPolicy" label="取消政策">
              <Input.TextArea rows={3} placeholder="取消政策说明" />
            </Form.Item>

            <Form.Item>
              {hasPermission('settings:system:update') && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSubmit}
                  loading={submitting}
                  size="large"
                >
                  保存设置
                </Button>
              )}
            </Form.Item>
          </Form>
        </Card>
      </Spin>
    </div>
  );
};

SystemSettings.routeConfig = { path: '/settings/system', permission: 'settings' };
export default SystemSettings;
