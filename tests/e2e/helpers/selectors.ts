export const selectors = {
  sidebar: {
    container: '[data-testid="sidebar"], nav[role="navigation"]',
    menuItem: (text: string) => `nav >> text="${text}"`,
  },
  table: {
    rows: 'table tbody tr',
    firstRow: 'table tbody tr:first-child',
    searchInput: 'input[placeholder*="Search"], input[placeholder*="search"]',
  },
  dialog: {
    container: '[role="dialog"]',
    confirmButton:
      '[role="dialog"] button:has-text("Confirm"), [role="dialog"] button:has-text("Delete"), [role="dialog"] button:has-text("Yes")',
    cancelButton:
      '[role="dialog"] button:has-text("Cancel"), [role="dialog"] button:has-text("No")',
  },
  toast: {
    success: '[data-sonner-toast][data-type="success"]',
    error: '[data-sonner-toast][data-type="error"]',
    any: '[data-sonner-toast]',
  },
  loading: {
    spinner: '[data-testid="loading"], .animate-spin',
    skeleton: '[data-testid="skeleton"], .animate-pulse',
  },
} as const
