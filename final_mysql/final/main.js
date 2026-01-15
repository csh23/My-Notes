import authManager from './auth.js';
// 导入数据模块
import NoteDB, { initNoteDB }  from './data.js';

// 导入UI模块
import EditorUI from './ui/editor.js';
import SidebarUI from './ui/bar.js';
import NotesListUI from './ui/list.js';

// 导入事件监听器模块
import EditorListener from './listener/editor.js';
import SidebarListener from './listener/bar.js';
import NotesListListener from './listener/list.js';
import languageManager from './ui/languagePart.js';



// 全局应用实例
const NoteApp = {
    // 模块实例
    modules: {
        editorUI: null,
        editorListener: null,
        sidebarUI: null,
        sidebarListener: null,
        notesListUI: null,
        notesListListener: null,
        languageManager : null
    },
    
    // 应用状态
    state: {
        initialized: false,
        currentNote: null,
        currentCategory: 'all' , // 默认显示全部笔记
        isAuthenticated: false, // 登录状态
        user: null,
        dragState: {  // 添加拖拽状态
            isDragging: false,
            draggedItem: null,
            dragOverItem: null
        }
    },
    
    // 初始化应用
    async init() {
        console.log('=== 笔记管理系统初始化 ===');
        
        console.log('0. 初始化数据库...');
        await initNoteDB();

        // 检查用户登录状态
        this.state.isAuthenticated = await authManager.checkAuth();
        this.state.user = authManager.getCurrentUser();

        // 1. 初始化UI模块
        console.log('1. 初始化UI模块...');
        this.modules.editorUI = EditorUI.init();
        this.modules.sidebarUI = SidebarUI.init();
        this.modules.notesListUI = NotesListUI.init();
        this.modules.languageManager = languageManager.init()
        
        // 2. 初始化事件监听器模块
        console.log('2. 初始化事件监听器...');
        this.modules.editorListener = EditorListener.init(this.modules.editorUI);
        this.modules.sidebarListener = SidebarListener.init(this.modules.sidebarUI);
        this.modules.notesListListener = NotesListListener.init(this.modules.notesListUI);
        
        this.setupModuleReferences();

        // 3. 绑定全局事件
        console.log('3. 绑定全局事件...');
        this.bindGlobalEvents();
        
        // 4. 初始化应用状态
        console.log('4. 初始化应用状态...');
        this.initializeAppState();
        
        // 5. 绑定模态框事件
        console.log('5. 绑定模态框事件...');
        this.bindModalEvents();

        // 设置初始语言
        const savedLang = localStorage.getItem('noteAppLanguage');
        if (savedLang) {
            document.documentElement.lang = savedLang.split('-')[0];
        }
        
        this.state.initialized = true;
        console.log('=== 应用初始化完成 ===\n');
        
        // 触发应用就绪事件
        this.dispatchAppReadyEvent();
        
        if (!this.state.isAuthenticated) {
            // 未登录，显示登录界面
            SidebarListener.showLoginModal();
            this.state.isAuthenticated = await authManager.checkAuth();
            this.state.user = authManager.getCurrentUser();
            console.log(`登录后用户名为${this.state.user}`)
        }else{
            this.updateUserUI();
        }

        return this;
    },
    
    // 绑定全局事件（跨模块通信）
    bindGlobalEvents() {
        // 1. 笔记选中事件：更新编辑器
        document.addEventListener('noteSelected', (e) => {
            const note = e.detail.note;
            console.log('全局处理：笔记选中', note ? note.id : '空');
            
            // 更新应用状态
            this.state.currentNote = note;
            
            if (note) {
                // 加载笔记到编辑器
                this.modules.editorUI.loadNote(note);
                
                // 为编辑器监听器设置原始笔记副本
                this.modules.editorListener.setCurrentNote(note);
            } else {
                // 清空编辑器
                this.modules.editorUI.clearEditor();
                this.modules.editorListener.setCurrentNote(null);
            }
        });
        
        // 2. 分类变化事件：更新笔记列表
        document.addEventListener('categoryChanged', (e) => {
            const categoryId = e.detail.categoryId;
            console.log('全局处理：分类变化', categoryId);
            
            // 更新应用状态
            this.state.currentCategory = categoryId;
            
            // 更新笔记列表
            this.modules.notesListUI.loadNotesByCategory(categoryId);
            
            // 如果当前有选中的笔记，检查是否属于新分类
            if (this.state.currentNote) {
                const note = NoteDB.getNoteById(this.state.currentNote.id);
                if (note && note.categoryId !== categoryId && categoryId !== 'all') {
                    // 如果笔记不属于新分类且不是"全部笔记"，取消选中
                    document.dispatchEvent(new CustomEvent('noteSelected', {
                        detail: { note: null }
                    }));
                }
            }
        });
        
        // 3. 笔记创建事件：刷新列表和侧边栏
        document.addEventListener('noteCreated', (e) => {
            const note = e.detail.note;
            console.log('全局处理：笔记创建', note.id);
            
            // 刷新笔记列表（可能会显示新笔记）
            this.modules.notesListUI.refresh();
            
            // 更新侧边栏统计
            this.modules.sidebarUI.updateSidebarStats();
            
            // 自动选中新创建的笔记
            setTimeout(() => {
                document.dispatchEvent(new CustomEvent('noteSelected', {
                    detail: { note }
                }));
            }, 100);
        });
        
        // 4. 笔记更新事件：刷新列表
        document.addEventListener('noteUpdated', (e) => {
            const note = e.detail.note;
            console.log('全局处理：笔记更新', note.id);
            
            // 更新笔记列表中的该项
            this.modules.notesListUI.updateNoteInList(note);
            
            // 更新侧边栏统计
            this.modules.sidebarUI.updateSidebarStats();
        });
        
        // 5. 笔记删除事件：刷新列表和侧边栏
        document.addEventListener('noteDeleted', (e) => {
            const noteId = e.detail.noteId;
            console.log('全局处理：笔记删除', noteId);
            
            // 刷新笔记列表
            this.modules.notesListUI.refresh();
            
            // 更新侧边栏统计
            this.modules.sidebarUI.updateSidebarStats();
            
            // 如果删除的是当前选中的笔记，清空编辑器
            if (noteId === this.state.currentNote?.id) {
                this.state.currentNote = null;
                this.modules.editorUI.clearEditor();
            }
        });
        
        // 6. 分类删除事件：更新侧边栏
        document.addEventListener('categoryDeleted', (e) => {
            const categoryId = e.detail.categoryId;
            console.log('全局处理：分类删除', categoryId);
            
            // 刷新侧边栏
            this.modules.sidebarUI.loadCategories();
            this.modules.sidebarUI.updateSidebarStats();
        });
        
        // 7. 窗口关闭前检查未保存更改
        window.addEventListener('beforeunload', (e) => {
            if (this.modules.editorListener.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '您有未保存的更改，确定要离开吗？';
                return e.returnValue;
            }
        });

        // 监听语言变化事件
        document.addEventListener('languageChanged', (e) => {
            const lang = e.detail.language;
            console.log('应用语言改变:', lang);
            
            // 更新HTML lang属性
            document.documentElement.lang = lang.split('-')[0];
            
        });
    },
    
    // 初始化应用状态
    initializeAppState() {
        // 1. 加载侧边栏分类
        this.modules.sidebarUI.loadCategories();
        this.modules.sidebarUI.updateSidebarStats();
        
        // 2. 加载默认视图（全部笔记）
        this.modules.notesListUI.loadNotesByCategory('all');
        
        // 3. 清空编辑器（初始状态）
        this.modules.editorUI.clearEditor();
        
        // 4. 绑定额外的UI事件
        this.bindUIEvents();
    },
    
    // 绑定UI事件
    bindUIEvents() {
        console.log('绑定UI事件...');
        
        // 绑定键盘快捷键
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + N 新建笔记
            if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
                e.preventDefault();
                this.createNewNoteInCurrentCategory();
            }
            
            // Ctrl/Cmd + Shift + N 新建分类
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
                e.preventDefault();
                this.showNewCategoryModal();
            }
        });
    },

    // 更新用户界面
    updateUserUI() {
        const user = this.state.user;
        const userInfoElement = document.querySelector('.user');
        console.log('更新用户界面1')
        if (user && userInfoElement) {
            console.log('更新用户界面2')
            // 显示用户名
            const nameElement = userInfoElement.querySelector('.user-name');
            if (nameElement) {
                nameElement.textContent = user.username;
            }
            
            // 显示用户头像（使用首字母）
            const bustElement = userInfoElement.querySelector('.user-bust');
            if (bustElement) {
                bustElement.textContent = user.username.charAt(0).toUpperCase();
            }
            
        }
    },
    
    
    // 显示新建分类模态框
    showNewCategoryModal() {
        const modal = document.getElementById('category-modal');
        if (!modal) return;
        
        // 设置模态框标题
        const modalTitle = modal.querySelector('#modal-title');
        if (modalTitle) {
            modalTitle.textContent = '新建分类';
        }
        
        // 清空输入框
        const nameInput = modal.querySelector('#category-name');
        if (nameInput) {
            nameInput.value = '';
            nameInput.setAttribute('data-mode', 'create');
            nameInput.removeAttribute('data-category-id');
        }
        
        // 清空错误消息
        const errorElement = modal.querySelector('#category-error');
        if (errorElement) {
            errorElement.textContent = '';
        }
        
        // 显示模态框
        modal.style.display = 'block';
        
        // 焦点到输入框
        setTimeout(() => {
            if (nameInput) nameInput.focus();
        }, 100);
    },
    
    // 绑定模态框事件
    bindModalEvents() {
        console.log('绑定模态框事件...');
        
        // 分类模态框
        this.bindCategoryModalEvents();
        
        // 移动笔记模态框
        this.bindMoveNoteModalEvents();
    },
    
    // 绑定分类模态框事件
    bindCategoryModalEvents() {
        const modal = document.getElementById('category-modal');
        if (!modal) return;
        
        // 关闭按钮
        const closeButtons = modal.querySelectorAll('.close-modal, #cancel-category');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        });
        
        // 保存按钮
        const saveButton = modal.querySelector('#save-category');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.handleCategorySave();
            });
        }
        
        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // 输入框回车保存
        const nameInput = modal.querySelector('#category-name');
        if (nameInput) {
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleCategorySave();
                }
            });
        }
    },
    
    // 处理分类保存
    async handleCategorySave() {
        const modal = document.getElementById('category-modal');
        const nameInput = modal.querySelector('#category-name');
        const errorElement = modal.querySelector('#category-error');
        
        if (!nameInput || !errorElement) return;
        
        const name = nameInput.value.trim();
        const mode = nameInput.getAttribute('data-mode');
        const categoryId = nameInput.getAttribute('data-category-id');
        
        // 验证输入
        if (!name) {
            errorElement.textContent = '分类名称不能为空';
            return;
        }
        
        if (name.length > 20) {
            errorElement.textContent = '分类名称不能超过20个字符';
            return;
        }
        
        // 根据模式执行操作
        if (mode === 'create') {
            // 创建新分类
            const category =await this.modules.sidebarUI.createCategory(name);
            if (category) {
                modal.style.display = 'none';
                this.showNotification(`分类"${name}"创建成功`, 'success');
                
                // 触发分类创建事件
                const event = new CustomEvent('categoryCreated', {
                    detail: { category },
                    bubbles: true
                });
                document.dispatchEvent(event);
            }
        } else if (mode === 'rename' && categoryId) {
            // 重命名分类
            const success =await this.modules.sidebarUI.renameCategory(categoryId, name);
            if (success) {
                modal.style.display = 'none';
                this.showNotification(`分类重命名为"${name}"`, 'success');
            }
        }
    },
    
    // 绑定移动笔记模态框事件
    bindMoveNoteModalEvents() {
        const modal = document.getElementById('move-modal');
        if (!modal) return;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    },
    
    // 显示通知
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                               type === 'error' ? 'fa-exclamation-circle' : 
                               'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        // 添加到通知容器
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
            `;
            document.body.appendChild(container);
        }
        
        container.appendChild(notification);
        
        // 绑定关闭按钮
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.remove();
            });
        }
        
        // 3秒后自动移除
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },
    
    // 分发应用就绪事件
    dispatchAppReadyEvent() {
        const event = new CustomEvent('appReady', {
            detail: { 
                version: '1.0.0',
                modules: Object.keys(this.modules)
            },
            bubbles: true
        });
        
        document.dispatchEvent(event);
        console.log('应用已就绪，版本 1.0.0');
    },
    
    // 获取应用统计信息
    getStats() {
        return NoteDB.getStats();
    },
    
    // 导出数据
    exportData() {
        try {
            const data = {
                categories: NoteDB.getAllCategories(),
                notes: NoteDB.getAllNotes(),
                stats: this.getStats(),
                exportedAt: new Date().toISOString()
            };
            
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `notes-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('数据导出成功', 'success');
            return true;
        } catch (error) {
            console.error('导出数据失败:', error);
            this.showNotification('导出数据失败', 'error');
            return false;
        }
    },

    //导出当前笔记数据
    exportCurrentnote(note){
        try{
            console.log('开始导出笔记:', note);

            const markdownContent = this.generateNoteMarkdown(note);
            const filename = this.generateNoteFilename(note);
            this.downloadMarkdownFile(markdownContent, filename);
            this.showNotification(`"${note.title}" 已导出为 ${filename}`, 'success');
        
            return true;
        }catch (error){
            console.error('导出失败:', error);
            this.showNotification('导出失败: ' + error.message, 'error');
            return false;

        }
    },

    // 生成笔记的 Markdown 内容
    generateNoteMarkdown(note) {
        // 获取分类信息
        const category = NoteDB.getCategoryById(note.categoryId);
        
        // 格式化日期
        const formatDate = (dateString) => {
            if (!dateString) return '未知时间';
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return date.toLocaleString('zh-CN');
        };
        
        // 转换 HTML 内容为 Markdown
        const htmlToMarkdown = (html) => {
            if (!html) return '';
            
            let markdown = html
                .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
                .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
                .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
                .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
                .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
                .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
                .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
                .replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>')
                .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
                .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
                .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
                .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match) => {
                    return match.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
                })
                .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
                    let index = 1;
                    return content.replace(/<li[^>]*>(.*?)<\/li>/gi, (liMatch, liContent) => {
                        return `${index++}. ${liContent}\n`;
                    });
                })
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<p[^>]*>/gi, '')
                .replace(/<\/p>/gi, '\n\n')
                .replace(/<[^>]+>/g, '')  // 移除剩余的 HTML 标签
                .replace(/&nbsp;/g, ' ')  // 替换空格
                .replace(/&lt;/g, '<')    // 替换 <
                .replace(/&gt;/g, '>')    // 替换 >
                .replace(/&amp;/g, '&')   // 替换 &
                .replace(/&quot;/g, '"')  // 替换 "
                .replace(/&#39;/g, "'")   // 替换 '
                .trim();
            
            // 清理多余的空行
            markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n');
            
            return markdown;
        };
        
        // 构建 Markdown 内容
        const markdown = `# ${note.title || '未命名笔记'}
分类: ${category.name}

创建时间: ${formatDate(note.createdAt)}

标签：${note.tags && note.tags.length > 0 ? `${note.tags.join(', ')}\n` : '无'}

---

${htmlToMarkdown(note.content || '')}

---

*导出时间: ${new Date().toLocaleString('zh-CN')}*`;
        
        return markdown;
    },

    // 生成文件名
    generateNoteFilename(note) {
        const cleanTitle = (note.title || '未命名笔记')
            .replace(/[\\/:*?"<>|]/g, '_')  // 移除非法字符
            .replace(/\s+/g, '_')           // 空格替换为下划线
            .substring(0, 50);              // 限制长度
        
        // 添加日期
        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        return `${cleanTitle}_${dateStr}.md`;
    },

    // 下载 Markdown 文件
    downloadMarkdownFile(content, filename) {
        // 创建 Blob
        const blob = new Blob([content], { 
            type: 'text/markdown;charset=utf-8' 
        });
        
        // 创建临时 URL
        const url = URL.createObjectURL(blob);
        
        // 创建下载链接
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    },
    
    // 导入数据
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    // 这里应该添加数据验证逻辑
                    // 暂时只显示成功消息
                    this.showNotification('数据导入成功', 'success');
                    
                    // 刷新所有UI
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                    
                } catch (error) {
                    console.error('导入数据失败:', error);
                    this.showNotification('导入数据失败：文件格式不正确', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    },
    
    // 重置应用数据
    resetData() {
        if (confirm('确定要重置所有数据吗？这将清除所有笔记和分类，此操作不可撤销！')) {
            const success = NoteDB.clearAllData();
            
            if (success) {
                this.showNotification('数据已重置', 'success');
                
                // 刷新所有UI
                setTimeout(() => {
                    location.reload();
                }, 1000);
            } else {
                this.showNotification('重置数据失败', 'error');
            }
        }
    },
    
    // 调试方法
    debug() {
        console.group('应用调试信息');
        console.log('当前笔记:', this.state.currentNote);
        console.log('当前分类:', this.state.currentCategory);
        console.log('数据统计:', this.getStats());
        console.log('模块状态:', this.modules);
        console.groupEnd();
    },


    // 设置模块间的相互引用
    setupModuleReferences() {
        // 侧边栏UI需要引用侧边栏监听器（用于拖拽后重新绑定事件）
        if (this.modules.sidebarUI && this.modules.sidebarUI.setListener) {
            this.modules.sidebarUI.setListener(this.modules.sidebarListener);
        }
        
        // 侧边栏监听器需要引用笔记列表监听器（用于笔记拖拽到分类后的刷新）
        if (this.modules.sidebarListener && this.modules.sidebarListener.setNotesListListener) {
            this.modules.sidebarListener.setNotesListListener(this.modules.notesListListener);
        }
    },
};

// 添加一些CSS样式
const addGlobalStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        /* 通知样式 */
        .notification {
            background-color: white;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-width: 300px;
            max-width: 400px;
            transform: translateX(0);
            transition: opacity 0.3s, transform 0.3s;
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .notification-success {
            border-left: 4px solid #4CAF50;
        }
        
        .notification-error {
            border-left: 4px solid #f44336;
        }
        
        .notification-info {
            border-left: 4px solid #2196F3;
        }
        
        .notification i {
            font-size: 18px;
        }
        
        .notification-success i {
            color: #4CAF50;
        }
        
        .notification-error i {
            color: #f44336;
        }
        
        .notification-info i {
            color: #2196F3;
        }
        
        .notification-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #999;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }
        
        .notification-close:hover {
            background-color: #f0f0f0;
        }
    `;
    
    document.head.appendChild(style);
};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM已加载，开始初始化应用...');
    
    // 添加全局样式
    addGlobalStyles();
    
    // 初始化应用
    window.noteApp = NoteApp.init();
    
    // 将应用实例暴露给全局，方便调试
    window.app = NoteApp;
    
    // 添加调试快捷键
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+D 打开调试信息
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                NoteApp.debug();
            }
            
            // Ctrl+Shift+E 导出数据
            if (e.ctrlKey && e.shiftKey && e.key === 'E') {
                e.preventDefault();
                NoteApp.exportData();
            }
        });
    }
});



// 导出应用实例
export default NoteApp;