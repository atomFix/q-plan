import { ThemeConfig } from '../themes';

/**
 * 根据主题配置获取背景颜色的CSS类
 */
export const getBgClass = (theme: ThemeConfig, level: 'primary' | 'secondary' | ' tertiary' = 'primary'): string => {
  return theme.background[level];
};

/**
 * 根据主题配置获取文字颜色的CSS类
 */
export const getTextClass = (theme: ThemeConfig, level: 'primary' | 'secondary' | 'muted' = 'primary'): string => {
  return theme.text[level];
};

/**
 * 根据主题配置获取边框颜色的CSS类
 */
export const getBorderClass = (theme: ThemeConfig, level: 'primary' | 'secondary' = 'primary'): string => {
  return theme.border[level];
};

/**
 * 根据优先级获取主题颜色
 */
export const getPriorityColor = (theme: ThemeConfig, priority: string): string => {
  const p = priority.toUpperCase();
  if (p.includes('P0')) return theme.priority.p0;
  if (p.includes('P1')) return theme.priority.p1;
  if (p.includes('P2')) return theme.priority.p2;
  if (p.includes('P3')) return theme.priority.p3;
  return theme.accent.primary;
};

/**
 * 创建带有主题样式的内联样式对象
 */
export const createThemeStyles = (theme: ThemeConfig) => {
  return {
    '--theme-bg-primary': theme.background.primary,
    '--theme-bg-secondary': theme.background.secondary,
    '--theme-bg-tertiary': theme.background.tertiary,
    '--theme-text-primary': theme.text.primary,
    '--theme-text-secondary': theme.text.secondary,
    '--theme-text-muted': theme.text.muted,
    '--theme-border-primary': theme.border.primary,
    '--theme-border-secondary': theme.border.secondary,
    '--theme-accent-primary': theme.accent.primary,
    '--theme-accent-secondary': theme.accent.secondary,
    '--theme-accent-hover': theme.accent.hover,
    '--theme-priority-p0': theme.priority.p0,
    '--theme-priority-p1': theme.priority.p1,
    '--theme-priority-p2': theme.priority.p2,
    '--theme-priority-p3': theme.priority.p3,
  } as React.CSSProperties;
};

/**
 * 根据主题和优先级获取任务卡片的样式类
 */
export const getTaskCardStyles = (theme: ThemeConfig, priority: string) => {
  const priorityColor = getPriorityColor(theme, priority);

  return {
    backgroundColor: theme.background.secondary,
    borderColor: `${priorityColor}40`,
    borderLeftColor: priorityColor,
    color: theme.text.primary,
  };
};

/**
 * 根据主题获取按钮样式类
 */
export const getButtonStyles = (theme: ThemeConfig, variant: 'primary' | 'secondary' | 'ghost' = 'primary') => {
  const baseStyles = {
    transition: 'all 0.2s',
  };

  if (variant === 'primary') {
    return {
      ...baseStyles,
      backgroundColor: theme.accent.primary,
      color: '#ffffff',
      border: 'none',
    };
  }

  if (variant === 'secondary') {
    return {
      ...baseStyles,
      backgroundColor: theme.background.secondary,
      color: theme.text.primary,
      border: `1px solid ${theme.border.primary}`,
    };
  }

  return {
    ...baseStyles,
    backgroundColor: 'transparent',
    color: theme.text.primary,
    border: 'none',
  };
};
