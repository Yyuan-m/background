import React from 'react';
import { Card } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import CountUp from '@/components/CountUp';
import '@/components/StatCard.scss';

const StatCard = ({ icon, title, value, prefix, suffix, color, loading, to }) => {
  const navigate = useNavigate();
  const clickable = !!to;

  const handleClick = () => {
    if (clickable) navigate(to);
  };

  const handleKeyDown = (e) => {
    if (clickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      navigate(to);
    }
  };

  return (
    <Card
      className={`stat-card${clickable ? ' stat-card-clickable' : ''}`}
      loading={loading}
      variant="borderless"
      onClick={clickable ? handleClick : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : undefined}
      aria-label={clickable ? `跳转到${title}` : undefined}
    >
      <div className="stat-card-inner">
        <div className="stat-card-icon" style={{ background: `${color}15`, color }}>
          {icon}
        </div>
        <div className="stat-card-content">
          <div className="stat-card-title">{title}</div>
          <div className="stat-card-value" style={{ color }}>
            {prefix && <span className="stat-card-prefix">{prefix}</span>}
            <CountUp end={value} />
            {suffix && <span className="stat-card-suffix">{suffix}</span>}
          </div>
        </div>
        {clickable && (
          <div className="stat-card-arrow" style={{ color }}>
            <ArrowRightOutlined />
          </div>
        )}
      </div>
    </Card>
  );
};

export default React.memo(StatCard);
