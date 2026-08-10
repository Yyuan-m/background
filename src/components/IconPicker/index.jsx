import { useState, useMemo, useEffect, useCallback } from 'react';
import { Modal, Input, Segmented, Empty, Pagination, Tooltip, Tag } from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import * as AllIcons from '@ant-design/icons';

/**
 * 通用图标选择器组件
 *
 * 收集 @ant-design/icons 全部图标，支持：
 * - 风格切换（Outlined / Filled / TwoTone）
 * - 关键字搜索（按名称模糊匹配）
 * - 分类过滤（按图标名称前缀分组）
 * - 分页加载（避免一次性渲染过多）
 * - 清空选择
 *
 * 用法：
 *   <IconPicker value={iconName} onChange={(name) => form.setFieldValue('icon', name)} />
 */

// 收集所有图标组件，过滤掉非图标导出（create Icon、IconProvider、setDefaultIconPrefix 等）
const allIconEntries = Object.entries(AllIcons).filter(
  ([, Comp]) => typeof Comp === 'function' || (Comp && typeof Comp === 'object' && Comp.$$typeof),
);

// 按风格分组
const groupByStyle = (entries) => {
  const groups = { Outlined: [], Filled: [], TwoTone: [] };
  entries.forEach(([name, Comp]) => {
    if (/Outlined$/.test(name)) groups.Outlined.push([name, Comp]);
    else if (/Filled$/.test(name)) groups.Filled.push([name, Comp]);
    else if (/TwoTone$/.test(name)) groups.TwoTone.push([name, Comp]);
  });
  return groups;
};

const iconGroups = groupByStyle(allIconEntries);

// 简单中英文分类映射（按图标名称前缀）
const categoryMap = [
  { key: 'all', label: '全部', match: () => true },
  { key: 'direction', label: '方向箭头', match: (n) => /^(Arrow|Caret|Double|Up|Down|Left|Right|Fall|Rise|Enter|Back|Forward|Backward|Fast)/.test(n) },
  { key: 'file', label: '文件文档', match: (n) => /^(File|Folder|Book|Doc|Copy|Print|Diff|Export|Import|Snippets|Schedule|Read|Journal|Profile)/.test(n) },
  { key: 'user', label: '用户人物', match: (n) => /^(User|Team|Contacts|Account|Man|Woman|People|Member|Smile|Meh|Frown)/.test(n) },
  { key: 'chart', label: '图表数据', match: (n) => /^(Chart|Bar|Line|Dot|Area|Pie|Stock|Dashboard|DotChart|BoxPlot|Statistic|Fund|Radar)/.test(n) },
  { key: 'business', label: '商业财务', match: (n) => /^(Dollar|Euro|Pound|Yuan|Money|Pay|Wallet|Bank|Shop|Store|Cart|Gift|Crown|Trophy|Gold|Transaction|AccountBook|Audit|Insurance)/.test(n) },
  { key: 'device', label: '设备硬件', match: (n) => /^(Desktop|Laptop|Mobile|Phone|Tablet|Camera|Cloud|Database|Server|Api|Usb|Wifi|Chrome|Apple|Android|Windows|Linux)/.test(n) },
  { key: 'edit', label: '编辑操作', match: (n) => /^(Edit|Delete|Add|Plus|Minus|Save|Check|Close|Clear|Format|Align|Bold|Italic|Underline|Strike|Cut|Paste|Redo|Undo|Drag|Sort|Filter|Search|Scan|Select|Highlight|Border)/.test(n) },
  { key: 'status', label: '状态提示', match: (n) => /^(Check|Close|Info|Warning|Error|Success|Loading|Exclamation|Question|Stop|Ban|Warning|Alert|Notification|Bell|Message|Mail|Phone|Signal)/.test(n) },
  { key: 'media', label: '影音媒体', match: (n) => /^(Play|Pause|Step|Sound|Audio|Video|Picture|Image|Camera|Film|Music|Voice|Mute|Star|Heart|Fire|Like|Dislike|Eye)/.test(n) },
  { key: 'system', label: '系统设置', match: (n) => /^(Setting|Tool|Build|Control|Layout|Appstore|Menu|Dashboard|Home|Safety|Lock|Key|Unlock|Power|Logout|Login|Reload|Refresh|Sync|Swap|Sliders)/.test(n) },
  { key: 'transport', label: '交通出行', match: (n) => /^(Car|Vehicle|Bus|Bike|Ship|Plane|Rocket|Train|Truck|Shop|Carry|Take|Transport|Road|Traffic|Environment|Location|Compass|Aim|Target)/.test(n) },
  { key: 'other', label: '其他', match: () => true },
];

// 计算每个分类在各风格下的图标数量
const categoryCounts = categoryMap.map((cat) => ({
  ...cat,
  counts: {
    Outlined: iconGroups.Outlined.filter(([n]) => cat.match(n)).length,
    Filled: iconGroups.Filled.filter(([n]) => cat.match(n)).length,
    TwoTone: iconGroups.TwoTone.filter(([n]) => cat.match(n)).length,
  },
}));

const PAGE_SIZE = 84; // 84 个/页，网格 12 列 × 7 行

const IconCell = ({ name, Comp, selected, onClick }) => (
  <Tooltip title={name} mouseEnterDelay={0.3}>
    <div
      onClick={() => onClick(name)}
      style={{
        width: 56,
        height: 56,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        cursor: 'pointer',
        borderRadius: 8,
        border: selected ? '1px solid var(--primary-color, #1677ff)' : '1px solid transparent',
        background: selected ? 'rgba(22, 119, 255, 0.08)' : 'transparent',
        transition: 'all 0.2s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = 'var(--table-header-bg, #f5f5f5)';
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = 'transparent';
      }}
    >
      {selected && (
        <CheckCircleFilled
          style={{
            position: 'absolute', top: 4, right: 4, fontSize: 12,
            color: 'var(--primary-color, #1677ff)',
          }}
        />
      )}
      <Comp style={{ fontSize: 22, color: selected ? 'var(--primary-color, #1677ff)' : 'inherit' }} />
      <span style={{ fontSize: 10, color: 'var(--text-secondary, #999)', maxWidth: 54, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name.replace(/(Outlined|Filled|TwoTone)$/, '')}
      </span>
    </div>
  </Tooltip>
);

const IconPicker = ({ value, onChange, placeholder = '请选择图标', disabled, allowClear = true }) => {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState('Outlined');
  const [category, setCategory] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);

  // 选中图标的实时预览
  const SelectedIcon = value ? AllIcons[value] : null;

  // 当弹窗打开时重置筛选条件
  useEffect(() => {
    if (open) {
      setStyle('Outlined');
      setCategory('all');
      setKeyword('');
      setPage(1);
    }
  }, [open]);

  // 当前风格 + 分类 + 关键字下的图标列表
  const filteredIcons = useMemo(() => {
    const list = iconGroups[style] || [];
    const cat = categoryMap.find((c) => c.key === category) || categoryMap[0];
    const kw = keyword.trim().toLowerCase();
    return list.filter(([name]) => {
      if (!cat.match(name)) return false;
      if (kw && !name.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [style, category, keyword]);

  // 分页切片
  const pagedIcons = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredIcons.slice(start, start + PAGE_SIZE);
  }, [filteredIcons, page]);

  // 切换风格/分类/搜索时重置页码
  useEffect(() => { setPage(1); }, [style, category, keyword]);

  const handleSelect = useCallback((name) => {
    onChange?.(name);
    setOpen(false);
  }, [onChange]);

  const handleClear = useCallback((e) => {
    e?.stopPropagation();
    onChange?.('');
  }, [onChange]);

  // 当前分类的可选数量
  const currentCategory = categoryCounts.find((c) => c.key === category) || categoryCounts[0];

  return (
    <>
      <div
        onClick={() => !disabled && setOpen(true)}
        style={{
          minHeight: 32,
          padding: '4px 11px',
          border: '1px solid var(--border-color, #d9d9d9)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? 'var(--table-header-bg, #f5f5f5)' : 'var(--bg-container, #fff)',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          {SelectedIcon ? (
            <>
              <SelectedIcon style={{ fontSize: 18, color: 'var(--primary-color, #1677ff)' }} />
              <span style={{ fontSize: 14 }}>{value}</span>
            </>
          ) : (
            <span style={{ color: 'var(--text-secondary, #bfbfbf)', fontSize: 14 }}>{placeholder}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {value && allowClear && !disabled && (
            <DeleteOutlined
              onClick={handleClear}
              style={{ color: 'var(--text-secondary, #999)', fontSize: 14 }}
            />
          )}
          <SearchOutlined style={{ color: 'var(--text-secondary, #999)', fontSize: 14 }} />
        </div>
      </div>

      <Modal
        title="选择图标"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={820}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 顶部：风格切换 + 搜索 */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Segmented
              value={style}
              onChange={setStyle}
              options={[
                { label: `线框 (${iconGroups.Outlined.length})`, value: 'Outlined' },
                { label: `填充 (${iconGroups.Filled.length})`, value: 'Filled' },
                { label: `双色 (${iconGroups.TwoTone.length})`, value: 'TwoTone' },
              ]}
            />
            <Input
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
              placeholder="搜索图标名称（如：user、car、setting）"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              allowClear
              style={{ flex: 1 }}
            />
          </div>

          {/* 分类标签 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {categoryCounts.map((cat) => {
              const count = cat.counts[style];
              const active = cat.key === category;
              return (
                <Tag
                  key={cat.key}
                  style={{ cursor: count === 0 ? 'not-allowed' : 'pointer', margin: 0, opacity: count === 0 ? 0.4 : 1 }}
                  color={active ? 'blue' : 'default'}
                  onClick={() => count > 0 && setCategory(cat.key)}
                >
                  {cat.label} ({count})
                </Tag>
              );
            })}
          </div>

          {/* 图标网格 */}
          <div
            style={{
              minHeight: 360,
              maxHeight: 460,
              overflowY: 'auto',
              border: '1px solid var(--border-color, #f0f0f0)',
              borderRadius: 6,
              padding: 12,
              background: 'var(--bg-container, #fafafa)',
            }}
          >
            {pagedIcons.length === 0 ? (
              <Empty description="未找到匹配图标" style={{ margin: '60px 0' }} />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(12, 1fr)',
                  gap: 4,
                }}
              >
                {pagedIcons.map(([name, Comp]) => (
                  <IconCell
                    key={name}
                    name={name}
                    Comp={Comp}
                    selected={name === value}
                    onClick={handleSelect}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 底部分页 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              共 {filteredIcons.length} 个图标 · 当前第 {page}/{Math.max(1, Math.ceil(filteredIcons.length / PAGE_SIZE))} 页
            </span>
            <Pagination
              current={page}
              pageSize={PAGE_SIZE}
              total={filteredIcons.length}
              onChange={setPage}
              showSizeChanger={false}
              size="small"
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default IconPicker;

/**
 * 按名称渲染 antd 图标，便于表格等场景复用
 * @param {string} name 图标名称（如 'DashboardOutlined'）
 * @param {object} props 透传给图标组件的属性
 */
export const renderIcon = (name, props = {}) => {
  if (!name) return null;
  const Comp = AllIcons[name];
  if (!Comp) return null;
  return <Comp {...props} />;
};

