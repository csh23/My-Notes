import NoteDB from "../data.js";
import NoteApp from "../main.js";

const EditorUI = {
    // 当前正在编辑的笔记ID
    currentNoteId: null,
    
    // 编辑器状态
    editorState: {
        isBold: false,
        isItalic: false,
        isUnderline: false
    },
    
    // 初始化编辑器UI
    init() {
        console.log('初始化编辑器UI');
        
        // 获取编辑器元素
        this.editorElement = document.getElementById('rich-editor');
        if (!this.editorElement) {
            console.error('找不到富文本编辑器元素');
            return this;
        }
        
        // 设置字数统计
        this.updateWordCount();
        
        // 绑定工具栏事件
        this.bindToolbarEvents();
        
        // 绑定编辑器事件
        this.bindEditorEvents();
        
        // 初始化时清空编辑器
        this.clearEditor();
        
        return this;
    },
    
    // 绑定工具栏事件
    bindToolbarEvents() {
        // 获取所有工具按钮
        const toolButtons = document.querySelectorAll('.tool-btn');
        
        // 为每个按钮绑定点击事件
        toolButtons.forEach(button => {
            const tool = button.getAttribute('data-tool');
            
            button.addEventListener('click', (e) => {
                //e.preventDefault();
                e.stopPropagation();
                this.applyFormatting(tool);
            });
        });
    },
    
    // 绑定编辑器事件
    bindEditorEvents() {
        if (!this.editorElement) return;
        
        // 输入事件 - 更新字数统计
        this.editorElement.addEventListener('input', () => {
            this.updateWordCount();
            this.updateToolbarState();
            
            // 同步到隐藏的textarea（向后兼容）
            const textarea = document.getElementById('note-content');
            if (textarea) {
                textarea.value = this.editorElement.innerHTML;
            }
        });
        
        // 选择变化事件 - 更新工具栏状态
        this.editorElement.addEventListener('selectionchange', () => {
            this.updateToolbarState();
        });
        
        // 点击事件 - 确保光标在正确位置
        this.editorElement.addEventListener('click', () => {
            this.ensureCursorVisible();
        });
        
        // 粘贴事件 - 清理粘贴的格式
        this.editorElement.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            this.insertTextAtCursor(text);
        });
        
        // 键盘事件 - 快捷键
        this.editorElement.addEventListener('keydown', (e) => {
            this.handleEditorKeydown(e);
        });
        
        // 失去焦点时更新状态
        this.editorElement.addEventListener('blur', () => {
            this.updateToolbarState();
        });
    },
    
    // 应用格式化
    applyFormatting(format) {
        if (!this.editorElement || !format) return;
        
        // 聚焦到编辑器
        this.editorElement.focus();
        
        // 保存当前选择范围
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        
        try {
            // 执行格式命令
            switch(format) {
                case 'bold':
                    document.execCommand('bold', false, null);
                    break;
                case 'italic':
                    document.execCommand('italic', false, null);
                    break;
                case 'list':
                    // 检查当前是否在列表中
                    const inList = this.isInList();
                    if (inList) {
                        document.execCommand('insertUnorderedList', false, null);
                    } else {
                        document.execCommand('insertUnorderedList', false, null);
                    }
                    break;
                case 'link':
                    this.insertLink();
                    break;
                case 'output':
                    console.log('导出')
                    NoteApp.exportCurrentnote(NoteDB.getNoteById(this.currentNoteId))
                    //直接导出下载
                    break;
                case 'tab':
                    //显示添加标签模态框
                    break;
                default:
                    console.warn('未知的格式:', format);
                    return;
            }
            
            // 更新工具栏状态
            this.updateToolbarState();
            
            // 恢复焦点
            this.editorElement.focus();
            
            console.log(`应用格式: ${format}`);
            
            
        } catch (error) {
            console.error('应用格式失败:', error);
        }
    },
    
    // 检查是否在列表中
    isInList() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return false;
        
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const listItem = container.parentElement.closest('li');
        
        return !!listItem;
    },
    
    // 插入链接
    insertLink() {
        const url = prompt('请输入链接地址:', 'https://');
        if (!url) return;
        
        const text = prompt('请输入链接文本:', url);
        if (!text) return;
        
        // 创建链接元素
        const link = document.createElement('a');
        link.href = url;
        link.textContent = text;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        // 获取当前选区
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            // 如果已有选中文本，用链接包裹
            if (!range.collapsed) {
                const selectedText = range.toString();
                link.textContent = selectedText || text;
                range.deleteContents();
                range.insertNode(link);
            } else {
                // 如果没有选中文本，直接插入链接
                range.insertNode(link);
                
                // 移动光标到链接后
                range.setStartAfter(link);
                range.setEndAfter(link);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
        
        // 更新字数统计
        this.updateWordCount();
    },
    
    // 在光标位置插入文本
    insertTextAtCursor(text) {
        if (!this.editorElement) return;
        
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            
            // 移动光标到插入文本后
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    },
    
    // 处理编辑器键盘事件
    handleEditorKeydown(e) {
        // 快捷键：Ctrl+B 加粗
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            this.applyFormatting('bold');
        }
        
        // 快捷键：Ctrl+I 斜体
        else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
            e.preventDefault();
            this.applyFormatting('italic');
        }
        
        // Tab键缩进
        else if (e.key === 'Tab') {
            e.preventDefault();
            this.insertTextAtCursor('    ');
        }
        
        // Enter键自动添加列表项
        else if (e.key === 'Enter') {
            setTimeout(() => {
                this.autoContinueList();
            }, 10);
        }
    },
    
    // 自动继续列表
    autoContinueList() {
        if (!this.editorElement) return;
        
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        
        // 检查是否在列表项中
        const listItem = container.parentElement.closest('li');
        if (listItem) {
            const list = listItem.parentElement;
            
            // 创建新的列表项
            const newItem = document.createElement('li');
            newItem.innerHTML = '<br>';
            
            if (range.startOffset === 0 && container.textContent === '') {
                // 空列表项，移除列表格式
                listItem.remove();
                if (list.children.length === 0) {
                    list.remove();
                }
            } else {
                // 添加新列表项
                list.appendChild(newItem);
                
                // 移动光标到新项
                const newRange = document.createRange();
                newRange.setStart(newItem, 0);
                newRange.setEnd(newItem, 0);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        }
    },
    
    // 更新工具栏状态（根据当前选择）
    updateToolbarState() {
        if (!this.editorElement) return;
        
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        // 检查当前格式状态
        this.editorState.isBold = document.queryCommandState('bold');
        this.editorState.isItalic = document.queryCommandState('italic');
        this.editorState.isUnderline = document.queryCommandState('underline');
        
        // 更新按钮状态
        document.querySelectorAll('.tool-btn').forEach(btn => {
            const format = btn.getAttribute('data-tool');
            if (format === 'bold') {
                btn.classList.toggle('active', this.editorState.isBold);
                btn.title = this.editorState.isBold ? '取消加粗 (Ctrl+B)' : '加粗 (Ctrl+B)';
            } else if (format === 'italic') {
                btn.classList.toggle('active', this.editorState.isItalic);
                btn.title = this.editorState.isItalic ? '取消斜体 (Ctrl+I)' : '斜体 (Ctrl+I)';
            }
        });
    },
    
    // 确保光标可见
    ensureCursorVisible() {
        if (!this.editorElement) return;
        
        // 如果编辑器为空，确保有占位符
        if (this.editorElement.innerHTML === '' || this.editorElement.innerHTML === '<br>') {
            this.editorElement.innerHTML = '';
            this.editorElement.focus();
        }
    },
    


    // 清空编辑器
    clearEditor() {
        console.log('清空编辑器');
        
        // 清空标题
        document.getElementById('note-title').value = '';
        
        // 清空内容
        if (this.editorElement) {
            this.editorElement.innerHTML = '';
        }
        
        // 清空隐藏的textarea
        const textarea = document.getElementById('note-content');
        if (textarea) {
            textarea.value = '';
        }
        
        // 更新字数统计
        this.updateWordCount();
        
        // 重置当前笔记ID
        this.currentNoteId = null;
        
        // 重置工具栏状态
        this.resetToolbar();
        
        // 禁用编辑器
        this.setEditorEnabled(false);
    },
    
    // 重置工具栏
    resetToolbar() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
            const format = btn.getAttribute('data-tool');
            if (format === 'bold') btn.title = '加粗 (Ctrl+B)';
            if (format === 'italic') btn.title = '斜体 (Ctrl+I)';
        });
    },
    
    // 加载笔记到编辑器
    loadNote(note) {
        if (!note) {
            console.warn('加载笔记失败：笔记对象为空');
            this.clearEditor();
            return false;
        }
        
        console.log('加载笔记到编辑器:', note);
        
        // 更新当前笔记ID
        this.currentNoteId = note.id;
        
        // 填充编辑器内容
        document.getElementById('note-title').value = note.title || '';
        
        if (this.editorElement) {
            // 如果笔记内容包含HTML，直接使用
            if (note.content && note.content.includes('<')) {
                this.editorElement.innerHTML = note.content;
            } else {
                // 否则作为纯文本处理，但保留换行
                const content = note.content || '';
                this.editorElement.innerHTML = this.formatPlainText(content);
            }
            
            // 同步到隐藏的textarea
            const textarea = document.getElementById('note-content');
            if (textarea) {
                textarea.value = this.editorElement.innerHTML;
            }
        }
        
        // 更新字数统计
        this.updateWordCount();
        
        // 启用编辑器
        this.setEditorEnabled(true);
        
        // 显示保存状态提示
        this.showSaveIndicator('已加载笔记');
        
        return true;
    },
    
    // 格式化纯文本（保留换行）
    formatPlainText(text) {
        if (!text) return '';
        
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/__(.*?)__/g, '<u>$1</u>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
    },
    
    // 从编辑器获取笔记数据
    getNoteData() {
        const title = document.getElementById('note-title').value.trim();
        
        let content = '';
        if (this.editorElement) {
            // 获取HTML内容
            content = this.editorElement.innerHTML;
            
            // 清理空标签
            content = this.cleanHTML(content);
        }
        
        return {
            id: this.currentNoteId,
            title: title || '无标题笔记',
            content: content
        };
    },
    
    // 清理HTML
    cleanHTML(html) {
        if (!html) return '';
        
        // 移除空的span标签
        html = html.replace(/<span[^>]*><\/span>/g, '');
        
        // 移除空的div标签
        html = html.replace(/<div[^>]*><\/div>/g, '');
        
        // 确保没有多余的<br>标签
        html = html.replace(/(<br\s*\/?>\s*){3,}/g, '<br><br>');
        
        // 移除空的a标签
        html = html.replace(/<a[^>]*><\/a>/g, '');
        
        return html.trim();
    },
    
    // 更新字数统计
    updateWordCount() {
        if (!this.editorElement) return;
        
        // 获取纯文本内容（不含HTML标签）
        const text = this.editorElement.innerText || this.editorElement.textContent;
        const wordCount = text.length;
        
        const wordCountElement = document.getElementById('word-count');
        if (wordCountElement) {
            wordCountElement.textContent = `${wordCount} 字`;
        }
    },
    
    // 设置编辑器启用/禁用状态
    setEditorEnabled(enabled) {
        const titleInput = document.getElementById('note-title');
        
        if (titleInput) titleInput.disabled = !enabled;
        if (this.editorElement) {
            this.editorElement.contentEditable = enabled;
            this.editorElement.style.opacity = enabled ? '1' : '0.6';
            this.editorElement.style.backgroundColor = enabled ? 'white' : '#f5f5f5';
        }
        
        // 禁用/启用工具按钮
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(btn => {
            btn.disabled = !enabled;
        });
        
        // 添加视觉反馈
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            if (enabled) {
                editorContainer.classList.remove('editor-disabled');
            } else {
                editorContainer.classList.add('editor-disabled');
            }
        }
    },
    
    // 显示保存状态指示器
    showSaveIndicator(message, type = 'success') {
        let indicator = document.getElementById('save-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'save-indicator';
            indicator.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 10px 20px;
                border-radius: 4px;
                font-size: 14px;
                opacity: 0;
                transition: opacity 0.3s, transform 0.3s;
                z-index: 1000;
                pointer-events: none;
            `;
            document.body.appendChild(indicator);
        }
        
        // 设置样式和内容
        if (type === 'success') {
            indicator.style.backgroundColor = '#4CAF50';
            indicator.style.color = 'white';
        } else if (type === 'error') {
            indicator.style.backgroundColor = '#f44336';
            indicator.style.color = 'white';
        } else if (type === 'warning') {
            indicator.style.backgroundColor = '#ff9800';
            indicator.style.color = 'white';
        }
        
        indicator.textContent = message;
        
        // 显示指示器
        indicator.style.opacity = '1';
        indicator.style.transform = 'translateY(0)';
        
        // 3秒后淡出
        setTimeout(() => {
            indicator.style.opacity = '0';
            indicator.style.transform = 'translateY(10px)';
        }, 3000);
    },
    
    // 检查编辑器是否有未保存的更改
    hasUnsavedChanges(originalNote) {
        if (!originalNote) {
            // 如果是新笔记，检查是否输入了内容
            const title = document.getElementById('note-title').value.trim();
            const content = this.editorElement ? this.editorElement.innerHTML : '';
            return title.length > 0 || content.length > 0;
        }
        
        const currentData = this.getNoteData();
        return currentData.title !== originalNote.title || 
               currentData.content !== originalNote.content;
    },
    
    // 高亮显示编辑器
    highlightEditor() {
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            editorContainer.classList.add('editor-highlight');
            
            setTimeout(() => {
                editorContainer.classList.remove('editor-highlight');
            }, 1000);
        }
    }
};

// 导出模块
export default EditorUI;