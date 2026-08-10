import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Descriptions, Tag, Row, Col, Avatar, Upload, Spin, Tooltip } from 'antd';
import { message } from '@/utils/antdStatic';
import { SaveOutlined, UserOutlined, CameraOutlined } from '@ant-design/icons';
import useAuthStore from '@/store/useAuthStore';
import { updateProfileApi, updateAvatarApi, changeProfilePasswordApi } from '@/api/modules/profile';
import { upload } from '@/api/request';
import { t } from '@/i18n';
import { formatTime } from '@/utils/formatTime';
import { imageUrl } from '@/utils/imageUrl';

const roleMap = {
  super_admin: { text: '超级管理员', color: 'red' },
  operator: { text: '普通运营', color: 'blue' },
  service: { text: '客服', color: 'green' },
  finance_admin: { text: '财务管理员', color: 'gold' },
  after_sales: { text: '售后管理员', color: 'purple' },
};

const Profile = () => {
  const { user, refreshUser } = useAuthStore();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  // 挂载时拉取一次最新用户信息
  useEffect(() => {
    let mounted = true;
    (async () => {
      setInitLoading(true);
      await refreshUser();
      if (mounted) setInitLoading(false);
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // user 变化时同步资料表单
  useEffect(() => {
    profileForm.setFieldsValue({
      nickname: user?.nickname || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
  }, [user, profileForm]);

  const handleUpdateProfile = async (values) => {
    setProfileLoading(true);
    try {
      await updateProfileApi(values);
      await refreshUser();
    } catch (e) {
      // request.js 已统一弹错误提示
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarUpload = async (options) => {
    const { file, onSuccess, onError } = options;
    setAvatarUploading(true);
    try {
      // 1. 上传图片到 /api/upload/image，返回 { url, fileId, ... }
      const res = await upload('/api/upload/image', file, { params: { bizType: 'avatar' } });
      if (!res?.url) {
        // 业务校验失败（非 HTTP 错误），自行提示
        message.error('上传失败：未获取到图片地址');
        onError?.(new Error('上传失败'));
        return;
      }
      // 2. 回写头像 URL 到 sys_user.avatar（successMsg 由 request.js 统一弹）
      await updateAvatarApi(res.url);
      // 3. 刷新 store 中的用户信息
      await refreshUser();
      onSuccess?.(res);
    } catch (e) {
      // HTTP 错误由 request.js 统一提示，这里不重复弹
      onError?.(e);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleChangePassword = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的新密码不一致');
      return;
    }
    setPasswordLoading(true);
    try {
      await changeProfilePasswordApi({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      passwordForm.resetFields();
    } catch (e) {
      // request.js 已统一弹错误提示
    } finally {
      setPasswordLoading(false);
    }
  };

  const roleCfg = roleMap[user?.role] || { text: user?.roleName || user?.role || '-', color: 'default' };

  return (
    <div className="page-container">
      <h2 className="page-title">{t('pageTitle.profile')}</h2>

      <Spin spinning={initLoading}>
        <Row gutter={16}>
          {/* 左侧：头像 + 个人信息 */}
          <Col xs={24} lg={8}>
            <Card title="个人信息" variant="borderless" style={{ marginBottom: 16, textAlign: 'center' }}>
              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Upload
                  showUploadList={false}
                  customRequest={handleAvatarUpload}
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                >
                  <Tooltip title={avatarUploading ? '上传中...' : '点击更换头像'}>
                    <div style={{ position: 'relative', cursor: 'pointer', borderRadius: '50%' }}>
                      <Avatar
                        size={120}
                        src={user?.avatar ? imageUrl(user.avatar) : undefined}
                        icon={!user?.avatar ? <UserOutlined /> : null}
                        style={{ backgroundColor: !user?.avatar ? 'var(--primary-color, #1a365d)' : undefined }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 4,
                          right: 4,
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'var(--primary-color, #1a365d)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid var(--bg-container, #fff)',
                        }}
                      >
                        {avatarUploading ? <Spin size="small" /> : <CameraOutlined style={{ color: '#fff', fontSize: 16 }} />}
                      </div>
                    </div>
                  </Tooltip>
                </Upload>
                <div style={{ marginTop: 12, fontSize: 16, fontWeight: 600 }}>
                  {user?.nickname || user?.username || '-'}
                </div>
                <Tag color={roleCfg.color} style={{ marginTop: 4 }}>
                  {user?.roleName || roleCfg.text}
                </Tag>
              </div>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="用户名">{user?.username || '-'}</Descriptions.Item>
                <Descriptions.Item label="邮箱">{user?.email || '-'}</Descriptions.Item>
                <Descriptions.Item label="手机号">{user?.phone || '-'}</Descriptions.Item>
                <Descriptions.Item label="注册时间">{formatTime(user?.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="最后登录">{formatTime.datetime(user?.lastLoginTime)}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* 右侧：资料编辑 + 修改密码 */}
          <Col xs={24} lg={16}>
            <Card title="编辑资料" variant="borderless" style={{ marginBottom: 16 }}>
              <Form
                form={profileForm}
                layout="vertical"
                onFinish={handleUpdateProfile}
                initialValues={{
                  nickname: user?.nickname || '',
                  email: user?.email || '',
                  phone: user?.phone || '',
                }}
              >
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="nickname"
                      label="昵称"
                      rules={[{ required: true, message: '请输入昵称' }]}
                    >
                      <Input placeholder="请输入昵称" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="phone"
                      label="手机号"
                      rules={[{ pattern: /^1\d{10}$/, message: '请输入正确的手机号' }]}
                    >
                      <Input placeholder="请输入手机号" maxLength={11} />
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Form.Item
                      name="email"
                      label="邮箱"
                      rules={[{ type: 'email', message: '请输入正确的邮箱' }]}
                    >
                      <Input placeholder="请输入邮箱" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={profileLoading}
                  >
                    保存资料
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            <Card title="修改密码" variant="borderless">
              <Form
                form={passwordForm}
                layout="vertical"
                onFinish={handleChangePassword}
              >
                <Form.Item
                  name="oldPassword"
                  label="原密码"
                  rules={[{ required: true, message: '请输入原密码' }]}
                >
                  <Input.Password placeholder="请输入原密码" />
                </Form.Item>
                <Form.Item
                  name="newPassword"
                  label="新密码"
                  rules={[
                    { required: true, message: '请输入新密码' },
                    { min: 6, message: '密码至少6个字符' },
                  ]}
                >
                  <Input.Password placeholder="请输入新密码" />
                </Form.Item>
                <Form.Item
                  name="confirmPassword"
                  label="确认新密码"
                  rules={[{ required: true, message: '请确认新密码' }]}
                >
                  <Input.Password placeholder="请确认新密码" />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={passwordLoading}
                  >
                    修改密码
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

Profile.routeConfig = { path: '/settings/profile', permission: 'settings' };
export default Profile;
