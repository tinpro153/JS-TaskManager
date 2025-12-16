
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');

    // Check if already logged in
    if (API.getToken()) {
        window.location.href = '/dashboard.html';
        return;
    }

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        Utils.hideError('errorMessage');
        Utils.hideError('successMessage');

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!username || !email || !password || !confirmPassword) {
            Utils.showError('errorMessage', 'Vui lòng nhập đầy đủ thông tin');
            return;
        }

        if (password !== confirmPassword) {
            Utils.showError('errorMessage', 'Mật khẩu xác nhận không khớp');
            return;
        }

        if (password.length < 6) {
            Utils.showError('errorMessage', 'Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        const submitBtn = registerForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang đăng ký...';

        try {
            const response = await API.register(username, email, password);

            if (response.success) {
                Utils.showSuccess('successMessage', 'Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
                
                registerForm.reset();

                // Redirect to login after 2 seconds
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                Utils.showError('errorMessage', 'Đăng ký thất bại');
            }
        } catch (error) {
            Utils.showError('errorMessage', error.message || 'Đăng ký thất bại. Vui lòng thử lại.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Đăng ký';
        }
    });
});
