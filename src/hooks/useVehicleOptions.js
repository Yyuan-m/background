import { useState, useEffect } from 'react';
import { getVehiclesApi } from '@/api/modules/vehicle';

// 模块级缓存：避免多个车辆子模块重复请求车辆列表
let vehicleOptionsCache = null;
let vehicleOptionsPromise = null;

const fetchVehicleOptions = () => {
  if (vehicleOptionsCache) return Promise.resolve(vehicleOptionsCache);
  if (vehicleOptionsPromise) return vehicleOptionsPromise;
  vehicleOptionsPromise = getVehiclesApi({ page: 1, pageSize: 200 })
    .then((res) => {
      const list = (res?.list || []).map((v) => ({
        label: v.name,
        value: v.id,
        plateNumber: v.plateNumber,
        raw: v,
      }));
      vehicleOptionsCache = list;
      vehicleOptionsPromise = null;
      return list;
    })
    .catch((e) => {
      console.error('车辆列表加载失败:', e);
      vehicleOptionsPromise = null;
      return [];
    });
  return vehicleOptionsPromise;
};

/** 清除缓存（车辆新增/编辑后可调用） */
export const clearVehicleOptionsCache = () => {
  vehicleOptionsCache = null;
  vehicleOptionsPromise = null;
};

/**
 * 车辆选项 Hook：用于车辆子模块（维保/证件/GPS/违章/素材）的车辆筛选下拉
 * @returns {{options: Array, loading: boolean, refresh: Function}}
 */
export const useVehicleOptions = () => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetchVehicleOptions().then((list) => {
      setOptions(list);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  return { options, loading, refresh: () => { clearVehicleOptionsCache(); load(); } };
};

export default useVehicleOptions;
