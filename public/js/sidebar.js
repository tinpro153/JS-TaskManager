async function loadSidebar(containerSelector, currentPage = 'dashboard') {
    try {
        const response = await fetch('/components/sidebar.html');
        const html = await response.text();
        const container = document.querySelector(containerSelector);

        if (container) {
            container.innerHTML = html;     
            setActiveSidebarItem(currentPage);
        }
    } catch (error) {
        console.error('Failed to load sidebar:', error);
    }
}

function setActiveSidebarItem(identifier) {

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (identifier === 'dashboard') {
        const dashboardItem = document.querySelector('.nav-item[data-page="dashboard"]');
        if (dashboardItem) {
            dashboardItem.classList.add('active');
        }
    } else {
        const statusItem = document.querySelector(`.nav-item[data-status="${identifier}"]`);
        if (statusItem) {
            statusItem.classList.add('active');
        }
    }
}

function updateSidebarBadges(stats) {
    const badgeElements = {
        'badge-total': stats.totalTasks,
        'badge-scheduled': stats.scheduledTasks,
        'badge-inprogress': stats.inProgressTasks,
        'badge-completed': stats.completedTasks,
        'badge-failed': stats.failedTasks,
        'badge-cancelled': stats.cancelledTasks
    };
    
    for (const [id, value] of Object.entries(badgeElements)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
}

window.Sidebar = {
    load: loadSidebar,
    setActive: setActiveSidebarItem,
    updateBadges: updateSidebarBadges
};
