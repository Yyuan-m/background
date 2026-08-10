import { useState, useEffect, useMemo } from 'react';
import { Carousel as AntCarousel } from 'antd';
import { getActiveCarouselApi } from '@/api/modules/carousel';
import { imageUrl } from '@/utils/imageUrl';
import './index.scss';

/**
 * 首页轮播图组件
 * 数据来源于后端轮播图配置（/api/carousel/active）
 * 仅展示 status=1 的启用项，按 sortOrder 升序
 */
const HomeCarousel = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getActiveCarouselApi();
        if (cancelled) return;
        setList(Array.isArray(res) ? res : []);
      } catch (e) {
        // 轮播图加载失败不应阻塞 Dashboard 渲染
        console.error('HomeCarousel load failed:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const slides = useMemo(() => list.filter((it) => it?.imageUrl), [list]);

  // 加载中 / 无数据时均不渲染，避免占用 Dashboard 空间
  if (loading || slides.length === 0) return null;

  return (
    <div className="home-carousel">
      <AntCarousel autoplay autoplaySpeed={5000} dots effect="fade" easing="ease-in-out">
        {slides.map((item) => (
          <div key={item.id} className="home-carousel__slide">
            <a
              href={item.linkUrl || undefined}
              target={item.linkUrl ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="home-carousel__link"
            >
              <img src={imageUrl(item.imageUrl)} alt={item.title || ''} className="home-carousel__img" />
              {(item.title || item.description) && (
                <div className="home-carousel__caption">
                  {item.title && <h3 className="home-carousel__title">{item.title}</h3>}
                  {item.description && <p className="home-carousel__desc">{item.description}</p>}
                </div>
              )}
            </a>
          </div>
        ))}
      </AntCarousel>
    </div>
  );
};

export default HomeCarousel;
