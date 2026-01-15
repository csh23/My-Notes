import NoteDB from '../data.js';
import SidebarUI from '../ui/bar.js';
import authManager from '../auth.js';

const NotesListListener = {
    // 引用笔记列表UI模块
    notesListUI: null,
    
    // 当前选中的笔记用于移动操作
    noteToMove: null,

    // 当前排序方式
    currentSortMethod: 'time', // 默认按编辑时间排序
    
    // 初始化笔记列表事件监听
    init(notesListUI) {
        console.log('初始化笔记列表事件监听');
        
        if (!notesListUI) {
            console.error('笔记列表UI模块未提供');
            return this;
        }
        
        this.notesListUI = notesListUI;
        this.bindEvents();
        
        return this;
    },
    
    // 绑定所有笔记列表相关事件
    bindEvents() {
        // 绑定笔记列表点击事件（事件委托）
        const notesListElement = document.getElementById('notes-list');
        if (notesListElement) {
            notesListElement.addEventListener('click', (e) => this.handleNotesListClick(e));

            // 添加笔记拖拽事件
            this.bindNoteDragEvents(notesListElement);
        }
        
        // 绑定搜索框事件
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
            searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
        }
        
        // 绑定新建笔记按钮事件
        const addNoteBtn = document.getElementById('add-first-note');
        if (addNoteBtn) {
            addNoteBtn.addEventListener('click', (e) => this.handleAddNoteClick(e));
        }

        // 新建搜索框旁边笔记按钮事件
        const addNotecircle = document.getElementById('new-note-btn');
        if (addNotecircle) {
            addNotecircle.addEventListener('click', (e) => this.handleAddNoteClick(e));
        }

        
        // 绑定过滤器事件
        const filterSelect = document.querySelector('select[name="filter"]');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => this.handleFilterChange(e));
        }
        
        // // 绑定移动笔记模态框事件
        this.bindMoveModalEvents();

        
        
        // 监听分类变化事件
        document.addEventListener('categoryChanged', (e) => this.handleCategoryChange(e));
        
        // 监听分类删除事件
        document.addEventListener('categoryDeleted', (e) => this.handleCategoryDeleted(e));
        
        // 监听笔记创建/更新事件
        document.addEventListener('noteCreated', (e) => this.handleNoteCreated(e));
        document.addEventListener('noteUpdated', (e) => this.handleNoteUpdated(e));
        document.addEventListener('noteDeleted', (e) => this.handleNoteDeleted(e));


    },
    
    // 处理笔记列表点击事件
    handleNotesListClick(event) {
        // 查找被点击的笔记项
        let noteItem = event.target.closest('.note-item');
        if (!noteItem) {
            const addNoteBtn = event.target.closest('#add-first-note');
            if (addNoteBtn) {
                this.handleAddNoteClick(event);
            }
            return;
        }
        
        // 获取笔记ID
        const noteId = noteItem.getAttribute('data-note-id');
        if (!noteId) return;
        
        // 检查点击的是什么元素
        const target = event.target;
        
        // 移动按钮
        if (target.closest('.move-note-btn')) {
            event.stopPropagation();
            this.handleMoveNoteClick(noteId);
            return;
        }
        
        // 删除按钮
        if (target.closest('.delete-note-btn')) {
            event.stopPropagation();
            this.handleDeleteNoteClick(noteId);
            return;
        }

        //设为私密
        if (target.closest('.set-private-btn')) {
            event.stopPropagation();
            this.handlesetprivateClick(noteId);
            return;
        }
        
        // 在 handleNotesListClick 中添加恢复按钮的判断
        if (target.closest('.restore-note-btn')) {
            event.stopPropagation();
            this.handleRestoreNoteClick(noteId);
            return;
        }

        // 点击笔记项本身
        this.handleNoteItemClick(noteId);
    },
    
    // 处理笔记项点击（选择笔记）
    handleNoteItemClick(noteId) {
        console.log(`点击笔记: ${noteId}`);
        
        // 更新UI选中状态
        this.notesListUI.selectNote(noteId);
        
        // 获取笔记数据
        const note = NoteDB.getNoteById(noteId);
        if (!note) {
            console.warn(`笔记不存在: ${noteId}`);
            return;
        }
        
        // 触发笔记选中事件
        this.dispatchNoteSelectedEvent(note);
    },
    
    // 处理移动笔记按钮点击
    handleMoveNoteClick(noteId) {
        console.log(`移动笔记: ${noteId}`);
        
        if(SidebarUI.currentCategoryId==='deleted')
            return;

        this.noteToMove = noteId;
        
        // 显示移动笔记模态框
        this.showMoveNoteModal();
    },

    
    // 处理删除笔记按钮点击
    handleDeleteNoteClick(noteId) {
        if(SidebarUI.currentCategoryId === 'deleted'){
            console.log(`永久删除笔记: ${noteId}`);
            
            const note = NoteDB.getNoteById(noteId);
            if (!note) return;
            
            // 确认删除
            if (confirm(`确定要永久删除笔记 "${note.title}" 吗？此操作不可恢复！`)) {
                // 如果已登录，调用服务器API
                if (authManager.getCurrentUser()) {
                    NoteDB.permanentlyDeleteNoteFromServer(noteId).then(result => {
                        if (result.success) {
                            // 从本地数据中删除
                            NoteDB.deleteNote(noteId);
                            
                            // 从UI移除
                            this.notesListUI.removeNoteFromList(noteId);
                            
                            // 显示提示
                            this.notesListUI.showToast('笔记已永久删除', 'success');
                            
                            // 触发笔记删除事件
                            this.dispatchNoteDeletedEvent(noteId);
                            
                            // 更新侧边栏统计
                            SidebarUI.updateSidebarStats();
                        } else {
                            this.notesListUI.showToast(result.message, 'error');
                        }
                    });
                } else {
                    // 未登录，使用本地版本
                    const success = NoteDB.deleteNote(noteId);
                    
                    if (success) {
                        this.notesListUI.removeNoteFromList(noteId);
                        this.notesListUI.showToast('笔记已永久删除', 'success');
                        this.dispatchNoteDeletedEvent(noteId);
                    } else {
                        this.notesListUI.showToast('删除失败', 'error');
                    }
                }
            }
        } else {
            const targetCategoryId = 'deleted';
            
            console.log(`软删除笔记 ${noteId}`);
            
            // 如果已登录，调用服务器API
            if (authManager.getCurrentUser()) {
                NoteDB.softDeleteNoteFromServer(noteId).then(result => {
                    if (result.success) {
                        // 调用数据层移动笔记
                        const success = NoteDB.moveNoteToCategory(noteId, targetCategoryId);
                        
                        if (success) {
                            // 刷新笔记列表
                            this.notesListUI.refresh();
                            
                            // 显示提示
                            this.notesListUI.showToast('笔记已删除', 'success');
                            
                            // 触发笔记更新事件
                            const note = NoteDB.getNoteById(noteId);
                            if (note) {
                                this.dispatchNoteUpdatedEvent(note);
                            }
                        }
                    } else {
                        this.notesListUI.showToast(result.message, 'error');
                    }
                });
            } else {
                // 未登录，使用本地版本
                const success = NoteDB.moveNoteToCategory(noteId, targetCategoryId);
                
                if (success) {
                    this.notesListUI.refresh();
                    this.notesListUI.showToast('笔记已删除', 'success');
                    
                    const note = NoteDB.getNoteById(noteId);
                    if (note) {
                        this.dispatchNoteUpdatedEvent(note);
                    }
                } else {
                    this.notesListUI.showToast('删除失败', 'error');
                }
            }
        }
    },

    //设为私密按钮点击
    async handlesetprivateClick(noteId){
        if(SidebarUI.currentCategoryId==='deleted')
            return;

        console.log(`设为私密笔记: ${noteId}`);

        const note = NoteDB.getNoteById(noteId);
        if (!note) return;

        const isCurrentlyPrivate = note.categoryId === 'private';
        const action = isCurrentlyPrivate ? '取消私密' : '设为私密';
        
        // 确认私密
        if (confirm('确定要把该笔记设为私密吗？')) {
            // 移动到私密分类或从未分类
            const targetCategoryId = isCurrentlyPrivate ? 'uncategorized' : 'private';
            const success =await NoteDB.moveNoteToCategory(noteId, targetCategoryId);
            
            if (success) {
                // 更新统计
                SidebarUI.updateSidebarStats();

                // 刷新笔记列表
                this.notesListUI.refresh();
                this.notesListUI.showToast(`笔记已${action}`, 'success');
                
                // 如果当前在私密分类查看，且取消了私密，该笔记会从列表中消失
                const currentCategory = this.notesListUI.getCurrentCategoryId();
                if (currentCategory === 'private' && !isCurrentlyPrivate) {
                    // 笔记被设为私密，会出现在私密列表中
                    // 但如果是在私密列表中取消私密，笔记会消失
                }
            }
        }
    },
    
    // 处理添加笔记按钮点击
    handleAddNoteClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('点击新建笔记按钮');
        
        // 获取当前分类ID
        const currentCategoryId = this.notesListUI.getCurrentCategoryId();
        
        // 创建新笔记
        this.createNewNote(currentCategoryId);
    },
    
    // 创建新笔记
    async createNewNote(categoryId) {
        // 获取当前时间戳
        const now = new Date().toISOString();
        
        // 如果categoryId是'all'（全部笔记视图），则使用'uncategorized'
        const targetCategoryId = categoryId === 'all' ? 'uncategorized' : categoryId;
        
        console.log(`创建新笔记，目标分类: ${targetCategoryId}`);
        
        // 创建笔记数据
        const newNote =await NoteDB.createNoteToServer({
            title: '新笔记',
            content: '',
            categoryId: targetCategoryId,
            tags: []
        });
        
        if (newNote) {
            // 高亮显示新笔记
            this.notesListUI.highlightNewNote(newNote.id);
            
            // 刷新笔记列表
            this.notesListUI.refresh();
            
            // 选中新笔记
            this.handleNoteItemClick(newNote.id);
            
            // 显示提示
            this.notesListUI.showToast('新笔记已创建', 'success');
            
            // 触发笔记创建事件
            this.dispatchNoteCreatedEvent(newNote);
            
            return newNote;
        }
        
        return null;
    },
    
    // 处理搜索输入
    handleSearchInput(event) {
        const query = event.target.value.trim();
        
        // 防抖处理
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }
        
        this.searchTimer = setTimeout(() => {
            this.performSearch(query);
        }, 300);
    },
    
    // 处理搜索键盘事件
    handleSearchKeydown(event) {
        // ESC键清除搜索
        if (event.key === 'Escape') {
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = '';
                this.performSearch('');
            }
        }
        
        // Enter键触发搜索
        if (event.key === 'Enter') {
            const query = event.target.value.trim();
            this.performSearch(query);
        }
    },
    
    // 执行搜索
    performSearch(query) {
        console.log(`执行搜索: ${query}`);
        
        // 更新笔记列表显示搜索结果
        this.notesListUI.searchNotes(query);
    },
    
    // 处理过滤器变化
    handleFilterChange(event) {
        const filterValue = event.target.value;
        console.log(`过滤器变化: ${filterValue}`);
        
         // 更新当前排序方式
        this.currentSortMethod = filterValue;
        
        // 获取当前显示的所有笔记
        const notesListElement = document.getElementById('notes-list');
        const noteItems = notesListElement.querySelectorAll('.note-item');
        
        if (noteItems.length === 0) {
            return;
        }
        
        // 收集所有笔记数据
        const notes = [];
        noteItems.forEach(item => {
            const noteId = item.getAttribute('data-note-id');
            const note = NoteDB.getNoteById(noteId);
            if (note) {
                notes.push(note);
            }
        });
        
        // 根据排序方式对笔记进行排序
        const sortedNotes = this.sortNotes(notes, filterValue);
        
        // 清空列表并重新渲染排序后的笔记
        this.notesListUI.clearNotesList();
        this.notesListUI.renderNotesList(sortedNotes);
        
        // 如果有选中的笔记，重新选中
        const currentNoteId = this.notesListUI.getCurrentNoteId();
        if (currentNoteId) {
            this.notesListUI.selectNote(currentNoteId);
        }
        
        // 显示排序提示
        let sortMessage = '';
        switch(filterValue) {
            case 'time':
                sortMessage = '已按编辑时间排序';
                break;
            case 'createTime':
                sortMessage = '已按创建时间排序';
                break;
            case 'title':
                sortMessage = '已按标题排序';
                break;
            default:
                sortMessage = '排序已更新';
        }
        this.notesListUI.showToast(sortMessage, 'info');
    },


    // 对笔记列表进行排序
    sortNotes(notes, sortMethod) {
        // 创建副本以避免修改原数组
        const sortedNotes = [...notes];
        
        switch(sortMethod) {
            case 'time': // 按编辑时间降序（最新编辑的在前）
                sortedNotes.sort((a, b) => {
                    return new Date(b.updatedAt) - new Date(a.updatedAt);
                });
                break;
                
            case 'createTime': // 按创建时间降序（最新创建的在前）
                sortedNotes.sort((a, b) => {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
                break;
                
            case 'title': // 按标题升序（A-Z）
                sortedNotes.sort((a, b) => {
                    const titleA = a.title.toLowerCase();
                    const titleB = b.title.toLowerCase();
                    if (titleA < titleB) return -1;
                    if (titleA > titleB) return 1;
                    return 0;
                });
                break;
                
            default:
                // 默认按编辑时间排序
                sortedNotes.sort((a, b) => {
                    return new Date(b.updatedAt) - new Date(a.updatedAt);
                });
        }
        
        return sortedNotes;
    },

    
    // 处理分类变化事件
    handleCategoryChange(event) {
        const categoryId = event.detail.categoryId;
        console.log(`收到分类变化事件: ${categoryId}`);
        
        // 重新加载该分类的笔记列表
        this.notesListUI.loadNotesByCategory(categoryId);
        
        // 清空当前选中的笔记
        this.notesListUI.clearSelection();
        
        // 触发笔记取消选中事件
        this.dispatchNoteSelectedEvent(null);
    },
    
    // 处理分类删除事件
    handleCategoryDeleted(event) {
        const categoryId = event.detail.categoryId;
        console.log(`收到分类删除事件: ${categoryId}`);
        
        // 如果删除的是当前显示的分类，切换到全部笔记
        if (categoryId === this.notesListUI.getCurrentCategoryId()) {
            this.notesListUI.loadNotesByCategory('all');
            
            // 清空当前选中的笔记
            this.notesListUI.clearSelection();
            
            // 触发笔记取消选中事件
            this.dispatchNoteSelectedEvent(null);
        } else {
            // 否则只刷新当前列表
            this.notesListUI.refresh();
        }
    },
    
    // 处理笔记创建事件
    handleNoteCreated(event) {
        const note = event.detail.note;
        console.log(`收到笔记创建事件: ${note.id}`);
        
        // 刷新笔记列表
        this.notesListUI.refresh();
    },
    
    // 处理笔记更新事件
    handleNoteUpdated(event) {
        const note = event.detail.note;
        console.log(`收到笔记更新事件: ${note.id}`);
        
        // 更新笔记列表中的该项
        this.notesListUI.updateNoteInList(note);
    },
    
    // 处理笔记删除事件
    handleNoteDeleted(event) {
        const noteId = event.detail.noteId;
        console.log(`收到笔记删除事件: ${noteId}`);
        
        // 从列表中移除笔记
        this.notesListUI.removeNoteFromList(noteId);
    },
    
    // 显示移动笔记模态框
    showMoveNoteModal() {
        const modal = document.getElementById('move-modal');
        if (!modal) {
            console.error('找不到移动笔记模态框');
            return;
        }
        
        // 填充分类选项
        this.populateMoveCategories();
        
        // 显示模态框
        modal.style.display = 'flex';
        
        // 焦点到选择框
        setTimeout(() => {
            const select = modal.querySelector('#move-to-category');
            if (select) select.focus();
        }, 100);
    },
    
    // 填充移动分类选项
    populateMoveCategories() {
        const select = document.getElementById('move-to-category');
        if (!select) return;
        
        // 清空现有选项（保留未分类）
        select.innerHTML = '<option value="uncategorized">未分类</option>';
        
        // 获取所有用户创建的分类
        const categories = NoteDB.getAllCategories().filter(cat => 
            cat.id !== 'all' && cat.id !== 'uncategorized' &&cat.id != 'deleted'
        );
        
        // 添加分类选项
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    },
    
    // 绑定移动笔记模态框事件
    bindMoveModalEvents() {
        const modal = document.getElementById('move-modal');
        if (!modal) return;
        
        // 关闭按钮
        const closeButtons = modal.querySelectorAll('.close-modal, #cancel-move');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modal.style.display = 'none';
                this.noteToMove = null;
            });
        });
        
        // 移动按钮
        const moveButton = modal.querySelector('#confirm-move');
        if (moveButton) {
            moveButton.addEventListener('click', () => {
                this.performMoveNote();
            });
        }
        
        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                this.noteToMove = null;
            }
        });
        
        // 键盘事件
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modal.style.display = 'none';
                this.noteToMove = null;
            }
            
            if (e.key === 'Enter') {
                this.performMoveNote();
            }
        });
    },
    
    // 执行移动笔记操作
    async performMoveNote() {
        if (!this.noteToMove) return;
        
        const select = document.getElementById('move-to-category');
        if (!select) return;
        
        const targetCategoryId = select.value;
        
        console.log(`移动笔记 ${this.noteToMove} 到分类 ${targetCategoryId}`);
        
        // 调用数据层移动笔记
        const success = await NoteDB.moveNoteToCategory(this.noteToMove, targetCategoryId);
        
        if (success) {
            // 关闭模态框
            const modal = document.getElementById('move-modal');
            if (modal) modal.style.display = 'none';
            
            // 刷新笔记列表
            this.notesListUI.refresh();
            
            // 显示提示
            this.notesListUI.showToast('笔记已移动', 'success');
            
            // 触发笔记更新事件
            const note = NoteDB.getNoteById(this.noteToMove);
            if (note) {
                this.dispatchNoteUpdatedEvent(note);
            }
        } else {
            this.notesListUI.showToast('移动失败', 'error');
        }
        
        // 重置状态
        this.noteToMove = null;
    },
    
    // 分发笔记选中事件
    dispatchNoteSelectedEvent(note) {
        const event = new CustomEvent('noteSelected', {
            detail: { note },
            bubbles: true
        });
        
        document.dispatchEvent(event);
        console.log('分发noteSelected事件:', note ? note.id : 'null');
    },
    
    // 分发笔记创建事件
    dispatchNoteCreatedEvent(note) {
        const event = new CustomEvent('noteCreated', {
            detail: { note },
            bubbles: true
        });
        
        document.dispatchEvent(event);
        console.log('分发noteCreated事件:', note.id);
    },
    
    // 分发笔记更新事件
    dispatchNoteUpdatedEvent(note) {
        const event = new CustomEvent('noteUpdated', {
            detail: { note },
            bubbles: true
        });
        
        document.dispatchEvent(event);
        console.log('分发noteUpdated事件:', note.id);
    },
    
    // 分发笔记删除事件
    dispatchNoteDeletedEvent(noteId) {
        const event = new CustomEvent('noteDeleted', {
            detail: { noteId },
            bubbles: true
        });
        
        document.dispatchEvent(event);
        console.log('分发noteDeleted事件:', noteId);
    },
    
    // 清空搜索
    clearSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        
        this.performSearch('');
    },
    
    // 刷新列表
    refresh() {
        this.notesListUI.refresh();
    },

    // 获取当前排序方式
    getCurrentSortMethod() {
        return this.currentSortMethod;
    },
    
    // 设置排序方式
    setSortMethod(method) {
        this.currentSortMethod = method;
        
        // 更新下拉选择框的值
        const filterSelect = document.querySelector('select[name="filter"]');
        if (filterSelect) {
            filterSelect.value = method;
        }
        
        // 触发排序
        if (this.notesListUI) {
            this.notesListUI.refresh();
        }
    },


    // 绑定笔记拖拽事件
    bindNoteDragEvents(container) {
        // 使用事件委托处理笔记拖拽
        container.addEventListener('dragstart', (e) => this.handleNoteDragStart(e));
        container.addEventListener('dragend', (e) => this.handleNoteDragEnd(e));
        container.addEventListener('dragover', (e) => e.preventDefault());
        
        // 初始化拖拽状态
        this.noteDragState = {
            isDraggingNote: false,
            draggedNoteId: null,
            draggedNoteElement: null
        };
    },

    // 笔记拖拽开始
    handleNoteDragStart(event) {
        const noteItem = event.target.closest('.note-item');
        if (!noteItem) return;
        
        const noteId = noteItem.getAttribute('data-note-id');
        if (!noteId) return;
        
        // 保存拖拽状态
        this.noteDragState.isDraggingNote = true;
        this.noteDragState.draggedNoteId = noteId;
        this.noteDragState.draggedNoteElement = noteItem;
        
        // 设置拖拽数据
        event.dataTransfer.setData('text/plain', noteId);
        event.dataTransfer.effectAllowed = 'move';
        
        // 添加拖拽样式
        noteItem.classList.add('note-dragging');
        
        console.log('开始拖拽笔记:', noteId);
    },

    // 笔记拖拽结束
    handleNoteDragEnd(event) {
        
        if (this.noteDragState.draggedNoteElement) {
            this.noteDragState.draggedNoteElement.classList.remove('note-dragging');
        }
        
        this.noteDragState.isDraggingNote = false;
        this.noteDragState.draggedNoteId = null;
        this.noteDragState.draggedNoteElement = null;
        
        // 移除所有分类的拖拽悬停样式
        document.querySelectorAll('.category-item.note-drop-target').forEach(item => {
            item.classList.remove('note-drop-target');
        });

        console.log('笔记拖拽结束');
    },


    // 显示设置隐私密码模态框
    showSetprivatepasswordModal() {
        const modal = document.getElementById('setpassword-modal');
        if (!modal) {
            console.error('找不到设置隐私密码模态框');
            return;
        }

        const inputs = document.querySelectorAll('.set-newpassword input')
        inputs.forEach(input => input.value = '');

        // 显示模态框
        modal.style.display = 'flex';
        
        // 绑定事件
        this.bindSetPasswordModalEvents(modal);
        
        // 焦点到第一个输入框
        setTimeout(() => {
            if (inputs[0]) inputs[0].focus();
        }, 100);
    },

    // 绑定设置密码模态框事件
    bindSetPasswordModalEvents(modal) {
        // 关闭按钮
        const closeButtons = modal.querySelector('.close-modal');
        closeButtons.addEventListener('click', () => {
            modal.style.display = 'none';
            this.noteToMove = null;
        });
        
        // 取消查看密码按钮
        const cancelButton = modal.querySelector('#cancel-set');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                this.clearPrivatePassword(modal);
                modal.style.display = 'none';
            });
        }
        
        // 确认密码按钮
        const confirmButton = modal.querySelector('#confirm-set');
        if (confirmButton) {
            confirmButton.addEventListener('click', () => {
                this.setPrivatePassword(modal);
            });
        }
        
        // 限制输入框只能输入数字
        const inputs = modal.querySelectorAll('.set-newpassword input');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
                if (e.target.value.length > 4) {
                    e.target.value = e.target.value.substring(0, 4);
                }
            });
            
            // 回车键确认
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.setPrivatePassword(modal);
                }
            });
        });
        
    },

    // 设置私密笔记密码
    async setPrivatePassword(modal) {
        const inputs = modal.querySelectorAll('.set-newpassword input');
        const password1 = inputs[0].value.trim();
        const password2 = inputs[1].value.trim();
        
        // 验证输入
        
        if (!/^\d{4}$/.test(password1) || !/^\d{4}$/.test(password2)) {
            this.showPasswordError(modal, '密码必须是4位数字');
            return;
        }
        
        if (password1 !== password2) {
            this.showPasswordError(modal, '两次输入的密码不一致');
            return;
        }
        
        // 设置密码
        const result =await NoteDB.setPrivatePassword(password1);
        
        if (result.success) {
            modal.style.display = 'none';
            this.notesListUI.showToast('私密笔记密码已设置', 'success');
        } else {
            this.showPasswordError(modal, result.message || '设置密码失败');
        }
    },

    // 清除私密笔记密码
    async clearPrivatePassword(modal) {
        const result =await NoteDB.clearPrivatePassword();
        
        if (result.success) {
            this.notesListUI.showToast('已取消查看私密笔记密码', 'success');
            modal.style.display='none'
        } else {
            this.notesListUI.showToast('取消密码失败', 'error');
        }
    },

    // 显示密码错误信息
    showPasswordError(modal, message) {
        
        // 创建一个错误提示元素
        const errorDiv = modal.querySelector('.set-password-error')
        errorDiv.textContent = message;
        
        // 3秒后清除错误信息
        setTimeout(() => {
            errorDiv.textContent = '';
        }, 3000);
    },


    // 添加恢复笔记的方法
    handleRestoreNoteClick(noteId) {
        console.log(`恢复笔记: ${noteId}`);
        
        const note = NoteDB.getNoteById(noteId);
        if (!note) return;
        
        if (confirm(`确定要恢复笔记 "${note.title}" 吗？`)) {
            // 如果已登录，调用服务器API
            if (authManager.getCurrentUser()) {
                NoteDB.restoreNoteFromServer(noteId).then(result => {
                    if (result.success) {
                        // 移动到未分类
                        const success = NoteDB.moveNoteToCategory(noteId, result.data.category_id || 'uncategorized');
                        
                        if (success) {
                            // 刷新笔记列表
                            this.notesListUI.refresh();
                            
                            // 显示提示
                            this.notesListUI.showToast('笔记已恢复', 'success');
                            
                            // 更新侧边栏统计
                            SidebarUI.updateSidebarStats();
                        }
                    } else {
                        this.notesListUI.showToast(result.message, 'error');
                    }
                });
            } else {
                // 未登录，使用本地版本
                const success = NoteDB.moveNoteToCategory(noteId, 'uncategorized');
                
                if (success) {
                    this.notesListUI.refresh();
                    this.notesListUI.showToast('笔记已恢复', 'success');
                    SidebarUI.updateSidebarStats();
                }
            }
        }
    },

};

// 导出模块
export default NotesListListener;