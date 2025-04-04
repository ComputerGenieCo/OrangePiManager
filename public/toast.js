class Toast {
    constructor(message, type = 'info', duration = 3000) {
        this.message = message;
        this.type = type;
        this.duration = duration;
        this.element = null;
    }

    create() {
        const toast = document.createElement('div');
        toast.className = `toast ${this.type}`;
        toast.innerHTML = `
            ${this.message}
            <span class="toast-close">✕</span>
        `;

        const close = toast.querySelector('.toast-close');
        close.addEventListener('click', () => this.dismiss());

        return toast;
    }

    show() {
        const container = document.getElementById('toastContainer');
        this.element = this.create();
        container.appendChild(this.element);

        setTimeout(() => this.dismiss(), this.duration);
    }

    dismiss() {
        if (!this.element) return;

        this.element.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => {
            this.element.remove();
        }, 300);
    }
}
