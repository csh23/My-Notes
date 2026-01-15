import languageManager from '../ui/languagePart.js'
import NoteDB from '../data.js';
import authManager from '../auth.js';
import NoteApp from '../main.js';
import Themes from '../ui/change_theme.js';

const SidebarListener = {
    // 引用侧边栏UI模块
    sidebarUI: null,
    
    // 拖拽相关状态
    dragState: {
        isDragging: false,
        draggedItem: null,
        dragOverItem: null,
        currentOverItem: null
    },
    
    // 初始化侧边栏事件监听
    init(sidebarUI) {
        console.log('初始化侧边栏事件监听');
        
        if (!sidebarUI) {
            console.error('侧边栏UI模块未提供');
            return this;
        }
        
        this.sidebarUI = sidebarUI;
        this.bindEvents();
        

        return this;
    },
    
    // 绑定所有侧边栏相关事件
    bindEvents() {
        //绑定登录事件
        const login = document.querySelector('.user')
        if(login){
            login.addEventListener('click',(e)=>{
                if(login.getAttribute('id')==='no-login'){
                    this.showLoginModal()
                }
            })
        }

        //绑定设置按钮点击事件
        const usertool = document.querySelector('.user-tools')
        if(usertool){
            usertool.addEventListener('click',(e)=>{
                const setsbar = document.querySelector('.sets-bar')
                setsbar.style.display='flex'
            })
        }

        //绑定下拉框事件
        const setsbar = document.querySelector('.sets-bar')
        if(setsbar){
            setsbar.addEventListener('mouseleave',(e)=>{
                setsbar.style.display='none'
            })
            setsbar.addEventListener('click',(e)=>this.handleSetsClick(e))
        }

        // 绑定分类点击事件（事件委托）
        const categoriesList = document.querySelector('.categories-list');
        if (categoriesList) {
            categoriesList.addEventListener('click', (e) => this.handleCategoryClick(e));

            // 绑定笔记拖拽到分类的事件
            this.bindNoteDropToCategoryEvents(categoriesList);

            //绑定分类拖拽
            this.bindCategoryDragEvents(categoriesList)
        }

        //私密点击事件
        const privateList = document.querySelector('.private-note');
        if(privateList){
            privateList.addEventListener('click',(e)=> this.handlePrivateClick(e));
        }
        
        // 绑定新增分类按钮事件
        const addcatButton = document.getElementById('add-categories-btn');
        if (addcatButton) {
            addcatButton.addEventListener('click', (e) => this.handleNewCategoryClick(e));
        }
        

        const managecatButton = document.getElementById('manage-categories-btn');
        if (managecatButton) {
            managecatButton.addEventListener('click', (e) => this.handleManageCategoriesClick(e));
        }
        

        // 绑定键盘快捷键
        this.bindKeyboardShortcuts();
        
        // 绑定全局点击事件
        document.addEventListener('click', (e) => this.handleGlobalClick(e));
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
    },
    
    // 处理分类点击事件
    handleCategoryClick(event) {
        // 找到被点击的分类项
        let categoryItem = null
        categoryItem = event.target.closest('.category-item');
        if(event.target.className==='private-item'){
            categoryItem = event.target
        }
        
        if (!categoryItem) return;
        
        // 防止点击在笔记数量标签上触发其他操作
        if (event.target.classList.contains('category-note-count')) {
            // 可以在这里添加特殊处理，比如显示分类详情
            return;
        }

        // 获取分类ID
        const categoryId = categoryItem.getAttribute('data-category-id');
        if (!categoryId) return;
        
        console.log('点击分类:', categoryId);
        
        // 更新侧边栏UI（高亮选中的分类）
        this.sidebarUI.selectCategory(categoryId);
        
        // 触发自定义事件，通知其他模块分类已切换
        this.dispatchCategoryChangeEvent(categoryId);
        
    },

    // 添加处理私密区域点击的方法
    handlePrivateClick(event) {
        event.preventDefault();
        event.stopPropagation();

        const privateItem = event.target.closest('.private-item');
        if (!privateItem) return;
        
        console.log(NoteDB.getPasswordStatus())
        if (NoteDB.getPasswordStatus()===false) {
            // 没有设置密码，直接进入
            this.sidebarUI.selectPrivate();
            this.dispatchCategoryChangeEvent('private');
        } else {
            // 需要密码验证，显示密码输入模态框
            this.showPrivateCategoryPasswordModal();
        }

    },


    // 分发分类切换事件
    dispatchCategoryChangeEvent(categoryId) {
        const event = new CustomEvent('categoryChanged', {
            detail: {
                categoryId: categoryId,
                category: NoteDB.getCategoryById(categoryId)
            },
            bubbles: true
        });
        
        document.dispatchEvent(event);
        console.log('分发categoryChanged事件:', categoryId);
    },

    
    // 处理管理分类按钮点击
    handleManageCategoriesClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('点击管理分类按钮');
        
        // 显示分类管理模态框
        this.showCategoryManagementModal();
    },

     // 显示分类管理模态框
    showCategoryManagementModal() {
        // 创建或获取管理模态框
        let modal = document.getElementById('categories-management-modal');
        
        if (!modal) {
            modal = this.createManagementModal();
        }
        
        // 填充模态框内容
        this.populateManagementModal(modal);
        
        // 显示模态框
        modal.style.display = 'flex';
        
        // 绑定模态框内的事件
        this.bindManagementModalEvents(modal);
    },

    // 创建管理模态框
    createManagementModal() {
        const modal = document.createElement('div');
        modal.id = 'categories-management-modal';
        modal.className = 'modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>管理分类</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="categories-management-list" id="categories-management-list">
                        <!-- 分类列表将在这里动态生成 -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="close-management-modal" class="secondary-btn">关闭</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        return modal;
    },

    // 填充管理模态框内容
    populateManagementModal(modal) {
        const listContainer = modal.querySelector('#categories-management-list');
        if (!listContainer) return;
        
        // 清空容器
        listContainer.innerHTML = '';
        
        // 获取所有分类（排除默认分类）
        const categories = NoteDB.getAllCategories().filter(cat => 
            cat.id !== 'all' && cat.id !== 'uncategorized'&& cat.id!=='deleted'&&cat.id!=='private'
        );
        
        if (categories.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>还没有创建任何分类</p>
                </div>
            `;
            return;
        }


        // 创建分类管理项
        categories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-management-item';
            categoryItem.setAttribute('data-category-id', category.id);
            
            categoryItem.innerHTML = `
                <div class="category-info">
                    <i class="${category.icon || 'fas fa-folder'}"></i>
                    <span class="category-name">${category.name}</span>
                </div>
                <div class="category-actions">
                    <button class="icon-btn rename-category-btn" title="重命名">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn delete-category-btn" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            listContainer.appendChild(categoryItem);
        });
    },

     // 绑定管理模态框事件
    bindManagementModalEvents(modal) {
        // 关闭按钮
        const closeButtons = modal.querySelectorAll('.close-modal, #close-management-modal');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        });
        
        // 新建分类按钮
        const addButton = modal.querySelector('#add-category-in-modal');
        if (addButton) {
            addButton.addEventListener('click', () => {
                modal.style.display = 'none';
                this.showNewCategoryModal();
            });
        }
        
        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // 绑定分类操作按钮（事件委托）
        const listContainer = modal.querySelector('#categories-management-list');
        if (listContainer) {
            listContainer.addEventListener('click', (e) => {
                const categoryItem = e.target.closest('.category-management-item');
                if (!categoryItem) return;
                
                const categoryId = categoryItem.getAttribute('data-category-id');
                if (!categoryId) return;
                
                // 重命名按钮
                if (e.target.closest('.rename-category-btn')) {
                    e.stopPropagation();
                    this.showRenameCategoryModal(categoryId);
                    modal.style.display = 'none';
                }
                
                // 删除按钮
                else if (e.target.closest('.delete-category-btn')) {
                    e.stopPropagation();
                    this.showDeleteCategoryConfirm(categoryId);
                    modal.style.display = 'none';
                }
            });
        }
    },


    // 处理新建分类按钮点击
    handleNewCategoryClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('点击新建分类按钮');
        
        // 显示新建分类模态框
        this.showNewCategoryModal();
    },
    
    // 显示新建分类模态框
    showNewCategoryModal() {
        const modal = document.getElementById('category-modal');
        if (!modal) {
            console.error('找不到分类模态框');
            return;
        }
        
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
        
        // 显示模态框
        modal.style.display = 'flex';
        
        // 焦点到输入框
        setTimeout(() => {
            if (nameInput) nameInput.focus();
        }, 100);
    },
    
    // 显示重命名分类模态框
    showRenameCategoryModal(categoryId) {
        const category = NoteDB.getCategoryById(categoryId);
        if (!category) return;
        
        const modal = document.getElementById('category-modal');
        if (!modal) return;
        
        // 设置模态框标题
        const modalTitle = modal.querySelector('#modal-title');
        if (modalTitle) {
            modalTitle.textContent = '重命名分类';
        }
        
        // 设置输入框
        const nameInput = modal.querySelector('#category-name');
        if (nameInput) {
            nameInput.value = category.name;
            nameInput.setAttribute('data-mode', 'rename');
            nameInput.setAttribute('data-category-id', categoryId);
        }
        
        // 显示模态框
        modal.style.display = 'flex';
        
        // 焦点并选中文本
        setTimeout(() => {
            if (nameInput) {
                nameInput.focus();
                nameInput.select();
            }
        }, 100);
    },
    
    // 显示删除分类确认
    showDeleteCategoryConfirm(categoryId) {
        const category = NoteDB.getCategoryById(categoryId);
        if (!category) return;
        
        if (confirm(`确定要删除分类 "${category.name}" 吗？\n该分类下的笔记将被移动到"未分类"。`)) {
            // 执行删除
            const success = this.sidebarUI.deleteCategory(categoryId);
            
            if (success) {
                // 触发分类删除事件
                this.dispatchCategoryDeletedEvent(categoryId);
            }
        }
    },
    
    // 分发分类删除事件
    dispatchCategoryDeletedEvent(categoryId) {
        const event = new CustomEvent('categoryDeleted', {
            detail: { categoryId },
            bubbles: true
        });
        
        document.dispatchEvent(event);
        console.log('分发categoryDeleted事件:', categoryId);
    },
    
    // 绑定拖拽事件（只对用户创建的分类）
    bindCategoryDragEvents(container) {
        if (!this.isDragDropSupported()) return;
        
        // 拖拽开始
        container.addEventListener('dragstart', (e) => this.handleCategoryDragStart(e));
        
        // 拖拽经过
        container.addEventListener('dragover', (e) => this.handleCategoryDragOver(e));
        
        // 拖拽进入
        container.addEventListener('dragenter', (e) => this.handleCategoryDragEnter(e));
        
        // 拖拽离开
        container.addEventListener('dragleave', (e) => this.handleCategoryDragLeave(e));
        
        // 放置
        container.addEventListener('drop', (e) => this.handleCategoryDrop(e));
        
        // 拖拽结束
        container.addEventListener('dragend', (e) => this.handleCategoryDragEnd(e));
    },
    
    // 拖拽支持检测
    isDragDropSupported() {
        return 'draggable' in document.createElement('div');
    },
    
    // 拖拽开始
    handleCategoryDragStart(event) {
        console.log('拖拽开始')
        const categoryItem = event.target.closest('.category-item');
        if (!categoryItem) return;
        
        const categoryId = categoryItem.getAttribute('data-category-id');
        
        // 默认分类不允许拖拽
        if (categoryId === 'all' || categoryId === 'uncategorized') {
            event.preventDefault();
            return;
        }


        //把默认效果消除
        const dragImage = new Image();
        dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        event.dataTransfer.setDragImage(dragImage, 0, 0);
        
        this.dragState.isDragging = true;
        this.dragState.draggedItem = categoryItem;
        this.dragState.draggedId = categoryId;
        
        // 设置拖拽数据
        event.dataTransfer.setData('text/plain', categoryId);    //将被拖拽元素的标识信息（这里是categoryId分类ID）存储在拖拽操作中，在放置目标处读取
        event.dataTransfer.effectAllowed = 'move';    //定义拖拽操作允许的效果
        
        // 添加拖拽视觉效果
        categoryItem.classList.add('dragging');

        // 创建拖拽预览
        this.createDragPreview(event, categoryItem);
    },
    
    // 拖拽经过
    handleCategoryDragOver(event) {

        console.log('拖拽经过')
        if (!this.dragState.isDragging) return;
        
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        //高亮
        const targetItem = event.target.closest('.category-item'); //目前鼠标最近的这个目标元素
        if (!targetItem) return;
        const prevItem = this.dragState.currentOverItem;  //上一个高亮
        let validTarget = null;   //是否合法

        if (targetItem && targetItem.dataset.categoryId !== 'all'&&targetItem.dataset.categoryId !== 'uncategorized') {
            validTarget = targetItem;
        }

        if(prevItem!==validTarget){
            if(prevItem){
                prevItem.classList.remove('drag-light')
            }   //如果有上一个高亮就去除类

            if(validTarget){
                validTarget.classList.add('drag-light')  

                const rect = targetItem.getBoundingClientRect();    //获取元素在浏览器视口（viewport）中的精确位置和尺寸信息
                const dropPosition = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                if (dropPosition === 'before') {
                    targetItem.classList.add('drag-light')
                }
            }
            
            this.dragState.currentOverItem = validTarget;
        }


    },
    
    // 拖拽进入
    handleCategoryDragEnter(event) {
        console.log('拖拽进入')
        if (!this.dragState.isDragging) return;
        
        const targetItem = event.target.closest('.category-item');
        if (!targetItem) return;
        
        const targetCategoryId = targetItem.getAttribute('data-category-id');
        
        // 默认分类不允许作为放置目标
        if (targetCategoryId !== 'all' && targetCategoryId !== 'uncategorized') {
            targetItem.classList.add('drag-over');
            this.dragState.dragOverItem = targetItem;
        }
    },
    
    // 拖拽离开
    handleCategoryDragLeave(event) {
        console.log('拖拽离开')
        if (!this.dragState.isDragging) return;
        
        const targetItem = event.target.closest('.category-item');
    
        if (targetItem && targetItem === this.dragState.dragOverItem) {
            targetItem.classList.remove('drag-over');
            this.dragState.dragOverItem = null;
        }
    },
    
    // 放置
    handleCategoryDrop(event) {
        console.log('拖拽放置')
        if (!this.dragState.isDragging) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        const targetItem = event.target.closest('.category-item');
        if (!targetItem) return;
        
        const targetCategoryId = targetItem.getAttribute('data-category-id');
        const draggedCategoryId = event.dataTransfer.getData('text/plain');
        
        // 默认分类不允许作为放置目标
        if (targetCategoryId === 'all' || targetCategoryId === 'uncategorized') {
            this.resetDragState();
            return;
        }
        
        // 不能拖到自己
        if (targetCategoryId === draggedCategoryId) {
            this.resetDragState();
            return;
        }
        
        // 确定放置位置（前面或后面）
        const rect = targetItem.getBoundingClientRect();    //获取元素在浏览器视口（viewport）中的精确位置和尺寸信息
        const dropPosition = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
        
        // 移动DOM元素
        const draggedItem = this.dragState.draggedItem;
        
        if (dropPosition === 'before') {
            targetItem.parentNode.insertBefore(draggedItem, targetItem);
        } else {
            targetItem.parentNode.insertBefore(draggedItem, targetItem.nextSibling);
        }
        
        // 更新数据层分类顺序
        this.updateCategoryOrder();
        
        // 移除拖拽样式
        targetItem.classList.remove('drag-over');

        if (this.dragState.draggedItem) {
            this.dragState.draggedItem.classList.remove('dragging');
        }
        
        this.resetDragState();
        if (this.dragState.currentOverItem) {
            this.dragState.currentOverItem.classList.remove('drag-light');
            this.dragState.currentOverItem = null;
            this.dragState.dropPosition = null;
        }
    },
    
    // 拖拽结束
    handleCategoryDragEnd(event) {
        console.log('拖拽结束')
        this.removeDragPreview();
        this.resetDragState();
    },
    
    // 重置拖拽状态
    resetDragState() {
        // 移除所有拖拽相关样式
        document.querySelectorAll('.category-item.dragging, .category-item.drag-over').forEach(item => {
            item.classList.remove('dragging', 'drag-over');
        });
        
        this.dragState.isDragging = false;
        this.dragState.draggedItem = null;
        this.dragState.dragOverItem = null;
    },

    // 创建拖拽预览
    createDragPreview(event, element) {
        // 移除现有的预览
        this.removeDragPreview();
        
        // 创建预览元素
        const preview = element.cloneNode(true);
        preview.id = 'drag-preview';
        preview.classList.add('drag-preview');
        
        // 设置预览样式
        const rect = element.getBoundingClientRect();
        preview.style.position = 'fixed';
        preview.style.width = rect.width + 'px';
        preview.style.height = rect.height + 'px';
        preview.style.top = (event.clientY - 10) + 'px';
        preview.style.left = (event.clientX - 10) + 'px';
        preview.style.zIndex = '10000';
        preview.style.pointerEvents = 'none';
        preview.style.opacity = '0.7';
        preview.style.borderRadius = '6px';
        preview.style.backgroundColor = '#f0f0f0';
        
        document.body.appendChild(preview);
        
        // 更新预览位置
        this.previewUpdateHandler = (e) => {
            if (preview) {
                preview.style.top = (e.clientY - 10) + 'px';
                preview.style.left = (e.clientX - 10) + 'px';
            }
        };
        
        document.addEventListener('dragover', this.previewUpdateHandler);
    },

    // 移除拖拽预览
    removeDragPreview() {
        const preview = document.getElementById('drag-preview');
        if (preview) {
            preview.remove();
        }
        
        if (this.previewUpdateHandler) {
            document.removeEventListener('dragover', this.previewUpdateHandler);
            this.previewUpdateHandler = null;
        }
    },

    // 更新分类顺序
    updateCategoryOrder() {
        const container = document.querySelector('.categories-list');
        const categoryItems = container.querySelectorAll('.category-item');
        const categoryOrder = [];
        
        categoryItems.forEach(item => {
            const categoryId = item.getAttribute('data-category-id');
            // 只包含用户创建的分类
            if (categoryId !== 'all' && categoryId !== 'uncategorized') {
                categoryOrder.push(categoryId);
            }
        });
        
        console.log('更新分类顺序:', categoryOrder);
        
        // 调用数据层更新分类顺序
        // 假设 NoteDB 有 updateCategoryOrder 方法
        if (NoteDB.updateCategoryOrder) {
            const success = NoteDB.updateCategoryOrder(categoryOrder);
            if (success) {
                this.sidebarUI.showToast('分类顺序已更新', 'success');
            }
        }
    },

    
    // 绑定键盘快捷键
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + Shift + N 新建分类
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'N') {
                event.preventDefault();
                this.showNewCategoryModal();
            }
        });
    },
    
    // 处理全局点击事件
    handleGlobalClick(event) {
        // 如果正在拖拽，点击其他地方取消拖拽
        if (this.dragState.isDragging && !event.target.closest('.category-item')) {
            this.resetDragState();
        }
    },
    
    // 处理全局键盘事件
    handleGlobalKeydown(event) {
        // ESC键取消拖拽
        if (event.key === 'Escape' && this.dragState.isDragging) {
            this.resetDragState();
        }
    },
    
    // 刷新侧边栏
    refresh() {
        if (this.sidebarUI) {
            this.sidebarUI.loadCategories();
            this.sidebarUI.updateSidebarStats();
        }
    },


    // 绑定笔记拖拽到分类的事件
    bindNoteDropToCategoryEvents(container) {
            
        // 笔记拖拽进入分类
        container.addEventListener('dragenter', (e) => this.handleNoteDragEnterCategory(e));
        0
        // 笔记在分类上拖拽
        container.addEventListener('dragover', (e) => this.handleNoteDragOverCategory(e));
        
        // 笔记离开分类
        container.addEventListener('dragleave', (e) => this.handleNoteDragLeaveCategory(e));
        
        // 笔记放置到分类
        container.addEventListener('drop', (e) => this.handleNoteDropToCategory(e));
    
    },

    // 笔记拖拽进入分类
    handleNoteDragEnterCategory(event) {
        // 确保是笔记拖拽，不是分类拖拽
        if (this.dragState.isDragging) return;
        
        const categoryItem = event.target.closest('.category-item');
        if (!categoryItem) return;
        
        const categoryId = categoryItem.getAttribute('data-category-id');
        
        // 不允许放置到全部笔记或未分类
        if (categoryId === 'all' || categoryId === 'uncategorized') {
            return;
        }
        
        categoryItem.classList.add('note-drop-target');
        event.preventDefault();
    },

    // 笔记在分类上拖拽
    handleNoteDragOverCategory(event) {
        // 确保是笔记拖拽，不是分类拖拽
        if (this.dragState.isDragging) return;
        
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    },

    // 笔记离开分类
    handleNoteDragLeaveCategory(event) {
        // 确保是笔记拖拽，不是分类拖拽
        if (this.dragState.isDragging) return;
        
        const categoryItem = event.target.closest('.category-item');
        if (categoryItem) {
            categoryItem.classList.remove('note-drop-target');
        }
    },

    // 笔记放置到分类
    handleNoteDropToCategory(event) {
        // 确保是笔记拖拽，不是分类拖拽
        if (this.dragState.isDragging) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        const categoryItem = event.target.closest('.category-item');
        if (!categoryItem) return;
        
        const categoryId = categoryItem.getAttribute('data-category-id');
        
        // 不允许放置到全部笔记或未分类
        if (categoryId === 'all' || categoryId === 'uncategorized') {
            categoryItem.classList.remove('note-drop-target');
            return;
        }
        
        // 获取拖拽的笔记ID
        const noteId = event.dataTransfer.getData('text/plain');
        if (!noteId) return;
        
        // 获取笔记数据
        const note = NoteDB.getNoteById(noteId);
        if (!note) {
            console.warn(`笔记不存在: ${noteId}`);
            return;
        }
        
        // 如果笔记已经在目标分类，不执行移动
        if (note.categoryId === categoryId) {
            categoryItem.classList.remove('note-drop-target');
            this.sidebarUI.showToast('笔记已在当前分类', 'info');
            return;
        }
        
        // 确认移动
        const category = NoteDB.getCategoryById(categoryId);
        if (category && confirm(`确定要将笔记 "${note.title}" 移动到分类 "${category.name}" 吗？`)) {
            // 调用数据层移动笔记
            const success = NoteDB.moveNoteToCategory(noteId, categoryId);
            
            if (success) {
                // 移除样式
                categoryItem.classList.remove('note-drop-target');
                
                // 刷新笔记列表
                if (this.notesListListener) {
                    this.notesListListener.refresh();
                }
                
                // 显示提示
                this.sidebarUI.showToast(`笔记已移动到 ${category.name}`, 'success');
                
                // 触发笔记更新事件
                const updatedNote = NoteDB.getNoteById(noteId);
                if (updatedNote) {
                    this.dispatchNoteUpdatedEvent(updatedNote);
                }
                
                // 更新侧边栏统计
                this.sidebarUI.updateSidebarStats();
            } else {
                this.sidebarUI.showToast('移动失败', 'error');
            }
        } else {
            categoryItem.classList.remove('note-drop-target');
        }
    },

    // 分发笔记更新事件（需要从 NotesListListener 移动过来或共享）
    dispatchNoteUpdatedEvent(note) {
        const event = new CustomEvent('noteUpdated', {
            detail: { note },
            bubbles: true
        });
        
        document.dispatchEvent(event);
        console.log('分发noteUpdated事件:', note.id);
    },

    // 设置笔记列表监听器引用
    setNotesListListener(listener) {
        this.notesListListener = listener;
    },

    // 显示密码验证模态框
    showPrivateCategoryPasswordModal() {
        // 创建密码验证模态框
        let modal = document.getElementById('check-modal');
        if (!modal) {
            return
        }
        
        // 清空输入框
        const passwordInput = modal.querySelector('#private-password-input');
        const errorElement = modal.querySelector('#password-error');
        if (passwordInput) passwordInput.value = '';
        if (errorElement) errorElement.textContent = '';
        
        // 显示模态框
        modal.style.display = 'flex';
        
        // 焦点到输入框
        setTimeout(() => {
            if (passwordInput) passwordInput.focus();
        }, 100);
        
        // 绑定事件
        this.bindPasswordVerificationModalEvents(modal);
    },

    // 绑定密码验证模态框事件
    bindPasswordVerificationModalEvents(modal) {
        // 关闭按钮
        const closeButtons = modal.querySelectorAll('.close-modal');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modal.style.display = 'none';
                modal.removeAttribute('data-note-id');
            });
        });
        
        // 验证按钮
        const verifyButton = modal.querySelector('#confirm-inputPassword');
        if (verifyButton) {
            verifyButton.addEventListener('click', () => {
                this.verifyAndOpenPrivateNote(modal);
            });
        }
        
        // 输入框回车验证
        const passwordInput = modal.querySelector('#confirm-inputPassword');
        if (passwordInput) {
            passwordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.verifyAndOpenPrivateNote(modal);
                }
            });
            
            // 限制只能输入数字
            passwordInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        }
        
    },

    // 验证密码并打开私密笔记
    verifyAndOpenPrivateNote(modal) {
        
        const passwordInput = modal.querySelector('#private-password-input');
        const errorElement = modal.querySelector('.password-error');
        
        if (!passwordInput || !errorElement) return;
        
        const password = passwordInput.value.trim();
        
        // 验证输入
        
        if (!/^\d{4}$/.test(password)) {
            errorElement.textContent = '密码必须是4位数字';
            return;
        }
        
        // 验证密码
        const isValid = NoteDB.verifyPrivatePassword(password);
        
        if (isValid) {
            // 密码正确
            modal.style.display = 'none';
            
            // 更新侧边栏UI
            this.sidebarUI.selectPrivate();
            
            // 触发分类切换事件
            this.dispatchCategoryChangeEvent('private');

        } else {
            // 密码错误
            errorElement.textContent = '密码错误，请重新输入';
            passwordInput.value = '';
            passwordInput.focus();
        }
    },

    //设置下拉菜单点击
    handleSetsClick(event){
        const setsopt = event.target.className
        event.stopPropagation();
        if(setsopt==='language'){
            this.sidebarUI.toggleLanguageDropdown(event);
        }
        else if(setsopt==='outlogin'){
            event.preventDefault();
            authManager.logout();
        }
        else if(setsopt==='changeuser'){
            event.preventDefault();
            this.showLoginModal();
        }
        else if(setsopt==='theme'){
            event.preventDefault();
            
            Themes.toggleTheme()
        }
    },

    // 初始化语言功能
    initLanguage() {
        // 从localStorage获取保存的语言设置，如果没有则使用浏览器默认语言
        const savedLanguage = localStorage.getItem('noteAppLanguage');
        const browserLang = navigator.language || 'zh-CN';
        const defaultLang = savedLanguage || (browserLang.startsWith('zh') ? 'zh-CN' : 'en-US');
        
        this.currentLanguage = defaultLang;
        languageManager.applyLanguage();
        
        console.log('当前语言:', languageManager.currentLanguage);
    },

    // 切换语言
    changeLanguage(langCode) {
        console.log('切换语言到:', langCode);
        
        languageManager.currentLanguage = langCode;
        localStorage.setItem('noteAppLanguage', langCode);
        
        // 应用新语言
        languageManager.applyLanguage();
        
        // 显示提示
        languageManager.showLanguageChangedToast(langCode);
    },

    // 创建语言下拉框
    createLanguageDropdown() {
        const dropdown = document.createElement('div');
        dropdown.id = 'language-dropdown';
        dropdown.className = 'language-dropdown';
       
        const languages = [
            { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
            { code: 'en-US', name: 'English', flag: '🇺🇸' },
        ];
        
        languages.forEach(lang => {
            const item = document.createElement('div');
            item.className = 'language-option';
            item.setAttribute('data-lang', lang.code);
            
            item.innerHTML = `
                <span class="language-flag">${lang.flag}</span>
                <span class="language-name">${lang.name}</span>
            `;
            
            item.addEventListener('click', () => {
                this.changeLanguage(lang.code);
                dropdown.style.display = 'none';
            });
            
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = '#f5f5f5';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = '';
            });
            
            dropdown.appendChild(item);
        });
        
        console.log('成功创建语言下拉框')
        document.body.appendChild(dropdown);
        return dropdown;
    },

    

     // 显示登录模态框
    showLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.bindAuthModalEvents();
            
            // 焦点到用户名输入框
            setTimeout(() => {
                const usernameInput = document.getElementById('login-username');
                if (usernameInput) usernameInput.focus();
            }, 100);
        }
    },


    // 显示注册模态框
    showRegisterModal() {
        const modal = document.getElementById('register-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.bindAuthModalEvents();
            
            // 焦点到用户名输入框
            setTimeout(() => {
                const usernameInput = document.getElementById('register-username');
                if (usernameInput) usernameInput.focus();
            }, 100);
        }
    },

    // 绑定认证模态框事件
    bindAuthModalEvents() {
        // 登录模态框
        const loginModal = document.getElementById('login-modal');
        const registerModal = document.getElementById('register-modal');
        
        // 关闭按钮
        const closeButtons = document.querySelectorAll('.close-modal');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (loginModal) loginModal.style.display = 'none';
                if (registerModal) registerModal.style.display = 'none';
            });
        });
        
        // 切换到注册
        const gotoRegister = document.getElementById('goto-register');
        if (gotoRegister) {
            gotoRegister.addEventListener('click', (e) => {
                e.preventDefault();
                if (loginModal) loginModal.style.display = 'none';
                this.showRegisterModal();
            });
        }
        
        // 切换到登录
        const gotoLogin = document.getElementById('goto-login');
        if (gotoLogin) {
            gotoLogin.addEventListener('click', (e) => {
                e.preventDefault();
                if (registerModal) registerModal.style.display = 'none';
                this.showLoginModal();
            });
        }
        
        // 登录按钮
        const loginBtn = document.getElementById('confirm-login');
        if (loginBtn) {
            loginBtn.addEventListener('click', async (e) => {
                e.preventDefault();  
                e.stopPropagation(); 
                const username = document.getElementById('login-username').value.trim();
                const password = document.getElementById('login-password').value.trim();
                const errorElement = document.getElementById('login-error');
                
                if (!username || !password) {
                    errorElement.textContent = '请填写用户名和密码';
                    return;
                }
                
                const result = await authManager.login(username, password);
                
                if (result.success) {
                    // 关闭模态框
                    if (loginModal) loginModal.style.display = 'none';
                    
                    NoteApp.state.user =authManager.getCurrentUser();
                    NoteApp.state.isAuthenticated = true;

                    console.log(NoteApp.state.user)
                    // 重新初始化应用
                    NoteApp.init();
                } else {
                    errorElement.textContent = result.message;
                }
            });
        }
        
        // 注册按钮
        const registerBtn = document.getElementById('confirm-register');
        if (registerBtn) {
            registerBtn.addEventListener('click', async (e) => {
                e.preventDefault();  
                e.stopPropagation();

                const username = document.getElementById('register-username').value.trim();
                const email = document.getElementById('register-email').value.trim();
                const password = document.getElementById('register-password').value.trim();
                const confirm = document.getElementById('register-confirm').value.trim();
                const errorElement = document.getElementById('register-error');
                
                // 验证输入
                if (!username || !email || !password || !confirm) {
                    errorElement.textContent = '请填写所有字段';
                    return;
                }
                
                if (password !== confirm) {
                    errorElement.textContent = '两次输入的密码不一致';
                    return;
                }
                
                if (password.length < 6) {
                    errorElement.textContent = '密码长度至少6位';
                    return;
                }
                
                const result = await authManager.register(username, email, password);
                
                if (result.success) {
                    errorElement.textContent = '注册成功！正在登录...';
                    errorElement.style.color = 'green';
                    
                    // 自动登录
                    setTimeout(async () => {
                        const loginResult = await authManager.login(username, password);
                        if (loginResult.success) {
                            if (registerModal) registerModal.style.display = 'none';
                            window.location.reload();
                        }
                    }, 1000);
                } else {
                    errorElement.textContent = result.message;
                    errorElement.style.color = 'red';
                }
            });
        }
        
        // 点击模态框外部关闭
        if (loginModal) {
            loginModal.addEventListener('click', (e) => {
                if (e.target === loginModal) {
                    loginModal.style.display = 'none';
                }
            });
        }
        
        if (registerModal) {
            registerModal.addEventListener('click', (e) => {
                if (e.target === registerModal) {
                    registerModal.style.display = 'none';
                }
            });
        }
    },


};

// 导出模块
export default SidebarListener;