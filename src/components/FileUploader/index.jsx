import { useState, useEffect } from 'react';
import { Upload, Button, Image, Progress, Tooltip, Space, App } from 'antd';
import {
  UploadOutlined, DeleteOutlined, EyeOutlined, PaperClipOutlined,
  FileOutlined, PictureOutlined, FilePdfOutlined, VideoCameraOutlined,
} from '@ant-design/icons';
import { message as staticMessage } from '@/utils/antdStatic';
import { upload } from '@/api/request';
import { imageUrl } from '@/utils/imageUrl';

const { useApp } = App;

/**
 * 通用文件上传组件
 *
 * 特性：
 * 1. 支持单文件/多文件上传
 * 2. 支持图片预览、文档/视频图标展示
 * 3. 上传进度条
 * 4. 自动写入后端 sys_file 表，返回 { url, fileId, ... }
 * 5. 受控模式：value 为 [{ url, fileId, name }] 或 { url, fileId, name }
 *
 * @param {Object} props
 * @param {string} [props.bizType] - 业务类型，如 vehicle_image / avatar，写入 sys_file.biz_type
 * @param {boolean} [props.multiple=false] - 是否多文件
 * @param {number} [props.maxCount=1] - 最大文件数（multiple=true 时生效）
 * @param {boolean} [props.onlyImage=false] - 仅图片
 * @param {array} [props.accept] - 接受的文件类型，默认 ['jpg','jpeg','png','gif','webp']
 * @param {number} [props.maxSize=50] - 单文件最大 MB
 * @param {string} [props.listType='picture-card'] - antd Upload listType
 * @param {boolean} [props.disabled=false]
 * @param {Function} [props.onChange] - 回调 (fileList) => void
 * @param {string} [props.hint] - 提示文字
 * @param {string} [props.uploadText='上传'] - picture-card 模式下的上传按钮文字（如已有图片时可传 '上传替换'）
 */
const FileUploader = (props) => {
  const {
    bizType,
    multiple = false,
    maxCount = 1,
    onlyImage = false,
    accept,
    maxSize = 50,
    listType = 'picture-card',
    disabled = false,
    onChange,
    hint,
    uploadText = '上传',
  } = props;

  // 兼容 antd message 静态与 App.useApp message
  let msgApi;
  try { msgApi = useApp().message; } catch { msgApi = staticMessage; }

  const [fileList, setFileList] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  // 默认接受类型
  const defaultAccept = onlyImage ? ['jpg', 'jpeg', 'png', 'gif', 'webp'] : ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'mp4', 'mov'];
  const acceptExts = accept || defaultAccept;

  // 判断是否图片扩展名
  const isImageExt = (ext) => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext?.toLowerCase());

  // 根据扩展名获取图标
  const getFileIcon = (ext) => {
    const e = ext?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(e)) return <PictureOutlined />;
    if (['pdf'].includes(e)) return <FilePdfOutlined />;
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(e)) return <VideoCameraOutlined />;
    return <FileOutlined />;
  };

  // 自定义上传逻辑
  const handleUpload = async (options) => {
    const { file, onSuccess, onError, onProgress } = options;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    // 校验扩展名
    if (!acceptExts.includes(ext)) {
      msgApi.error(`不支持的文件类型: .${ext}，仅支持: ${acceptExts.join(', ')}`);
      onError(new Error('不支持的文件类型'));
      return;
    }
    // 校验大小
    if (file.size > maxSize * 1024 * 1024) {
      msgApi.error(`文件大小不能超过 ${maxSize}MB`);
      onError(new Error('文件过大'));
      return;
    }

    try {
      const res = await upload('/api/upload/image', file, {
        params: { bizType },
        onUploadProgress: (e) => {
          if (e.total) {
            onProgress?.({ percent: Math.round((e.loaded * 100) / e.total) });
          }
        },
      });
      onSuccess?.(res);
    } catch (e) {
      msgApi.error(e?.message || '上传失败');
      onError?.(e);
    }
  };

  // 上传状态变更
  const handleChange = ({ fileList: newList }) => {
    // 把后端返回的响应挂到 file.response 上，便于提取 url/fileId
    setFileList(newList);
    if (onChange) {
      const urls = newList
        .filter((f) => f.status === 'done' && f.response)
        .map((f) => ({
          url: f.response.url,
          fileId: f.response.fileId,
          name: f.response.originalName || f.name,
          size: f.response.size,
          extension: f.response.extension,
          category: f.response.category,
        }));
      onChange(multiple ? urls : urls[0]);
    }
  };

  // 预览
  const handlePreview = (file) => {
    const url = file.url || file.response?.url;
    const ext = (file.name || '').split('.').pop()?.toLowerCase();
    if (url && isImageExt(ext)) {
      setPreviewUrl(url);
      setPreviewOpen(true);
    } else {
      window.open(imageUrl(url), '_blank');
    }
  };

  // 删除
  const handleRemove = (file) => {
    setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
    if (onChange) {
      const urls = fileList
        .filter((f) => f.uid !== file.uid && f.status === 'done' && f.response)
        .map((f) => ({ url: f.response.url, fileId: f.response.fileId, name: f.response.originalName || f.name }));
      onChange(multiple ? urls : urls[0]);
    }
  };

  return (
    <div className="file-uploader">
      <Upload
        listType={listType}
        multiple={multiple}
        maxCount={maxCount}
        customRequest={handleUpload}
        fileList={fileList}
        onChange={handleChange}
        onPreview={handlePreview}
        onRemove={handleRemove}
        disabled={disabled}
        accept={acceptExts.map((e) => `.${e}`).join(',')}
      >
        {(!multiple || fileList.length < maxCount) && listType === 'picture-card' && (
          <div>
            <UploadOutlined />
            <div style={{ marginTop: 8 }}>{uploadText}</div>
          </div>
        )}
        {listType !== 'picture-card' && (!multiple || fileList.length < maxCount) && (
          <Button icon={<UploadOutlined />} disabled={disabled}>
            点击上传
          </Button>
        )}
      </Upload>

      {hint && (
        <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
          {hint}
        </div>
      )}

      {/* 图片预览弹窗 */}
      <Image
        style={{ display: 'none' }}
        preview={{
          visible: previewOpen,
          onVisibleChange: (v) => setPreviewOpen(v),
        }}
        src={imageUrl(previewUrl)}
      />
    </div>
  );
};

export default FileUploader;
