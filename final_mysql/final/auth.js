
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('auth_token');
        this.apiBase = './api/'; // 修改为你的API地址
    }

    // 检查登录状态
    async checkAuth() {
        if (!this.token) return false;
        
        try {
            const response = await fetch(`${this.apiBase}check_auth.php`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                return true;
            }
        } catch (error) {
            console.error('认证检查失败:', error);
        }
        
        this.logout();
        return false;
    }

    // 注册
    async register(username, email, password) {
        try {
            const response = await fetch(`${this.apiBase}register.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true, data };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            return { success: false, message: '网络错误，请稍后重试' };
        }
    }

    // 登录
    async login(username, password) {
        try {
            const response = await fetch(`${this.apiBase}login.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();

            if (response.ok) {

                this.token = String(data.token).trim();
                this.currentUser = data.user;
                
                // 保存token到localStorage
                localStorage.setItem('auth_token', this.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                return { success: true, data };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            return { success: false, message: '网络错误，请稍后重试' };
        }
    }

    // 登出
    logout() {
        // 先调用服务器端登出
        fetch(`${this.apiBase}logout.php`, {
            method: 'POST',
            headers: this.getAuthHeader()
        }).catch(error => {
            console.log('服务器登出失败，继续本地清理');
        }).finally(() => {
            // 清理本地存储
            this.token = null;
            this.currentUser = null;
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            window.location.reload();
        });
    }

    // 获取授权头
    getAuthHeader() {
        console.log(this.token)
        return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
    }

    // 获取当前用户
    getCurrentUser() {
        return this.currentUser || JSON.parse(localStorage.getItem('user') || 'null');
    }
}

// 导出单例实例
const authManager = new AuthManager();
export default authManager;