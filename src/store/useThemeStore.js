import { create } from 'zustand';
import { theme as antdTheme } from 'antd';
import storage from '@/utils/storage';
import { STORAGE_KEYS } from '@/constants';

const THEME_STORAGE_KEY = STORAGE_KEYS.THEME_CONFIG;
const { defaultAlgorithm, darkAlgorithm } = antdTheme;

// ==================== 8套主题完整配色 ====================
// 分类：暗色全黑(darkAlgorithm) / 暗侧栏+亮内容 / 亮色全白
const themeColorMap = {
  // ========== 1. 蓝黑经典（默认：暗侧栏+亮内容） ==========
  'blue-black': {
    type: 'mixed',
    css: {
      '--primary-color': '#3b82f6',
      '--primary-light': '#60a5fa',
      '--primary-dark': '#1d4ed8',
      '--accent-color': '#c9a96e',
      '--accent-light': '#d4bc8a',
      '--accent-dark': '#b8944a',
      '--bg-page': '#f0f2f5',
      '--bg-container': '#ffffff',
      '--bg-sidebar': '#1e293b',
      '--bg-sidebar-hover': 'rgba(201, 169, 110, 0.1)',
      '--bg-sidebar-active': 'linear-gradient(90deg, rgba(201,169,110,0.2) 0%, rgba(201,169,110,0.05) 100%)',
      '--bg-header': '#ffffff',
      '--bg-input': '#ffffff',
      '--text-primary': '#0f172a',
      '--text-secondary': '#64748b',
      '--text-muted': '#94a3b8',
      '--text-sidebar': 'rgba(255,255,255,0.65)',
      '--text-sidebar-active': '#c9a96e',
      '--text-sidebar-hover': '#c9a96e',
      '--text-on-primary': '#ffffff',
      '--border-color': '#e2e8f0',
      '--border-light': '#f0f0f0',
      '--table-header-bg': '#fafbfc',
      '--table-row-hover': '#f8fafc',
      '--success-color': '#10b981',
      '--warning-color': '#f59e0b',
      '--error-color': '#ef4444',
      '--info-color': '#3b82f6',
      '--amount-color': '#c9a96e',
      '--card-shadow': '0 2px 8px rgba(0,0,0,0.08)',
      '--sidebar-gradient-start': '#0f1f3a',
      '--sidebar-gradient-end': '#0a1628',
      '--sidebar-border': 'rgba(255,255,255,0.08)',
      '--avatar-bg': '#c9a96e',
      '--user-name-color': '#1a1a2e',
      '--chart-color-1': '#1a365d',
      '--chart-color-2': '#c9a96e',
      '--chart-color-3': '#3b82f6',
      '--chart-color-4': '#10b981',
      '--chart-grid': '#f0f0f0',
      '--login-bg-start': '#0a1628',
      '--login-bg-mid': '#1a365d',
      '--login-bg-end': '#0f2240',
      '--login-card-bg': 'rgba(255,255,255,0.98)',
      '--login-card-shadow': '0 20px 60px rgba(0,0,0,0.4)',
      '--login-logo-bg-start': '#1a365d',
      '--login-logo-bg-end': '#0f2240',
      '--login-logo-shadow': 'rgba(26,54,93,0.3)',
      '--login-circle-1': '#c9a96e',
      '--login-circle-2': '#60a5fa',
      '--login-line-color': 'rgba(201,169,110,0.3)',
      '--login-footer-text': '#bbb',
      '--stat-card-bg': '#ffffff',
      '--breadcrumb-separator': '#c0c4cc',
      '--scrollbar-thumb': 'rgba(0,0,0,0.15)',
      '--scrollbar-thumb-hover': 'rgba(0,0,0,0.25)',
    },
    antd: {
      algorithm: defaultAlgorithm,
      colorPrimary: '#1a365d',
      colorSuccess: '#10b981',
      colorWarning: '#f59e0b',
      colorError: '#ef4444',
      colorInfo: '#3b82f6',
      darkItemSelectedBg: 'rgba(201,169,110,0.2)',
      darkItemSelectedColor: '#c9a96e',
      headerBg: '#fafbfc',
    },
  },

  // ========== 2. 纯白极简（全亮色） ==========
  'pure-white': {
    type: 'light',
    css: {
      '--primary-color': '#6366f1',
      '--primary-light': '#818cf8',
      '--primary-dark': '#4f46e5',
      '--accent-color': '#6366f1',
      '--accent-light': '#818cf8',
      '--accent-dark': '#4f46e5',
      '--bg-page': '#f5f5f5',
      '--bg-container': '#ffffff',
      '--bg-sidebar': '#ffffff',
      '--bg-sidebar-hover': 'rgba(99,102,241,0.08)',
      '--bg-sidebar-active': 'linear-gradient(90deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 100%)',
      '--bg-header': '#ffffff',
      '--bg-input': '#ffffff',
      '--text-primary': '#1e293b',
      '--text-secondary': '#475569',
      '--text-muted': '#64748b',
      '--text-sidebar': '#475569',
      '--text-sidebar-active': '#6366f1',
      '--text-sidebar-hover': '#6366f1',
      '--text-on-primary': '#ffffff',
      '--border-color': '#e5e7eb',
      '--border-light': '#f3f4f6',
      '--table-header-bg': '#f9fafb',
      '--table-row-hover': '#f9fafb',
      '--success-color': '#10b981',
      '--warning-color': '#f59e0b',
      '--error-color': '#ef4444',
      '--info-color': '#6366f1',
      '--amount-color': '#6366f1',
      '--card-shadow': '0 1px 4px rgba(0,0,0,0.06)',
      '--sidebar-gradient-start': '#ffffff',
      '--sidebar-gradient-end': '#fafafa',
      '--sidebar-border': '#e5e7eb',
      '--avatar-bg': '#6366f1',
      '--user-name-color': '#1e293b',
      '--chart-color-1': '#6366f1',
      '--chart-color-2': '#818cf8',
      '--chart-color-3': '#4f46e5',
      '--chart-color-4': '#10b981',
      '--chart-grid': '#f0f0f0',
      '--login-bg-start': '#eef2ff',
      '--login-bg-mid': '#e0e7ff',
      '--login-bg-end': '#eef2ff',
      '--login-card-bg': 'rgba(255,255,255,0.98)',
      '--login-card-shadow': '0 20px 60px rgba(0,0,0,0.1)',
      '--login-logo-bg-start': '#6366f1',
      '--login-logo-bg-end': '#4f46e5',
      '--login-logo-shadow': 'rgba(99,102,241,0.3)',
      '--login-circle-1': '#6366f1',
      '--login-circle-2': '#818cf8',
      '--login-line-color': 'rgba(99,102,241,0.15)',
      '--login-footer-text': '#94a3b8',
      '--stat-card-bg': '#ffffff',
      '--breadcrumb-separator': '#c0c4cc',
      '--scrollbar-thumb': 'rgba(0,0,0,0.12)',
      '--scrollbar-thumb-hover': 'rgba(0,0,0,0.2)',
    },
    antd: {
      algorithm: defaultAlgorithm,
      colorPrimary: '#6366f1',
      colorSuccess: '#10b981',
      colorWarning: '#f59e0b',
      colorError: '#ef4444',
      colorInfo: '#6366f1',
      darkItemSelectedBg: 'rgba(99,102,241,0.12)',
      darkItemSelectedColor: '#6366f1',
      headerBg: '#f9fafb',
    },
  },

  // ========== 3. 暗夜黑金（全暗色 + darkAlgorithm） ==========
  'black-gold': {
    type: 'dark',
    css: {
      '--primary-color': '#d4a853',
      '--primary-light': '#e0c078',
      '--primary-dark': '#b8944a',
      '--accent-color': '#d4a853',
      '--accent-light': '#e0c078',
      '--accent-dark': '#b8944a',
      '--bg-page': '#0d0d0d',
      '--bg-container': '#1a1a1a',
      '--bg-sidebar': '#0a0a0a',
      '--bg-sidebar-hover': 'rgba(212,168,83,0.12)',
      '--bg-sidebar-active': 'linear-gradient(90deg, rgba(212,168,83,0.25) 0%, rgba(212,168,83,0.08) 100%)',
      '--bg-header': '#141414',
      '--bg-input': '#262626',
      '--text-primary': '#f0f0f0',
      '--text-secondary': '#b0b0b0',
      '--text-muted': '#888888',
      '--text-sidebar': 'rgba(255,255,255,0.65)',
      '--text-sidebar-active': '#d4a853',
      '--text-sidebar-hover': '#d4a853',
      '--text-on-primary': '#0d0d0d',
      '--border-color': '#333333',
      '--border-light': '#262626',
      '--table-header-bg': '#262626',
      '--table-row-hover': '#222222',
      '--success-color': '#4ade80',
      '--warning-color': '#fbbf24',
      '--error-color': '#f87171',
      '--info-color': '#d4a853',
      '--amount-color': '#d4a853',
      '--card-shadow': '0 2px 8px rgba(0,0,0,0.4)',
      '--sidebar-gradient-start': '#0a0a0a',
      '--sidebar-gradient-end': '#050505',
      '--sidebar-border': 'rgba(255,255,255,0.06)',
      '--avatar-bg': '#d4a853',
      '--user-name-color': '#e8e8e8',
      '--chart-color-1': '#d4a853',
      '--chart-color-2': '#e0c078',
      '--chart-color-3': '#b8944a',
      '--chart-color-4': '#4ade80',
      '--chart-grid': '#2a2a2a',
      '--login-bg-start': '#050505',
      '--login-bg-mid': '#0d0d0d',
      '--login-bg-end': '#050505',
      '--login-card-bg': 'rgba(26,26,26,0.98)',
      '--login-card-shadow': '0 20px 60px rgba(0,0,0,0.7)',
      '--login-logo-bg-start': '#d4a853',
      '--login-logo-bg-end': '#b8944a',
      '--login-logo-shadow': 'rgba(212,168,83,0.4)',
      '--login-circle-1': '#d4a853',
      '--login-circle-2': '#e0c078',
      '--login-line-color': 'rgba(212,168,83,0.15)',
      '--login-footer-text': '#555',
      '--stat-card-bg': '#1a1a1a',
      '--breadcrumb-separator': '#555',
      '--scrollbar-thumb': 'rgba(255,255,255,0.12)',
      '--scrollbar-thumb-hover': 'rgba(255,255,255,0.2)',
    },
    antd: {
      algorithm: darkAlgorithm,
      colorPrimary: '#d4a853',
      colorSuccess: '#4ade80',
      colorWarning: '#fbbf24',
      colorError: '#f87171',
      colorInfo: '#d4a853',
      darkItemSelectedBg: 'rgba(212,168,83,0.25)',
      darkItemSelectedColor: '#d4a853',
      headerBg: '#1f1f1f',
    },
  },

  // ========== 4. 深海蔚蓝（暗侧栏+亮内容） ==========
  'ocean-blue': {
    type: 'mixed',
    css: {
      '--primary-color': '#0ea5e9',
      '--primary-light': '#38bdf8',
      '--primary-dark': '#0284c7',
      '--accent-color': '#22d3ee',
      '--accent-light': '#67e8f9',
      '--accent-dark': '#06b6d4',
      '--bg-page': '#f0f9ff',
      '--bg-container': '#ffffff',
      '--bg-sidebar': '#0b1a2e',
      '--bg-sidebar-hover': 'rgba(14,165,233,0.12)',
      '--bg-sidebar-active': 'linear-gradient(90deg, rgba(14,165,233,0.2) 0%, rgba(14,165,233,0.05) 100%)',
      '--bg-header': '#ffffff',
      '--bg-input': '#ffffff',
      '--text-primary': '#0f172a',
      '--text-secondary': '#475569',
      '--text-muted': '#94a3b8',
      '--text-sidebar': 'rgba(255,255,255,0.6)',
      '--text-sidebar-active': '#38bdf8',
      '--text-sidebar-hover': '#38bdf8',
      '--text-on-primary': '#ffffff',
      '--border-color': '#e0f2fe',
      '--border-light': '#f0f9ff',
      '--table-header-bg': '#f0f9ff',
      '--table-row-hover': '#f0f9ff',
      '--success-color': '#10b981',
      '--warning-color': '#f59e0b',
      '--error-color': '#ef4444',
      '--info-color': '#0ea5e9',
      '--amount-color': '#0ea5e9',
      '--card-shadow': '0 2px 8px rgba(0,0,0,0.06)',
      '--sidebar-gradient-start': '#061525',
      '--sidebar-gradient-end': '#0b1a2e',
      '--sidebar-border': 'rgba(255,255,255,0.06)',
      '--avatar-bg': '#0ea5e9',
      '--user-name-color': '#1a1a2e',
      '--chart-color-1': '#0ea5e9',
      '--chart-color-2': '#38bdf8',
      '--chart-color-3': '#0284c7',
      '--chart-color-4': '#10b981',
      '--chart-grid': '#e0f2fe',
      '--login-bg-start': '#061525',
      '--login-bg-mid': '#0b1a2e',
      '--login-bg-end': '#061525',
      '--login-card-bg': 'rgba(255,255,255,0.98)',
      '--login-card-shadow': '0 20px 60px rgba(0,0,0,0.35)',
      '--login-logo-bg-start': '#0ea5e9',
      '--login-logo-bg-end': '#0284c7',
      '--login-logo-shadow': 'rgba(14,165,233,0.3)',
      '--login-circle-1': '#22d3ee',
      '--login-circle-2': '#38bdf8',
      '--login-line-color': 'rgba(34,211,238,0.2)',
      '--login-footer-text': '#94a3b8',
      '--stat-card-bg': '#ffffff',
      '--breadcrumb-separator': '#c0c4cc',
      '--scrollbar-thumb': 'rgba(0,0,0,0.15)',
      '--scrollbar-thumb-hover': 'rgba(0,0,0,0.25)',
    },
    antd: {
      algorithm: defaultAlgorithm,
      colorPrimary: '#0ea5e9',
      colorSuccess: '#10b981',
      colorWarning: '#f59e0b',
      colorError: '#ef4444',
      colorInfo: '#0ea5e9',
      darkItemSelectedBg: 'rgba(14,165,233,0.2)',
      darkItemSelectedColor: '#38bdf8',
      headerBg: '#f0f9ff',
    },
  },

  // ========== 5. 翡翠暗夜（全暗色 + darkAlgorithm） ==========
  'jade-dark': {
    type: 'dark',
    css: {
      '--primary-color': '#10b981',
      '--primary-light': '#34d399',
      '--primary-dark': '#059669',
      '--accent-color': '#a3e635',
      '--accent-light': '#bef264',
      '--accent-dark': '#84cc16',
      '--bg-page': '#0a0f0c',
      '--bg-container': '#141c16',
      '--bg-sidebar': '#080c0a',
      '--bg-sidebar-hover': 'rgba(16,185,129,0.12)',
      '--bg-sidebar-active': 'linear-gradient(90deg, rgba(16,185,129,0.25) 0%, rgba(16,185,129,0.08) 100%)',
      '--bg-header': '#111712',
      '--bg-input': '#1a241e',
      '--text-primary': '#f0f2f0',
      '--text-secondary': '#b8c0b8',
      '--text-muted': '#8a948a',
      '--text-sidebar': 'rgba(255,255,255,0.65)',
      '--text-sidebar-active': '#34d399',
      '--text-sidebar-hover': '#34d399',
      '--text-on-primary': '#0a0f0c',
      '--border-color': '#2a3530',
      '--border-light': '#1f2a23',
      '--table-header-bg': '#1f2a23',
      '--table-row-hover': '#1a2520',
      '--success-color': '#34d399',
      '--warning-color': '#fbbf24',
      '--error-color': '#f87171',
      '--info-color': '#10b981',
      '--amount-color': '#34d399',
      '--card-shadow': '0 2px 8px rgba(0,0,0,0.4)',
      '--sidebar-gradient-start': '#080c0a',
      '--sidebar-gradient-end': '#040605',
      '--sidebar-border': 'rgba(255,255,255,0.05)',
      '--avatar-bg': '#10b981',
      '--user-name-color': '#e5e7e6',
      '--chart-color-1': '#10b981',
      '--chart-color-2': '#34d399',
      '--chart-color-3': '#059669',
      '--chart-color-4': '#a3e635',
      '--chart-grid': '#1f2a23',
      '--login-bg-start': '#040605',
      '--login-bg-mid': '#0a0f0c',
      '--login-bg-end': '#040605',
      '--login-card-bg': 'rgba(20,28,22,0.98)',
      '--login-card-shadow': '0 20px 60px rgba(0,0,0,0.7)',
      '--login-logo-bg-start': '#10b981',
      '--login-logo-bg-end': '#059669',
      '--login-logo-shadow': 'rgba(16,185,129,0.4)',
      '--login-circle-1': '#a3e635',
      '--login-circle-2': '#34d399',
      '--login-line-color': 'rgba(163,230,53,0.12)',
      '--login-footer-text': '#555',
      '--stat-card-bg': '#141c16',
      '--breadcrumb-separator': '#4a5a4f',
      '--scrollbar-thumb': 'rgba(255,255,255,0.1)',
      '--scrollbar-thumb-hover': 'rgba(255,255,255,0.18)',
    },
    antd: {
      algorithm: darkAlgorithm,
      colorPrimary: '#10b981',
      colorSuccess: '#34d399',
      colorWarning: '#fbbf24',
      colorError: '#f87171',
      colorInfo: '#10b981',
      darkItemSelectedBg: 'rgba(16,185,129,0.25)',
      darkItemSelectedColor: '#34d399',
      headerBg: '#18201a',
    },
  },

  // ========== 6. 紫夜暗影（全暗色 + darkAlgorithm） ==========
  'purple-dark': {
    type: 'dark',
    css: {
      '--primary-color': '#a855f7',
      '--primary-light': '#c084fc',
      '--primary-dark': '#7c3aed',
      '--accent-color': '#e879f9',
      '--accent-light': '#f0abfc',
      '--accent-dark': '#d946ef',
      '--bg-page': '#0f0a14',
      '--bg-container': '#1a1320',
      '--bg-sidebar': '#0a0710',
      '--bg-sidebar-hover': 'rgba(168,85,247,0.12)',
      '--bg-sidebar-active': 'linear-gradient(90deg, rgba(168,85,247,0.25) 0%, rgba(168,85,247,0.08) 100%)',
      '--bg-header': '#140f1a',
      '--bg-input': '#221a2a',
      '--text-primary': '#f0ecf4',
      '--text-secondary': '#c0b5cc',
      '--text-muted': '#9080a0',
      '--text-sidebar': 'rgba(255,255,255,0.65)',
      '--text-sidebar-active': '#c084fc',
      '--text-sidebar-hover': '#c084fc',
      '--text-on-primary': '#0f0a14',
      '--border-color': '#362940',
      '--border-light': '#261f30',
      '--table-header-bg': '#261f30',
      '--table-row-hover': '#221a2c',
      '--success-color': '#34d399',
      '--warning-color': '#fbbf24',
      '--error-color': '#f87171',
      '--info-color': '#a855f7',
      '--amount-color': '#c084fc',
      '--card-shadow': '0 2px 8px rgba(0,0,0,0.4)',
      '--sidebar-gradient-start': '#0a0710',
      '--sidebar-gradient-end': '#050308',
      '--sidebar-border': 'rgba(255,255,255,0.05)',
      '--avatar-bg': '#a855f7',
      '--user-name-color': '#e8e4ec',
      '--chart-color-1': '#a855f7',
      '--chart-color-2': '#c084fc',
      '--chart-color-3': '#7c3aed',
      '--chart-color-4': '#e879f9',
      '--chart-grid': '#261f30',
      '--login-bg-start': '#050308',
      '--login-bg-mid': '#0f0a14',
      '--login-bg-end': '#050308',
      '--login-card-bg': 'rgba(26,19,32,0.98)',
      '--login-card-shadow': '0 20px 60px rgba(0,0,0,0.7)',
      '--login-logo-bg-start': '#a855f7',
      '--login-logo-bg-end': '#7c3aed',
      '--login-logo-shadow': 'rgba(168,85,247,0.4)',
      '--login-circle-1': '#e879f9',
      '--login-circle-2': '#c084fc',
      '--login-line-color': 'rgba(232,121,249,0.12)',
      '--login-footer-text': '#555',
      '--stat-card-bg': '#1a1320',
      '--breadcrumb-separator': '#4a4060',
      '--scrollbar-thumb': 'rgba(255,255,255,0.1)',
      '--scrollbar-thumb-hover': 'rgba(255,255,255,0.18)',
    },
    antd: {
      algorithm: darkAlgorithm,
      colorPrimary: '#a855f7',
      colorSuccess: '#34d399',
      colorWarning: '#fbbf24',
      colorError: '#f87171',
      colorInfo: '#a855f7',
      darkItemSelectedBg: 'rgba(168,85,247,0.25)',
      darkItemSelectedColor: '#c084fc',
      headerBg: '#1d1625',
    },
  },

  // ========== 7. 日落暖橙（暗侧栏+亮内容） ==========
  'sunset-orange': {
    type: 'mixed',
    css: {
      '--primary-color': '#f97316',
      '--primary-light': '#fb923c',
      '--primary-dark': '#ea580c',
      '--accent-color': '#fbbf24',
      '--accent-light': '#fcd34d',
      '--accent-dark': '#f59e0b',
      '--bg-page': '#fff7ed',
      '--bg-container': '#ffffff',
      '--bg-sidebar': '#1c1410',
      '--bg-sidebar-hover': 'rgba(249,115,22,0.12)',
      '--bg-sidebar-active': 'linear-gradient(90deg, rgba(249,115,22,0.2) 0%, rgba(249,115,22,0.05) 100%)',
      '--bg-header': '#ffffff',
      '--bg-input': '#ffffff',
      '--text-primary': '#0f172a',
      '--text-secondary': '#475569',
      '--text-muted': '#94a3b8',
      '--text-sidebar': 'rgba(255,255,255,0.6)',
      '--text-sidebar-active': '#fb923c',
      '--text-sidebar-hover': '#fb923c',
      '--text-on-primary': '#ffffff',
      '--border-color': '#ffedd5',
      '--border-light': '#fff7ed',
      '--table-header-bg': '#fff7ed',
      '--table-row-hover': '#fff7ed',
      '--success-color': '#10b981',
      '--warning-color': '#f97316',
      '--error-color': '#ef4444',
      '--info-color': '#f97316',
      '--amount-color': '#f97316',
      '--card-shadow': '0 2px 8px rgba(0,0,0,0.06)',
      '--sidebar-gradient-start': '#160c08',
      '--sidebar-gradient-end': '#1c1410',
      '--sidebar-border': 'rgba(255,255,255,0.06)',
      '--avatar-bg': '#f97316',
      '--user-name-color': '#1a1a2e',
      '--chart-color-1': '#f97316',
      '--chart-color-2': '#fb923c',
      '--chart-color-3': '#ea580c',
      '--chart-color-4': '#fbbf24',
      '--chart-grid': '#ffedd5',
      '--login-bg-start': '#160c08',
      '--login-bg-mid': '#1c1410',
      '--login-bg-end': '#160c08',
      '--login-card-bg': 'rgba(255,255,255,0.98)',
      '--login-card-shadow': '0 20px 60px rgba(0,0,0,0.35)',
      '--login-logo-bg-start': '#f97316',
      '--login-logo-bg-end': '#ea580c',
      '--login-logo-shadow': 'rgba(249,115,22,0.3)',
      '--login-circle-1': '#fbbf24',
      '--login-circle-2': '#fb923c',
      '--login-line-color': 'rgba(251,191,36,0.2)',
      '--login-footer-text': '#94a3b8',
      '--stat-card-bg': '#ffffff',
      '--breadcrumb-separator': '#c0c4cc',
      '--scrollbar-thumb': 'rgba(0,0,0,0.15)',
      '--scrollbar-thumb-hover': 'rgba(0,0,0,0.25)',
    },
    antd: {
      algorithm: defaultAlgorithm,
      colorPrimary: '#f97316',
      colorSuccess: '#10b981',
      colorWarning: '#f97316',
      colorError: '#ef4444',
      colorInfo: '#f97316',
      darkItemSelectedBg: 'rgba(249,115,22,0.2)',
      darkItemSelectedColor: '#fb923c',
      headerBg: '#fff7ed',
    },
  },

  // ========== 8. 石墨极简（全亮色） ==========
  'graphite': {
    type: 'light',
    css: {
      '--primary-color': '#475569',
      '--primary-light': '#64748b',
      '--primary-dark': '#334155',
      '--accent-color': '#1e293b',
      '--accent-light': '#334155',
      '--accent-dark': '#0f172a',
      '--bg-page': '#f1f5f9',
      '--bg-container': '#ffffff',
      '--bg-sidebar': '#f8fafc',
      '--bg-sidebar-hover': 'rgba(71,85,105,0.06)',
      '--bg-sidebar-active': 'linear-gradient(90deg, rgba(71,85,105,0.1) 0%, rgba(71,85,105,0.03) 100%)',
      '--bg-header': '#ffffff',
      '--bg-input': '#ffffff',
      '--text-primary': '#0f172a',
      '--text-secondary': '#64748b',
      '--text-muted': '#94a3b8',
      '--text-sidebar': '#475569',
      '--text-sidebar-active': '#1e293b',
      '--text-sidebar-hover': '#1e293b',
      '--text-on-primary': '#ffffff',
      '--border-color': '#e2e8f0',
      '--border-light': '#f1f5f9',
      '--table-header-bg': '#f8fafc',
      '--table-row-hover': '#f8fafc',
      '--success-color': '#10b981',
      '--warning-color': '#f59e0b',
      '--error-color': '#ef4444',
      '--info-color': '#475569',
      '--amount-color': '#475569',
      '--card-shadow': '0 1px 3px rgba(0,0,0,0.06)',
      '--sidebar-gradient-start': '#f8fafc',
      '--sidebar-gradient-end': '#f1f5f9',
      '--sidebar-border': '#e2e8f0',
      '--avatar-bg': '#475569',
      '--user-name-color': '#0f172a',
      '--chart-color-1': '#475569',
      '--chart-color-2': '#64748b',
      '--chart-color-3': '#334155',
      '--chart-color-4': '#1e293b',
      '--chart-grid': '#f1f5f9',
      '--login-bg-start': '#e2e8f0',
      '--login-bg-mid': '#f1f5f9',
      '--login-bg-end': '#e2e8f0',
      '--login-card-bg': 'rgba(255,255,255,0.98)',
      '--login-card-shadow': '0 20px 60px rgba(0,0,0,0.1)',
      '--login-logo-bg-start': '#475569',
      '--login-logo-bg-end': '#334155',
      '--login-logo-shadow': 'rgba(71,85,105,0.3)',
      '--login-circle-1': '#1e293b',
      '--login-circle-2': '#64748b',
      '--login-line-color': 'rgba(30,41,59,0.1)',
      '--login-footer-text': '#94a3b8',
      '--stat-card-bg': '#ffffff',
      '--breadcrumb-separator': '#c0c4cc',
      '--scrollbar-thumb': 'rgba(0,0,0,0.12)',
      '--scrollbar-thumb-hover': 'rgba(0,0,0,0.2)',
    },
    antd: {
      algorithm: defaultAlgorithm,
      colorPrimary: '#475569',
      colorSuccess: '#10b981',
      colorWarning: '#f59e0b',
      colorError: '#ef4444',
      colorInfo: '#475569',
      darkItemSelectedBg: 'rgba(71,85,105,0.1)',
      darkItemSelectedColor: '#1e293b',
      headerBg: '#f8fafc',
    },
  },
};

// ==================== 默认配置 ====================
const DEFAULT_THEME_CONFIG = {
  layout: 'vertical',
  theme: 'blue-black',
  tabStyle: 'card',
  sidebarWidth: 'default',
  borderRadius: 'medium',
  contentWidth: 'full',
  showTabs: true,
  showTabIcons: false,
  showRefresh: true,
  showSearch: true,
  showFullscreen: true,
  // 五档字号
  fontSize: 'default',
  // 灰色模式（纪念日、悼念日）
  grayMode: false,
  // 色弱模式（红绿色盲友好）
  colorWeak: false,
  // 固定顶栏（滚动时粘性吸顶）
  fixedHeader: true,
  // 页面切换动画
  pageAnimation: true,
};

// ==================== 加载配置 ====================
const loadConfig = () => {
  const saved = storage.get(THEME_STORAGE_KEY);
  if (saved && typeof saved === 'object') {
    return { ...DEFAULT_THEME_CONFIG, ...saved };
  }
  return { ...DEFAULT_THEME_CONFIG };
};

// ==================== 应用 CSS 变量到 :root ====================
const applyThemeVariables = (themeName) => {
  const theme = themeColorMap[themeName] || themeColorMap['blue-black'];
  const root = document.documentElement;

  const entries = Object.entries(theme.css);
  for (let i = 0; i < entries.length; i++) {
    root.style.setProperty(entries[i][0], entries[i][1]);
  }
  root.setAttribute('data-theme-mode', theme.type === 'dark' ? 'dark' : 'light');
};

// ==================== 应用全局配置（非主题色） ====================
const borderRadiusMap = { small: '4', medium: '6', large: '10' };
const contentWidthMap = { full: '100%', '1200': '1200px', '1400': '1400px' };
const fontSizeMap = { small: '13px', default: '14px', large: '16px' };

const applyGlobalConfig = (config) => {
  const root = document.documentElement;
  root.style.setProperty('--border-radius', `${borderRadiusMap[config.borderRadius] || '6'}px`);
  root.style.setProperty('--content-max-width', contentWidthMap[config.contentWidth] || '100%');

  // 字号
  root.style.setProperty('--font-size-base', fontSizeMap[config.fontSize] || '14px');
  root.style.setProperty('--font-size-heading', config.fontSize === 'large' ? '18px' : config.fontSize === 'small' ? '14px' : '16px');

  // 灰色模式
  root.style.filter = config.grayMode ? 'grayscale(100%)' : '';
  root.setAttribute('data-gray-mode', config.grayMode ? 'true' : 'false');

  // 色弱模式
  if (config.colorWeak) {
    root.style.filter = `${root.style.filter || ''} invert(80%) hue-rotate(180deg)`;
  } else if (!config.grayMode) {
    root.style.filter = '';
  }
  root.setAttribute('data-color-weak', config.colorWeak ? 'true' : 'false');

  // 固定顶栏
  root.setAttribute('data-fixed-header', config.fixedHeader ? 'true' : 'false');

  // 页面动画
  root.setAttribute('data-page-animation', config.pageAnimation ? 'true' : 'false');
};

// ==================== 获取 antd 配置 ====================
const getAntdConfig = (themeName) => {
  const theme = themeColorMap[themeName] || themeColorMap['blue-black'];
  return theme.antd;
};

// ==================== 初始化 ====================
const initialConfig = loadConfig();
applyThemeVariables(initialConfig.theme);
applyGlobalConfig(initialConfig);

// ==================== Store ====================
const useThemeStore = create((set, get) => ({
  ...initialConfig,

  setConfig: (key, value) => {
    const state = get();
    const newState = { ...state, [key]: value };
    const { setConfig: _setConfig, resetConfig: _resetConfig, saveConfig: _saveConfig, getAntdConfig: _getAntdConfig, ...persistState } = newState;
    storage.set(THEME_STORAGE_KEY, persistState);
    set({ [key]: value });

    if (key === 'theme') {
      applyThemeVariables(value);
    }
    // 全局配置项变更时立即生效
    if (['sidebarWidth', 'borderRadius', 'contentWidth', 'fontSize', 'grayMode', 'colorWeak', 'fixedHeader', 'pageAnimation'].includes(key)) {
      applyGlobalConfig({ ...state, [key]: value });
    }
  },

  saveConfig: (config) => {
    const { setConfig: _setConfig, resetConfig: _resetConfig, saveConfig: _saveConfig, getAntdConfig: _getAntdConfig, ...persistConfig } = { ...get(), ...config };
    storage.set(THEME_STORAGE_KEY, persistConfig);
    set(config);

    if (config.theme) {
      applyThemeVariables(config.theme);
    }
    applyGlobalConfig({ ...get(), ...config });
  },

  resetConfig: () => {
    storage.remove(THEME_STORAGE_KEY);
    set({ ...DEFAULT_THEME_CONFIG });
    applyThemeVariables(DEFAULT_THEME_CONFIG.theme);
    applyGlobalConfig(DEFAULT_THEME_CONFIG);
  },

  getAntdConfig: () => getAntdConfig(get().theme),
}));

export { themeColorMap, DEFAULT_THEME_CONFIG, getAntdConfig };
export default useThemeStore;
