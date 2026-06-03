// Global Toast Notification System
window.showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    
    // ChatSphere Touch: Gradient backgrounds based on type
    let bgGradient = 'bg-gradient-to-r from-blue-500 to-blue-400';
    let iconClass = 'ri-information-line';
    
    if (type === 'success') {
        bgGradient = 'bg-gradient-to-r from-blue-600 to-purple-600';
        iconClass = 'ri-check-line';
    } else if (type === 'error' || type === 'danger') {
        bgGradient = 'bg-gradient-to-r from-red-600 to-red-500';
        iconClass = 'ri-close-line';
    }

    toast.className = `toast-message pointer-events-auto flex items-center px-5 py-2.5 rounded shadow-lg text-white font-medium w-max max-w-[calc(100vw-2rem)] md:max-w-xs ${bgGradient} transition-all duration-300 transform translate-x-full opacity-0`;
    
    toast.innerHTML = `
        <div class="mr-2 flex items-center">
            <i class="${iconClass} text-xl font-bold"></i>
        </div>
        <div class="tracking-wide text-sm">${message}</div>
    `;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    }, 50);

    // Animate out and remove after 5 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
};

// Initialize Django messages from the hidden DOM list
document.addEventListener('DOMContentLoaded', () => {
    const messagesList = document.getElementById('django-messages');
    if (messagesList) {
        let delay = 100;
        messagesList.querySelectorAll('li').forEach(li => {
            const message = li.getAttribute('data-message');
            const tags = li.getAttribute('data-tags');
            setTimeout(() => {
                window.showToast(message, tags);
            }, delay);
            delay += 250;
        });
    }
});
