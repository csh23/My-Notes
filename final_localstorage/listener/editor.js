
import NoteDB from '../data.js';

const EditorListener = {
    // 保存更改的防抖定时器
    saveTimer: null,
    
    // 自动保存延迟时间（毫秒）
    AUTO_SAVE_DELAY: 1000,
    
    // 当前正在编辑的原始笔记（用于检查更改）
    originalNote: null,
    
    // 初始化编辑器事件监听
    init(editorUI) {
        console.log('初始化编辑器事件监听');
        
        this.editorUI = editorUI;
        
        this.bindEvents();
        
        return this;
    },
    
    // 绑定所有编辑器相关事件
    bindEvents() {
        // 绑定标题输入事件
        const titleInput = document.getElementById('note-title');
        if (titleInput) {
            titleInput.addEventListener('input', (e) => this.handleTitleChange(e));
            titleInput.addEventListener('blur', (e) => this.handleTitleBlur(e));
        }
        
        // 绑定内容输入事件
        const contentTextarea = document.getElementById('note-content');
        if (contentTextarea) {
            contentTextarea.addEventListener('blur', (e) => this.handleContentBlur(e));
            contentTextarea.addEventListener('input', (e) => this.handleContentChange(e));
        }
        
        // 绑定富文本工具按钮事件
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleToolButtonClick(e));
        });
        
        // 绑定键盘快捷键
        this.bindKeyboardShortcuts();
    },
    
    // 处理标题变化
    handleTitleChange(event) {
        console.log('标题变化');
        
        // 更新字数统计
        this.editorUI.updateWordCount();
        
        // 自动保存
        this.scheduleAutoSave();
    },

    // 处理标题失去焦点
    handleTitleBlur(event) {
        console.log('标题失去焦点');
        
        // 立即保存
        this.autoSaveNote();
    },
    

    // 处理内容变化
    handleContentChange(event) {
        console.log('内容变化');
        
        // 更新字数统计
        this.editorUI.updateWordCount();
        
        // 自动保存
        this.scheduleAutoSave();
    },

    // 处理内容失去焦点
    handleContentBlur(event) {
        console.log('内容失去焦点');
        
        // 立即保存
        this.autoSaveNote();
    },


    // 绑定所有编辑器相关事件
    bindEvents() {
        // 绑定标题输入事件
        const titleInput = document.getElementById('note-title');
        if (titleInput) {
            titleInput.addEventListener('input', (e) => this.handleTitleChange(e));
        }
        
        // 绑定富文本编辑器输入事件
        const richEditor = document.getElementById('rich-editor');
        if (richEditor) {
            richEditor.addEventListener('input', (e) => this.handleContentChange(e));
        }
        
        
        // 绑定键盘快捷键
        this.bindKeyboardShortcuts();
    },
    
    // 安排自动保存（防抖）
    scheduleAutoSave() {
        // 清除之前的定时器
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }
        
        // 如果没有正在编辑的笔记，不自动保存
        if (!this.editorUI.currentNoteId) {
            return;
        }
        
        // 设置新的定时器
        this.saveTimer = setTimeout(() => {
            this.autoSaveNote();
        }, this.AUTO_SAVE_DELAY);
    },
    
    // 自动保存笔记
    autoSaveNote() {
        if (!this.editorUI.currentNoteId) {
            console.log('没有正在编辑的笔记，跳过自动保存');
            return;
        }
        
        // 获取当前编辑器中的数据
        const noteData = this.editorUI.getNoteData();
        
        console.log('自动保存笔记:', noteData);
        
        // 调用数据层保存
        const updatedNote = NoteDB.updateNote(this.editorUI.currentNoteId, {
            title: noteData.title,
            content: noteData.content
        });
        
        if (updatedNote) {
            // 显示保存成功提示
            this.editorUI.showSaveIndicator('已自动保存', 'success');
            
            // 更新原始笔记副本
            this.originalNote = { ...updatedNote };

            // 派发笔记更新事件，通知列表更新
            this.dispatchNoteUpdatedEvent(updatedNote);
        }
    },
    
    // 处理工具按钮点击
    handleToolButtonClick(event) {
        const button = event.currentTarget;
        const tool = button.getAttribute('data-tool');
        
        console.log('工具按钮点击:', tool);
        
        // 应用格式化
        this.editorUI.applyFormatting(tool);
        
        // 自动保存
        this.scheduleAutoSave();
    },
    
    // 绑定键盘快捷键
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // 检查是否在编辑器中
            const isInEditor = event.target.matches('#note-title, #note-content');
            
            if (!isInEditor) return;
            
            // Ctrl/Cmd + S 保存
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault(); // 阻止浏览器默认保存行为
                
                console.log('快捷键保存');
                this.autoSaveNote();
                this.editorUI.showSaveIndicator('已保存', 'success');
            }
            
            // Ctrl/Cmd + B 加粗
            if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
                event.preventDefault();
                this.editorUI.applyFormatting('bold');
            }
            
            // Ctrl/Cmd + I 斜体
            if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
                event.preventDefault();
                this.editorUI.applyFormatting('italic');
            }
        });
    },
    
    // 设置当前编辑的笔记
    setCurrentNote(note) {
        if (note) {
            this.originalNote = { ...note };
        } else {
            this.originalNote = null;
        }
    },
    
    // 手动保存当前笔记
    saveCurrentNote() {
        if (!this.editorUI.currentNoteId) {
            console.warn('没有正在编辑的笔记，无法保存');
            return null;
        }
        
        const noteData = this.editorUI.getNoteData();
        const updatedNote = NoteDB.updateNote(this.editorUI.currentNoteId, {
            title: noteData.title,
            content: noteData.content
        });
        
        if (updatedNote) {
            this.editorUI.showSaveIndicator('笔记已保存', 'success');
            this.originalNote = { ...updatedNote };

            // 派发笔记更新事件
            this.dispatchNoteUpdatedEvent(updatedNote);
        }
        
        return updatedNote;
    },
    
    // 创建新笔记
    createNewNote(categoryId = 'uncategorized') {
        // 获取编辑器中的当前内容
        const noteData = this.editorUI.getNoteData();
        
        console.log('创建新笔记，分类ID:', categoryId);
        
        // 如果当前编辑器中有内容，使用它创建新笔记
        const newNote = NoteDB.createNote({
            title: noteData.title,
            content: noteData.content,
            categoryId: categoryId
        });
        
        if (newNote) {
            // 加载新笔记到编辑器
            this.editorUI.loadNote(newNote);
            this.setCurrentNote(newNote);
            
            // 高亮显示编辑器
            this.editorUI.highlightEditor();
            
            this.editorUI.showSaveIndicator('新笔记已创建', 'success');
            
            // 派发笔记创建事件
            this.dispatchNoteCreatedEvent(newNote);

            return newNote;
        }
        
        return null;
    },
    
    // 检查是否有未保存的更改
    hasUnsavedChanges() {
        return this.editorUI.hasUnsavedChanges(this.originalNote);
    },
    
    // 清除自动保存定时器
    clearSaveTimer() {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
    },

    // 派发笔记更新事件
    dispatchNoteUpdatedEvent(note) {
        const event = new CustomEvent('noteUpdated', {
            detail: { note },
            bubbles: true
        });
        
        document.dispatchEvent(event);
        console.log('派发noteUpdated事件:', note.id);
    },
    
    // 派发笔记创建事件
    dispatchNoteCreatedEvent(note) {
        const event = new CustomEvent('noteCreated', {
            detail: { note },
            bubbles: true
        });
        
        document.dispatchEvent(event);
        console.log('派发noteCreated事件:', note.id);
    },

    // 显示设置标签模态框
    showAddtabModal() {
        const modal = document.getElementById('tab-modal');
        if (!modal) {
            console.error('找不到设置标签模态框');
            return;
        }

        const input = document.querySelector('.add-tab')

        // 显示模态框
        modal.style.display = 'flex';
        
        // 绑定事件
        this.bindAddtabEvents(modal);
        
        // 焦点到输入框
        setTimeout(() => {
            input.focus();
        }, 100);
    },

    //绑定添加标签事件
    bindAddtabEvents(modal){
        
    },

};

// 导出模块
export default EditorListener;