import SidebarListener from '../listener/bar.js';
import NoteDB from '../data.js';
import languageManager from '../ui/languagePart.js';

const SidebarUI = {
    // 当前选中的分类ID
    currentCategoryId: 'all',
    
    // 分类列表容器
    categoriesListElement: null,
    
    // 初始化侧边栏UI
    init() {
        console.log('初始化侧边栏UI');
        
        // 获取分类列表容器
        this.categoriesListElement = document.querySelector('.categories-list');
        if (!this.categoriesListElement) {
            console.error('无法找到分类列表容器');
            return this;
        }
        
        // 加载分类列表
        this.loadCategories();
        
        // 默认选中"全部笔记"
        this.selectCategory('all');
        
        return this;
    },
    
    // 加载所有分类
    loadCategories() {
        if (!this.categoriesListElement) return;
        
        console.log('加载分类列表');
        
        // 清空列表
        this.categoriesListElement.innerHTML = '';
        
        // 添加"全部笔记"作为特殊项（不是真正的分类）
        const allNotesItem = document.createElement('div');
        allNotesItem.className = 'category-item active';
        allNotesItem.setAttribute('data-category-id', 'all');
        allNotesItem.innerHTML = `
            <i class="fas fa-sticky-note"></i>
            <span class="category-name">全部笔记</span>
            <span class="category-note-count" data-category-id="all">0</span>
        `;
        this.categoriesListElement.appendChild(allNotesItem);
        
        // 添加最近删除
        const deletedItem = document.createElement('div');
        deletedItem.className = 'category-item';
        deletedItem.setAttribute('data-category-id', 'deleted');
        deletedItem.innerHTML = `
            <i class="fas fa-trash"></i>
            <span class="category-name">最近删除</span>
        `;
        this.categoriesListElement.appendChild(deletedItem);

        // 添加"未分类"
        const uncategorizedItem = document.createElement('div');
        uncategorizedItem.className = 'category-item';
        uncategorizedItem.setAttribute('data-category-id', 'uncategorized');
        uncategorizedItem.innerHTML = `
            <i class="fas fa-tag"></i>
            <span class="category-name">未分类</span>
            <span class="category-note-count" data-category-id="uncategorized">0</span>
        `;
        this.categoriesListElement.appendChild(uncategorizedItem);
        
        // 从数据层获取所有用户创建的分类
        const categories = NoteDB.getAllCategories();
        
        // 渲染用户创建的分类（跳过未分类）
        categories.forEach(category => {
            if (category.id === 'uncategorized'||category.id === 'private'||category.id==='deleted') return;
            this.addCategoryToUI(category);
        });
        
        // 更新统计
        this.updateSidebarStats();

        //更新语言
        const translations = languageManager.getTranslations(languageManager.currentLanguage);
        languageManager.updateSidebarLanguage(translations);
    },
    
    // 添加单个分类到UI
    addCategoryToUI(category) {
        if (!this.categoriesListElement) return;
        
        // 创建分类元素
        const categoryElement = document.createElement('div');
        categoryElement.className = 'category-item';
        categoryElement.setAttribute('data-category-id', category.id);
        
        
        // 设置图标
        const iconClass = category.icon || 'fas fa-folder';
        
        categoryElement.innerHTML = `
            <i class="${iconClass}"></i>
            <span class="category-name">${category.name}</span>
            <span class="category-note-count" data-category-id="${category.id}">${category.notes.length}</span>
        `;

        categoryElement.draggable= 'true';
        if (category.id === 'all' || category.id === 'uncategorized') {
            categoryElement.removeAttribute('draggable');
        }

        // 添加到列表末尾
        this.categoriesListElement.appendChild(categoryElement);
    },
    
    // 更新单个分类的UI
    updateCategoryInUI(category) {
        if (!category) return false;
        
        const categoryElement = this.categoriesListElement.querySelector(`[data-category-id="${category.id}"]`);
        if (!categoryElement) return false;
        
        // 更新分类名称
        const nameElement = categoryElement.querySelector('.category-name');
        if (nameElement) {
            nameElement.textContent = category.name;
        }
        
        // 更新笔记数量
        this.updateCategoryNoteCount(category.id);
        
        return true;
    },
    
    // 从UI移除分类
    removeCategoryFromUI(categoryId) {
        const categoryElement = this.categoriesListElement.querySelector(`[data-category-id="${categoryId}"]`);
        if (categoryElement) {
            categoryElement.remove();
            return true;
        }
        return false;
    },
    
    // 更新分类的笔记数量显示
    updateCategoryNoteCount(categoryId) {
        if (categoryId === 'all') {
            // 全部笔记的数量
            const allCategoryCount = this.categoriesListElement.querySelector('[data-category-id="all"] .category-note-count');
            if (allCategoryCount) {
                allCategoryCount.textContent = NoteDB.getAllNotes().length;
            }
            return;
        }
        
        const category = NoteDB.getCategoryById(categoryId);
        if (!category) return;
        
        // 查找数量显示元素
        const countElement = document.querySelector(`.category-note-count[data-category-id="${categoryId}"]`);
        if (countElement) {
            // 对于真正的分类，从分类对象的notes数组获取数量
            if (category.id !== 'all') {
                countElement.textContent = category.notes.length;
            }
        }
    },
    
    // 选择分类（高亮显示）
    selectCategory(categoryId) {
        // 移除之前选中的分类的高亮
        const previouslySelected = this.categoriesListElement.querySelector('.category-item.active');
        if (previouslySelected) {
            previouslySelected.classList.remove('active');
        }
        // 移除私密区域的高亮
        const privateItem = document.querySelector('.private-item.active');
        if (privateItem) {
            privateItem.classList.remove('active');
        }
        

        // 高亮当前选中的分类
        const currentSelected = this.categoriesListElement.querySelector(`[data-category-id="${categoryId}"]`);
        if(categoryId==='private'){
            currentSelected = document.querySelector('private-item')
        }
        if (currentSelected) {
            currentSelected.classList.add('active');
            
            // 更新当前分类ID
            this.currentCategoryId = categoryId;
            
            // 滚动到选中项（如果需要）
            this.scrollToSelectedCategory();
            
            console.log(`选中分类: ${categoryId}`);
            
            return true;
        }
        
        console.warn(`分类不存在: ${categoryId}`);
        return false;
    },

    // 选择私密（高亮显示）
    selectPrivate() {
        // 移除之前选中的分类的高亮
        const previouslySelected = this.categoriesListElement.querySelector('.category-item.active');
        if (previouslySelected) {
            previouslySelected.classList.remove('active');
        }
        
        // 高亮当前选中的分类
        const currentSelected = document.querySelector('.private-item');
        if (currentSelected) {
            currentSelected.classList.add('active');
            
            // 更新当前分类ID
            this.currentCategoryId = 'private';
            
            console.log(`选中私密笔记`);
            
            return true;
        }
    
        return false;
    },
    
    // 滚动到选中的分类
    scrollToSelectedCategory() {
        const selectedItem = this.categoriesListElement.querySelector('.category-item.active');
        if (selectedItem && this.categoriesListElement.scrollHeight > this.categoriesListElement.clientHeight) {
            selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    },
    
    // 获取当前选中的分类ID
    getCurrentCategoryId() {
        return this.currentCategoryId;
    },
    
    // 刷新所有分类的笔记数量
    refreshAllCategoryCounts() {
        // 更新全部笔记数量
        this.updateCategoryNoteCount('all');
        
        // 更新未分类数量
        this.updateCategoryNoteCount('uncategorized');
        
        // 更新其他分类数量
        const categories = NoteDB.getAllCategories();
        categories.forEach(category => {
            if (category.id !== 'uncategorized') {
                this.updateCategoryNoteCount(category.id);
            }
        });
    },
    
    // 创建分类（UI部分）
    async createCategory(name) {
        // 调用数据层创建分类
        const result = await NoteDB.createCategory(name);
        
        if (result.success) {
            // 添加到UI
            this.addCategoryToUI(result.category);
            
            // 更新统计
            this.updateSidebarStats();
            
            // 显示成功消息
            this.showToast(`分类 "${name}" 创建成功`, 'success');
            
            return result.category;
        } else {
            // 显示错误消息
            this.showToast(result.message, 'error');
            return null;
        }
    },
    
    // 显示提示消息
    showToast(message, type = 'info') {
        // 创建或获取toast容器
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 70px;
                z-index: 9999;
            `;
            document.body.appendChild(toastContainer);
        }
        
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        // 添加到容器
        toastContainer.appendChild(toast);
        
        // 3秒后自动移除
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
        
        // 添加点击关闭
        toast.addEventListener('click', () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        });
    },
    
    // 重命名分类
    async renameCategory(categoryId, newName) {
        const result = await NoteDB.updateCategory(categoryId, newName);
        
        if (result.success) {
            // 更新UI
            this.updateCategoryInUI(result.category);
            
            this.showToast(`分类已重命名为 "${newName}"`, 'success');
            return true;
        } else {
            this.showToast(result.message, 'error');
            return false;
        }
    },
    
    // 删除分类
    async deleteCategory(categoryId) {
        const result = await NoteDB.deleteCategory(categoryId);
        
        if (result.success) {
            // 从UI移除
            this.removeCategoryFromUI(categoryId);
            
            // 如果删除的是当前选中的分类，切换到"全部笔记"
            if (categoryId === this.currentCategoryId) {
                this.selectCategory('all');
            }
            
            // 更新统计
            this.updateSidebarStats();
            
            this.showToast('分类删除成功', 'success');
            return true;
        } else {
            this.showToast(result.message, 'error');
            return false;
        }
    },
    
    // 启用/禁用管理按钮
    setManageButtonEnabled(enabled) {
        const manageButton = document.getElementById('manage-categories-btn');
        if (manageButton) {
            manageButton.disabled = !enabled;
            manageButton.style.opacity = enabled ? '1' : '0.5';
            manageButton.style.cursor = enabled ? 'pointer' : 'not-allowed';
        }
    },
    
    // 更新侧边栏统计信息
    updateSidebarStats() {
        const stats = NoteDB.getStats();
        console.log(stats);
        
        // 更新"全部笔记"数量
        const allCategoryCount = this.categoriesListElement.querySelector('[data-category-id="all"] .category-note-count');
        if (allCategoryCount) {
            allCategoryCount.textContent = stats.totalNotes - stats.notesByCategory['private']-stats.notesByCategory['deleted'];
            console.log(stats.notesByCategory['private'])
        }
        
        // 更新"未分类"数量
        const uncategorizedCount = this.categoriesListElement.querySelector('[data-category-id="uncategorized"] .category-note-count');
        if (uncategorizedCount) {
            uncategorizedCount.textContent = stats.notesByCategory['uncategorized'] || 0;
        }
        
        // 更新其他分类的数量
        const categories = NoteDB.getAllCategories();
        categories.forEach(category => {
            if (category.id !== 'uncategorized') {
                this.updateCategoryNoteCount(category.id);
            }
        });
    },

    // 重新排序分类列表
    reorderCategories(categoryOrder) {
        if (!this.categoriesListElement) return;
        
        // 获取所有用户创建的分类元素
        const userCategories = [];
        const defaultCategories = [];
        
        const categoryElements = this.categoriesListElement.querySelectorAll('.category-item');
        
        categoryElements.forEach(item => {
            const categoryId = item.getAttribute('data-category-id');
            if (categoryId === 'all' || categoryId === 'uncategorized') {
                defaultCategories.push(item);
            } else {
                userCategories.push(item);
            }
        });
        
        // 清空列表
        this.categoriesListElement.innerHTML = '';
        
        // 重新添加默认分类
        defaultCategories.forEach(item => {
            if (item.getAttribute('data-category-id') === 'all') {
                this.categoriesListElement.appendChild(item);
            }
        });
        
        // 按新顺序添加用户分类
        categoryOrder.forEach(categoryId => {
            const categoryElement = userCategories.find(item => 
                item.getAttribute('data-category-id') === categoryId
            );
            if (categoryElement) {
                this.categoriesListElement.appendChild(categoryElement);
            }
        });
        
        // 添加未分类
        defaultCategories.forEach(item => {
            if (item.getAttribute('data-category-id') === 'uncategorized') {
                this.categoriesListElement.appendChild(item);
            }
        });
        
        // 重新绑定拖拽事件（如果需要）
        if (this.sidebarListener) {
            this.sidebarListener.bindCategoryDragEvents(this.categoriesListElement);
        }
    },

    // 设置侧边栏监听器引用
    setListener(listener) {
        this.sidebarListener = listener;
    },

    // 切换语言下拉框显示/隐藏
    toggleLanguageDropdown(event) {
        let dropdown = document.getElementById('language-dropdown');
        if (!dropdown) {
            dropdown =SidebarListener.createLanguageDropdown();
        }
        
        // 切换显示状态
        if (dropdown.style.display === 'flex') {
            dropdown.style.display = 'none';
        } else {
            // 定位到设置按钮旁边
            const setsBtn = document.querySelector('.language');
            const rect = setsBtn.getBoundingClientRect();
            
            dropdown.style.position = 'fixed';
            dropdown.style.top = `${rect.top}px`;
            dropdown.style.left = `${rect.right +3}px`;
            dropdown.style.display = 'flex';
            
        }
        
        // 关闭
        dropdown.addEventListener('mouseleave',(e)=>{
            dropdown.style.display='none'
        })
        
    },



};

// 导出模块
export default SidebarUI;