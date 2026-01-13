/**
 * Modal utilities
 */
export const modals = {
    show: (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'flex';
    },
    hide: (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
    }
};
