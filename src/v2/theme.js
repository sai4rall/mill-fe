import { createTheme } from '@mantine/core'

// "Leaf" green: bright, fresh primary for the v2 UI.
const leaf = ['#ecfdf3', '#d3f8e2', '#a7f0c6', '#6ee3a5', '#36cf82', '#16b46a', '#0c9356', '#0a7447', '#0b5c3a', '#094b31']

export const theme = createTheme({
  primaryColor: 'leaf',
  primaryShade: 6,
  colors: { leaf },
  fontFamily: "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
  headings: { fontFamily: "'Inter Variable', Inter, system-ui, sans-serif", fontWeight: '700' },
  defaultRadius: 'md',
  cursorType: 'pointer',
  autoContrast: true,
  defaultGradient: { from: 'leaf.5', to: 'teal.5', deg: 135 },
  components: {
    Button: { defaultProps: { radius: 'md' } },
    Card: { defaultProps: { radius: 'lg', withBorder: true, shadow: 'xs', padding: 'lg' } },
    Paper: { defaultProps: { radius: 'lg' } },
    Modal: { defaultProps: { radius: 'lg', centered: true, overlayProps: { backgroundOpacity: 0.45, blur: 3 } } },
    Drawer: { defaultProps: { overlayProps: { backgroundOpacity: 0.45, blur: 3 } } },
    Badge: { defaultProps: { radius: 'sm', variant: 'light' } },
    TextInput: { defaultProps: { radius: 'md' } },
    Select: { defaultProps: { radius: 'md', checkIconPosition: 'right' } },
    Table: { defaultProps: { verticalSpacing: 'sm', highlightOnHover: true } },
  },
})

// App-wide surface colours (used via style props).
export const SURFACE = '#f4f8f5'
