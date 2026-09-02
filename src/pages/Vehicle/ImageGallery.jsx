import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Select, Row, Col, Button, Tag, Image, Modal, Form, Input, Popconfirm, Space } from 'antd';
import { ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { getCarImageListApi, addCarImageApi, deleteCarImageApi } from '@/api/modules/car-image';
import DictSelect from '@/components/DictSelect';
import FileUploader from '@/components/FileUploader';
import useVehicleOptions from '@/hooks/useVehicleOptions';
import { message } from '@/utils/antdStatic';
import { formatTime } from '@/utils/formatTime';
import { imageUrl } from '@/utils/imageUrl';
import useAuthStore from '@/store/useAuthStore';

const CAR_IMAGE_CATEGORY_DICT = 'car_image_category';

// 素材分类颜色映射，便于列表直观区分
const CATEGORY_COLOR_MAP = {
  '外观': 'blue',
  '内饰': 'green',
  '细节': 'orange',
  '轮毂': 'gold',
  '发动机舱': 'red',
  '后备箱': 'cyan',
  '配置功能': 'purple',
  '宣传图': 'magenta',
  '其他': 'default',
};

const renderCategoryTag = (v) => v ? <Tag color={CATEGORY_COLOR_MAP[v] || 'default'}>{v}</Tag> : '-';

const ImageGallery = () => {
  const { options: vehicleOptions } = useVehicleOptions();
  const { hasPermission } = useAuthStore();

  // 车辆下拉选项：名称 + 车牌号，便于识别；rawName 保留纯名称用于回填
  const vehicleSelectOptions = useMemo(() => vehicleOptions.map((o) => ({
    ...o,
    rawName: o.label,
    label: o.plateNumber ? `${o.label}（${o.plateNumber}）` : o.label,
  })), [vehicleOptions]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // 上传弹窗
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadForm] = Form.useForm();
  const [imageFile, setImageFile] = useState(null); // { url, fileId, name }
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCarImageListApi({
        page: pagination.page,
        pageSize: pagination.pageSize,
        vehicleId: filterVehicle || undefined,
        category: filterCategory || undefined,
      });
      setData(res?.list || []);
      setTotal(res?.total || 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [pagination, filterVehicle, filterCategory]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleReset = () => {
    setFilterVehicle(''); setFilterCategory('');
    setPagination({ page: 1, pageSize: 10 });
  };

  const handleDelete = async (id) => {
    try {
      await deleteCarImageApi(id);
      setPagination((p) => ({ ...p }));
    } catch (e) { /* 错误已由拦截器提示 */ }
  };

  const handleUploadSubmit = async () => {
    try {
      const values = await uploadForm.validateFields();
      if (!imageFile?.url) {
        message.error('请先上传图片');
        return;
      }
      setSubmitLoading(true);
      await addCarImageApi({
        vehicleId: values.vehicleId,
        vehicleName: values.vehicleName,
        category: values.category,
        url: imageFile.url,
        status: 1,
      });
      setUploadVisible(false);
      uploadForm.resetFields();
      setImageFile(null);
      setPagination((p) => ({ ...p, page: 1 }));
    } catch (e) {
      if (e.errorFields) return;
      console.error(e);
    } finally { setSubmitLoading(false); }
  };

  const closeUploadModal = () => {
    setUploadVisible(false);
    uploadForm.resetFields();
    setImageFile(null);
  };

  const columns = useMemo(() => [
    { title: '车辆', dataIndex: 'vehicleName', key: 'vehicleName', width: 160 },
    { title: '分类', dataIndex: 'category', key: 'category', width: 90, render: renderCategoryTag },
    {
      title: '预览', dataIndex: 'url', key: 'url', width: 120,
      render: (url, record) => (
        <Image
          src={imageUrl(url)}
          alt={record.vehicleName}
          width={80}
          height={60}
          style={{ objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
          preview={{ mask: '点击放大' }}
        />
      ),
    },
    { title: '上传时间', dataIndex: 'createdAt', key: 'createdAt', width: 120, render: formatTime.render },
    ...(hasPermission('vehicle:image:delete') ? [{
      title: '操作', key: 'action', width: 80,
      render: (_, record) => (
        <Popconfirm title="确定删除此素材？" onConfirm={() => handleDelete(record.id)}>
          <Button type="link" size="small" danger>删除</Button>
        </Popconfirm>
      ),
    }] : []),
  ], [hasPermission, handleDelete]);

  return (
    <div className="page-container">
      <h2 className="page-title">素材管理</h2>
    <Card variant="borderless">
      <Card variant="borderless" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="选择车辆"
              value={filterVehicle || undefined}
              onChange={(v) => { setFilterVehicle(v || ''); setPagination((p) => ({ ...p, page: 1 })); }}
              allowClear showSearch
              style={{ width: '100%' }}
              optionFilterProp="label"
              options={vehicleSelectOptions}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <DictSelect
              dictType={CAR_IMAGE_CATEGORY_DICT}
              placeholder="分类"
              value={filterCategory || undefined}
              onChange={(v) => { setFilterCategory(v || ''); setPagination((p) => ({ ...p, page: 1 })); }}
              style={{ width: '100%' }}
            />
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <div style={{ marginBottom: 16 }}>
        {hasPermission('vehicle:image:add') && <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadVisible(true)}>上传素材</Button>}
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (t) => `共 ${t} 条`,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (p, ps) => setPagination({ page: p, pageSize: ps }),
        }}
      />

      {/* 上传素材弹窗 */}
      <Modal
        title="上传素材"
        open={uploadVisible}
        onOk={handleUploadSubmit}
        onCancel={closeUploadModal}
        confirmLoading={submitLoading}
        width={520}
        destroyOnClose
      >
        <Form form={uploadForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="vehicleId" label="所属车辆" rules={[{ required: true, message: '请选择车辆' }]}>
            <Select
              placeholder="请选择车辆"
              showSearch
              optionFilterProp="label"
              optionLabelProp="label"
              style={{ width: '100%' }}
              options={vehicleSelectOptions}
              onChange={(value, option) => {
                uploadForm.setFieldValue('vehicleName', option?.rawName || option?.label);
              }}
            />
          </Form.Item>
          <Form.Item name="vehicleName" hidden><Input /></Form.Item>
          <Form.Item name="category" label="素材分类" rules={[{ required: true, message: '请选择分类' }]}>
            <DictSelect
              dictType={CAR_IMAGE_CATEGORY_DICT}
              placeholder="请选择分类"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="上传图片" required>
            <FileUploader
              bizType="vehicle_image"
              onlyImage
              listType="picture-card"
              hint="支持 jpg/jpeg/png/gif/webp，单文件最大 50MB"
              onChange={(file) => setImageFile(file)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
    </div>
  );
};

ImageGallery.routeConfig = { path: '/vehicles/images', permission: 'vehicle:image' };
export default ImageGallery;
