import type { ThemeConfig } from 'antd'

export const lavenderTheme: ThemeConfig = {
  token: {
    colorPrimary: '#8B5CF6',
    colorInfo: '#8B5CF6',
    colorSuccess: '#22C55E',
    colorWarning: '#F59E0B',
    colorError: '#FB7185',
    colorTextBase: '#211735',
    colorBgBase: '#FBF9FF',
    colorBgLayout: '#F6F1FF',
    colorBorder: 'rgba(139, 92, 246, 0.22)',
    borderRadius: 14,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  },
  components: {
    Menu: {
      itemBorderRadius: 12,
      subMenuItemBorderRadius: 12,
      itemSelectedBg: 'rgba(139, 92, 246, 0.16)',
      itemSelectedColor: '#6D28D9',
      itemHoverBg: 'rgba(139, 92, 246, 0.10)',
    },
    Card: {
      borderRadiusLG: 16,
      borderRadiusSM: 14,
    },
    Button: {
      borderRadius: 12,
    },
  },
}
