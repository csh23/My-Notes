
import NoteDB from '../data.js';
import SidebarListener from '../listener/bar.js';
import NotesListListener from '../listener/list.js';
import NoteApp from '../main.js';
import languageManager from './languagePart.js';


const NotesListUI = {
    // 笔记列表容器
    notesListElement: null,
    
    // 当前选中的笔记ID
    currentNoteId: null,
    
    // 当前显示的分类ID
    currentCategoryId: 'uncategorized',
    
    // 搜索关键词
    currentSearchQuery: '',

    currentSortMethod: 'time', // 默认按编辑时间排序
    
    // 初始化笔记列表UI
    init() {
        console.log('初始化笔记列表UI');
        
        // 获取笔记列表容器
        this.notesListElement = document.getElementById('notes-list');
        if (!this.notesListElement) {
            console.error('无法找到笔记列表容器');
            return this;
        }
        
        // 获取当前分类标题元素
        this.categoryTitleElement = document.getElementById('current-category-title');
        
        // 获取详情条元素
        this.detailElement = document.querySelector('.detail p');
        
        return this;
    },
    
    // 清空笔记列表
    clearNotesList() {
        if (this.notesListElement) {
            this.notesListElement.innerHTML = '';
        }
    },
    
    // 加载指定分类的笔记列表
    loadNotesByCategory(categoryId) {
        console.log(`加载分类 ${categoryId} 的笔记列表`);
        
        this.currentCategoryId = categoryId;
        this.currentSearchQuery = ''; // 清除搜索状态
        
        // 更新分类标题
        this.updateCategoryTitle();
        
        // 获取笔记数据
        let notes = [];
        if (categoryId === 'all') {
            notes = NoteDB.getAllNotes();
        } else {
            notes = NoteDB.getNotesByCategory(categoryId);
            console.log('当前笔记：')
            console.log(notes)
        }
        
        // 对笔记进行排序
        notes = this.sortNotes(notes);
        
        // 保存当前笔记
        this.currentNotes = notes;


        // 渲染笔记列表
        this.renderNotesList(notes);
        
        // 更新详情条
        this.updateDetailBar(notes.length);
        console.log(notes)
        
        return notes;
    },
    
    // 搜索笔记
    searchNotes(query) {
        console.log(`搜索笔记: ${query}`);
        
        this.currentSearchQuery = query;
        
        // 更新分类标题
        if (query) {
            this.updateCategoryTitle(`搜索: ${query}`);
        } else {
            this.updateCategoryTitle();
        }


        // 获取搜索结果
        let notes = NoteDB.searchNotes(query);

        //从搜索结果中筛选出当前分类中的搜索结果
        if(this.getCurrentCategoryId()!=='all'){
            notes = notes.filter(note => note.categoryId === this.getCurrentCategoryId());
        }
        

        // 对笔记进行排序
        notes = this.sortNotes(notes);
        
        // 保存当前笔记
        this.currentNotes = notes;
        
        if(query===''){
            this.loadNotesByCategory(this.getCurrentCategoryId());
        }
        else{
            // 渲染笔记列表
            this.renderNotesList(notes);
        }
        
        
        // 更新详情条
        this.updateDetailBar(notes.length, query ? 'search' : 'category');
        
        return notes;
    },
    
    // 渲染笔记列表
    renderNotesList(notes) {
        if (!this.notesListElement) return;
        
        // 清空列表
        this.clearNotesList();

        console.log(notes)
        
        if (!notes || notes.length === 0) {
            // 显示空状态
            this.showEmptyState();
            return;
        }
        
        // 创建笔记项
        notes.forEach(note => {
            const noteElement = this.createNoteElement(note);
            // if(this.currentCategoryId==='private'&&note.categoryId==='private')
            this.notesListElement.appendChild(noteElement);
        });

        if(this.currentCategoryId==='private'){
            const listc = document.querySelector('.Menu')
            if(listc.children.length===0){

                const newele = document.createElement('button');
                newele.className='menu icon-btn';
                newele.innerHTML='<i class="fas fa-ellipsis-v"></i>'

                const menulist = document.createElement('div')
                menulist.className='menulist'
                menulist.innerHTML='<a href=\'#\' class=\'setPassword\' style={text-decoration=none}>设置密码</a>'
                menulist.firstChild.addEventListener('click',(e)=>NotesListListener.showSetprivatepasswordModal())
                listc.appendChild(newele)
                listc.appendChild(menulist)
            }
            else{
                const existingMenu = document.querySelector('.notes-list-header .menu');
                existingMenu.style.display='block'
            }
        }
        else{
            const existingMenu = document.querySelector('.notes-list-header .menu');
            if (existingMenu) {
                existingMenu.style.display='none';
            }
        }
    },
    
    // 创建单个笔记元素
    createNoteElement(note) {
        const noteElement = document.createElement('div');
        noteElement.className = 'note-item';
        noteElement.setAttribute('data-note-id', note.id);
        noteElement.draggable='true';
        
        // 格式化时间
        const updatedAt = this.formatDate(note.updatedAt);
        const createdAt = this.formatDate(note.createdAt);
    
        // 获取当前搜索关键词
        const keyword = this.currentSearchQuery;
        
        // 处理标题高亮
        let titleHtml = note.title || '无标题笔记';
        if (keyword) {
            titleHtml = this.highlightKeyword(titleHtml, keyword);
        }
        
        // 截取内容预览
        const contentPreview = this.getContentPreview(note.content,100,keyword);
        
        let actionButtons = '';
        if (this.currentCategoryId === 'deleted') {
            actionButtons = `
                <button class="icon-btn restore-note-btn" title="恢复笔记">
                    <i class="fas fa-undo"></i>
                </button>
                <button class="icon-btn delete-note-btn" title="永久删除">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        } else {
            actionButtons = `
                <button class="icon-btn move-note-btn" title="移动到其他分类">
                    <i class="fas fa-folder"></i>
                </button>
                <button class="icon-btn delete-note-btn" title="删除笔记">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="icon-btn set-private-btn" title="设为私密">
                    <i class="fas fa-lock"></i>
                </button>
            `;
        }

        noteElement.innerHTML = `
            <div class="note-item-header">
                <div class="note-title-container">
                    <h4 class="note-title">${titleHtml || '无标题笔记'}</h4>  
                </div>
                <span class="note-date">${updatedAt}</span>
                <div class="note-actions">
                    ${actionButtons}
                </div>
                
            </div>
            <div class="note-content-preview">
                ${contentPreview}
            </div>
            <div class="note-footer">
                <span class="note-tags">
                    ${this.renderTags(note.tags)}
                </span>
                <span class="note-meta">
                    创建时间： ${createdAt}
                </span>
            </div>
        `;
        
        // 如果这是当前选中的笔记，添加选中样式
        if (note.id === this.currentNoteId) {
            noteElement.classList.add('active');
        }
        
        return noteElement;
    },
    
    // 获取内容预览
    getContentPreview(content, maxLength = 100,keyword) {
        if (!content) return '<span class="empty-content">暂无内容</span>';
        
        // 移除HTML标签（如果存在）
        const text = content.replace(/<[^>]*>/g, '');
        
        let previewText = text;

        if (text.length > maxLength) {
            previewText = text.substring(0, maxLength) + '...';
        }
        
        // 如果有搜索关键词，进行高亮处理
        if (keyword && keyword.trim() !== '') {
            previewText = this.highlightKeyword(previewText, keyword);
        }

        return previewText;
    },
    
    // 渲染标签
    renderTags(tags) {
        if (!tags || tags.length === 0) return '';
        
        return tags.map(tag => 
            `<span class="note-tag">${tag}</span>`
        ).join('');
    },
    
    // 格式化日期
    formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return ''; // 防止 Invalid Date

        const now = new Date();

        // 辅助函数：判断是否同一天
        const isSameDay = (d1, d2) =>
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();

        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // 1. 今天
        if (isSameDay(date, now)) {
            return time;
        }

        // 2. 昨天
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (isSameDay(date, yesterday)) {
            return '昨天 '+time;
        }

        // 3. 7天内（包括前天到6天前）
        const diffTime = now - date; // 不用 Math.abs，只处理过去时间
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 0 && diffDays < 7) {
            const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            return weekdays[date.getDay()]+' '+time;
        }

        // 4. 更早
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        })+' '+time;
    },
    
    // 显示空状态
    showEmptyState() {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        
        let message = '';
        if (this.currentSearchQuery) {
            message = '没有找到匹配的笔记';
        } else if (this.currentCategoryId === 'all') {
            message = '还没有任何笔记';
        } else if (this.currentCategoryId === 'uncategorized') {
            message = '没有未分类的笔记';
        } else {
            message = '当前分类中没有笔记';
        }
        
        emptyState.innerHTML = `
            <i class="fas fa-clipboard-list"></i>
            <p>${message}</p>
            <button id="add-first-note" class="primary-btn">
                创建第一条笔记
            </button>
        `;
        
        this.notesListElement.appendChild(emptyState);

        console.log(languageManager.currentLanguage)
        console.log('kb')
        languageManager.updateListBlank(languageManager.getTranslations(languageManager.currentLanguage))
    },
    
    // 更新分类标题
    updateCategoryTitle(customTitle = null) {
        if (!this.categoryTitleElement) return;
        
        if (customTitle) {
            this.categoryTitleElement.textContent = customTitle;
            return;
        }
        
        let title = '全部笔记';
        
        if (this.currentCategoryId === 'all') {
            title = '全部笔记';
        } else if (this.currentCategoryId === 'uncategorized') {
            title = '未分类';
        } else {
            const category = NoteDB.getCategoryById(this.currentCategoryId);
            title = category ? category.name : '未知分类';
        }
        
        this.categoryTitleElement.textContent = title;
    },
    
    // 更新详情条
    updateDetailBar(count, type = 'category') {
        if (!this.detailElement) return;
        if(NoteApp.state.isAuthenticated){
            let text = '';
            if(NoteDB.data.settings.language==='zh-CN'){
                if (type === 'search') {
                    text = this.currentSearchQuery ? 
                        `找到 ${count} 条相关笔记` : 
                        `共 ${count} 条笔记`;
                } else {
                    text = `共 ${count} 条笔记`;
                }
            }else if(NoteDB.data.settings.language==='en-US'){
                if (type === 'search') {
                    text = this.currentSearchQuery ? 
                        `Find ${count} notes` : 
                        ` ${count} notes`;
                } else {
                    text = ` ${count} notes`;
                }
            }
            this.detailElement.textContent = text;
        }
        
        
        
        
    },
    
    // 选中笔记
    selectNote(noteId) {
        // 移除之前选中的笔记的高亮
        const previouslySelected = this.notesListElement.querySelector('.note-item.active');
        if (previouslySelected) {
            previouslySelected.classList.remove('active');
        }
        
        // 高亮当前选中的笔记
        const currentSelected = this.notesListElement.querySelector(`[data-note-id="${noteId}"]`);
        if (currentSelected) {
            currentSelected.classList.add('active');
            this.currentNoteId = noteId;
            
            // 滚动到选中项
            this.scrollToSelectedNote(currentSelected);
            
            console.log(`选中笔记: ${noteId}`);
            return true;
        }
        
        console.warn(`笔记不存在或未显示: ${noteId}`);
        return false;
    },
    
    // 滚动到选中的笔记
    scrollToSelectedNote(noteElement) {
        if (noteElement && this.notesListElement.scrollHeight > this.notesListElement.clientHeight) {
            noteElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    },
    
    // 添加笔记到列表
    addNoteToList(note) {
        if (!this.notesListElement) return false;
        
        // 检查是否应该显示此笔记（基于当前分类/搜索）
        const shouldShow = this.shouldShowNote(note);
        if (!shouldShow) return false;
        
        // 创建笔记元素
        const noteElement = this.createNoteElement(note);
        
        // 插入到列表顶部
        const emptyState = this.notesListElement.querySelector('.empty-state');
        if (emptyState) {
            this.notesListElement.insertBefore(noteElement, emptyState);
        } else {
            this.notesListElement.insertBefore(noteElement, this.notesListElement.firstChild);
        }
        
        // 更新详情条
        this.updateNoteCount();
        
        return true;
    },
    
    // 更新笔记列表项
    updateNoteInList(note) {
        if (!note) return false;
        
        const noteElement = this.notesListElement.querySelector(`[data-note-id="${note.id}"]`);
        if (!noteElement) return false;
        
        // 检查是否应该显示此笔记
        const shouldShow = this.shouldShowNote(note);
        
        if (!shouldShow) {
            // 如果当前不应该显示，移除该元素
            noteElement.remove();
            this.updateNoteCount();
            return false;
        }
        
        // 更新现有元素
        const newNoteElement = this.createNoteElement(note);
        
        // 保持选中状态
        if (note.id === this.currentNoteId) {
            newNoteElement.classList.add('active');
        }
        
        noteElement.replaceWith(newNoteElement);
        
        return true;
    },
    
    // 从列表中移除笔记
    removeNoteFromList(noteId) {
        const noteElement = this.notesListElement.querySelector(`[data-note-id="${noteId}"]`);
        if (noteElement) {
            noteElement.remove();
            
            // 如果移除的是当前选中的笔记，清空选中状态
            if (noteId === this.currentNoteId) {
                this.currentNoteId = null;
            }
            
            // 更新详情条
            this.updateNoteCount();
            
            return true;
        }
        
        return false;
    },
    
    // 检查笔记是否应该显示在列表中
    shouldShowNote(note) {
        // 如果是搜索状态
        if (this.currentSearchQuery) {
            const query = this.currentSearchQuery.toLowerCase();
            return note.title.toLowerCase().includes(query) || 
                   note.content.toLowerCase().includes(query);
        }
        
        // 如果是分类视图
        if (this.currentCategoryId === 'all') {
            return true;
        }
        
        return note.categoryId === this.currentCategoryId;
    },
    
    // 更新笔记数量
    updateNoteCount() {
        const notes = Array.from(this.notesListElement.querySelectorAll('.note-item'));
        const count = notes.length;
        
        this.updateDetailBar(count, this.currentSearchQuery ? 'search' : 'category');
    },
    
    // 刷新笔记列表（重新加载当前视图）
    refresh() {
        if (this.currentSearchQuery) {
            this.searchNotes(this.currentSearchQuery);
        } else {
            this.loadNotesByCategory(this.currentCategoryId);
        }
    },
    
    // 显示提示消息
    showToast(message, type = 'info') {
        // 创建或获取toast容器
        let toastContainer = document.getElementById('notes-list-toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'notes-list-toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 435px;
                transform: translateX(-50%);
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
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },
    
    // 获取当前选中的笔记ID
    getCurrentNoteId() {
        return this.currentNoteId;
    },
    
    // 获取当前显示的分类ID
    getCurrentCategoryId() {
        return this.currentCategoryId;
    },
    
    // 获取当前搜索关键词
    getCurrentSearchQuery() {
        return this.currentSearchQuery;
    },
    
    // 清空选中状态
    clearSelection() {
        this.currentNoteId = null;
        const selected = this.notesListElement.querySelector('.note-item.active');
        if (selected) {
            selected.classList.remove('active');
        }
    },
    
    // 高亮显示新添加的笔记
    highlightNewNote(noteId) {
        const noteElement = this.notesListElement.querySelector(`[data-note-id="${noteId}"]`);
        if (noteElement) {
            noteElement.classList.add('new-note-highlight');
            
            setTimeout(() => {
                noteElement.classList.remove('new-note-highlight');
            }, 2000);
        }
    },



    // 对笔记列表进行排序
    sortNotes(notes) {
        if (!notes || notes.length === 0) {
            return notes;
        }
        
        // 创建副本以避免修改原数组
        const sortedNotes = [...notes];
        
        switch(this.currentSortMethod) {
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

    // 设置排序方法
    setSortMethod(method) {
        this.currentSortMethod = method;
        // 如果当前有笔记，重新排序并渲染
        if (this.currentNotes && this.currentNotes.length > 0) {
            const sortedNotes = this.sortNotes(this.currentNotes);
            this.renderNotesList(sortedNotes);
        }
    },

    // 高亮文本中的关键词
    highlightKeyword(text, keyword) {
        if (!keyword || !text || keyword.trim() === '') {
            return text; // 如果没有关键词，直接返回原文本
        }
        
        const escapedKeyword = this.escapeRegExp(keyword);
        const regex = new RegExp(`(${escapedKeyword})`, 'gi');
        
        // 将匹配的部分用高亮标记包裹
        return text.replace(regex, '<span class="highlight">$1</span>');
    },

    // 转义正则表达式特殊字符
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },


};

// 导出模块
export default NotesListUI;