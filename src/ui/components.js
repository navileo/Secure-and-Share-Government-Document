/**
 * UI Components for the application
 */
export const components = {
    loader: () => '<div class="loader">Loading...</div>',
    errorCard: (msg) => `<div class="card error"><h3>Error</h3><p>${msg}</p></div>`,
    emptyState: (msg) => `<div class="empty-state"><p>${msg}</p></div>`
};
