import type { ThemeConfig } from 'antd'
import { theme } from 'antd'

export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#A78BFA', // Lighter purple for dark mode
    colorInfo: '#A78BFA',
    colorSuccess: '#4ADE80',
    colorWarning: '#FBBF24',
    colorError: '#F472B6',
    colorTextBase: '#E2E8F0',
    colorBgBase: '#1F1D2B', // Dark background
    colorBgLayout: '#171520', // Even darker layout background
    colorBorder: 'rgba(167, 139, 250, 0.22)',
    borderRadius: 14,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  },
  components: {
    Menu: {
      itemBorderRadius: 12,
      subMenuItemBorderRadius: 12,
      itemSelectedBg: 'rgba(167, 139, 250, 0.16)',
      itemSelectedColor: '#C4B5FD',
      itemHoverBg: 'rgba(167, 139, 250, 0.10)',
    },
    Card: {
      borderRadiusLG: 16,
      borderRadiusSM: 14,
      colorBgContainer: '#252336', // Slightly lighter card background
    },
    Button: {
      borderRadius: 12,
    },
  },
}
