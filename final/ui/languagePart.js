import SidebarListener from "../listener/bar.js";
import SidebarUI from "./bar.js";
import NotesListUI from "./list.js";

const languageManager = {
    // 当前语言
    currentLanguage: null,

    init() {
        // 从localStorage获取保存的语言设置，如果没有则使用浏览器默认语言
        const savedLanguage = localStorage.getItem('noteAppLanguage');
        console.log(`savedLanguage:${savedLanguage}`)
        const browserLang = navigator.language || 'zh-CN';
        const defaultLang = savedLanguage || (browserLang.startsWith('zh') ? 'zh-CN' : 'en-US');
        
        this.currentLanguage = defaultLang;
        languageManager.applyLanguage();
        
        console.log('当前语言:', this.currentLanguage);
    },

    // 应用语言到界面
    applyLanguage(){
        const translations = this.getTranslations(this.currentLanguage);
        console.log(this.currentLanguage)
        
        // 更新设置下拉菜单
        this.updateSetsBarLanguage(translations);
        
        // 更新侧边栏
        this.updateSidebarLanguage(translations);
        
        // 更新笔记列表
        this.updateNotesListLanguage(translations);
        
        // 更新编辑器
        this.updateEditorLanguage(translations);
        
        // 更新模态框
        this.updateModalLanguage(translations);
        
        // 发送语言改变事件，让其他组件更新
        this.dispatchLanguageChangedEvent();
    },

    // 获取翻译文本
    getTranslations(langCode) {
        const translations = {
            'zh-CN': {
                // 设置下拉菜单
                '切换语言': '切换语言',
                
                // 侧边栏
                '全部笔记': '全部笔记',
                '最近删除': '最近删除',
                '未分类': '未分类',
                '私密': '私密',
                '新建': '新建',
                '管理': '管理',
                '笔记': '笔记',
                
                // 笔记列表
                '搜索笔记标题或内容...': '搜索笔记标题或内容...',
                '共条笔记': '共{count}条笔记',
                '找到条相关笔记': '找到{count}条相关笔记',
                '没有找到匹配的笔记': '没有找到匹配的笔记',
                '还没有任何笔记': '还没有任何笔记',
                '没有未分类的笔记': '没有未分类的笔记',
                '当前分类中没有笔记': '当前分类中没有笔记',
                '创建第一条笔记': '创建第一条笔记',
                '按编辑时间': '按编辑时间',
                '按创建时间': '按创建时间',
                '按标题': '按标题',
                '按分类': '按分类',
                
                // 编辑器
                '笔记标题': '笔记标题',
                '开始记录你的想法...': '开始记录你的想法...',
                '加粗': '加粗',
                '斜体': '斜体',
                '列表': '列表',
                '插入链接': '插入链接',
                '添加标签': '添加标签',
                '导出笔记': '导出笔记',
                '字': '{count}字',
                
                // 模态框
                '新建分类': '新建分类',
                '重命名分类': '重命名分类',
                '分类名称': '分类名称',
                '输入分类名称': '输入分类名称',
                '取消': '取消',
                '保存': '保存',
                '管理分类': '管理分类',
                '关闭': '关闭',
                '还没有创建任何分类': '还没有创建任何分类',
                '私密笔记密码': '私密笔记密码',
                '请输入密码': '请输入密码',
                '请确认密码': '请确认密码',
                '如未设置密码，设置后进入私密笔记需要验证': '如未设置密码，设置后进入私密笔记需要验证',
                '如已设置密码，则密码重置': '如已设置密码，则密码重置',
                '如需取消查看密码，请点击"取消查看密码"按钮': '如需取消查看密码，请点击"取消查看密码"按钮',
                '取消查看密码': '取消查看密码',
                '确认密码': '确认密码',
                '请输入私密笔记的密码': '请输入私密笔记的密码',
                '确认': '确认',
                '标签': '标签',
                '请输入标签名': '请输入标签名',
                '确认标签': '确认标签',
                '移动笔记到': '移动笔记到',
                '选择目标分类': '选择目标分类',
                '选中的笔记将被移动到所选分类': '选中的笔记将被移动到所选分类',
                '移动': '移动'
            },
            'en-US': {
                // 设置下拉菜单
                '切换语言': 'Change Language',
                
                // 侧边栏
                '全部笔记': 'All Notes',
                '最近删除': 'Recently Deleted',
                '未分类': 'Uncategorized',
                '私密': 'Private',
                '新建': 'New',
                '管理': 'Manage',
                '笔记': 'Notes',
                
                // 笔记列表
                '搜索笔记标题或内容...': 'Search notes...',
                '共条笔记': '{count} notes',
                '找到条相关笔记': 'Found {count} notes',
                '没有找到匹配的笔记': 'No matching notes found',
                '还没有任何笔记': 'No notes yet',
                '没有未分类的笔记': 'No uncategorized notes',
                '当前分类中没有笔记': 'No notes in this category',
                '创建第一条笔记': 'Create first note',
                '按编辑时间': 'By edit time',
                '按创建时间': 'By create time',
                '按标题': 'By title',
                '按分类': 'By category',
                
                // 编辑器
                '笔记标题': 'Note Title',
                '开始记录你的想法...': 'Start writing...',
                '加粗': 'Bold',
                '斜体': 'Italic',
                '列表': 'List',
                '插入链接': 'Insert link',
                '添加标签': 'Add tag',
                '导出笔记': 'Export note',
                '字': '{count} chars',
                
                // 模态框
                '新建分类': 'New Category',
                '重命名分类': 'Rename Category',
                '分类名称': 'Category Name',
                '输入分类名称': 'Enter category name',
                '取消': 'Cancel',
                '保存': 'Save',
                '管理分类': 'Manage Categories',
                '关闭': 'Close',
                '还没有创建任何分类': 'No categories created',
                '私密笔记密码': 'Private Note Password',
                '请输入密码': 'Enter password',
                '请确认密码': 'Confirm password',
                '如未设置密码，设置后进入私密笔记需要验证': 'If not set, password will be required for private notes',
                '如已设置密码，则密码重置': 'If already set, password will be reset',
                '如需取消查看密码，请点击"取消查看密码"按钮': 'Click "Cancel Password" to remove password protection',
                '取消查看密码': 'Cancel Password',
                '确认密码': 'Confirm Password',
                '请输入私密笔记的密码': 'Enter private note password',
                '确认': 'Confirm',
                '标签': 'Tags',
                '请输入标签名': 'Enter tag name',
                '确认标签': 'Confirm Tag',
                '移动笔记到': 'Move Note To',
                '选择目标分类': 'Select target category',
                '选中的笔记将被移动到所选分类': 'Selected note will be moved to chosen category',
                '移动': 'Move'
            }
            // 可以继续添加日语、韩语等翻译...
        };
        
        // 如果目标语言没有翻译，使用英语作为后备
        return translations[langCode] || translations['en-US'];
    },

    // 更新设置下拉菜单语言
    updateSetsBarLanguage(translations) {
        const setsBar = document.querySelector('.sets-bar');
        if (setsBar) {
            const languageLink = setsBar.querySelector('.language');
            if (languageLink) {
                languageLink.textContent = translations['切换语言'];
            }
        }
    },

    // 更新侧边栏语言
    updateSidebarLanguage(translations) {
        // 更新标题
        const sidebarHeader = document.querySelector('.sidebar-header h2');
        if (sidebarHeader) {
            sidebarHeader.textContent = translations['笔记'];
        }
        
        // 更新分类项
        const categoryItems = document.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            const categoryId = item.getAttribute('data-category-id');
            const nameSpan = item.querySelector('.category-name, .private-name');
            
            if (nameSpan) {
                let translationKey = '';
                switch(categoryId) {
                    case 'all': translationKey = '全部笔记'; break;
                    case 'deleted': translationKey = '最近删除'; break;
                    case 'uncategorized': translationKey = '未分类'; break;
                    case 'private': translationKey = '私密'; break;
                }
                
                if (translationKey && translations[translationKey]) {
                    nameSpan.textContent = translations[translationKey];
                }
            }
        });

        const privateItem = document.querySelector('.private-item')
        if(privateItem){
            const nameSpan = privateItem.querySelector('.private-name')
            nameSpan.textContent = translations['私密'];
        }
        
        // 更新按钮
        const addButton = document.getElementById('add-categories-btn');
        const manageButton = document.getElementById('manage-categories-btn');
        
        if (addButton) addButton.textContent = translations['新建'];
        if (manageButton) manageButton.textContent = translations['管理'];
    },

    // 更新笔记列表语言
    updateNotesListLanguage(translations) {
        // 搜索框占位符
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.placeholder = translations['搜索笔记标题或内容...'];
        }

        // 排序下拉框
        const filterSelect = document.querySelector('select[name="filter"]');
        if (filterSelect) {
            const options = filterSelect.querySelectorAll('option');
            if (options.length >= 4) {
                options[0].textContent = translations['按编辑时间'];
                options[1].textContent = translations['按创建时间'];
                options[2].textContent = translations['按标题'];
                options[3].textContent = translations['按分类'];
            }
        }

        NotesListUI.refresh()
        
        const title =document.querySelector('#current-category-title')
        if(title){
            const t= title.textContent
            if(t.includes('全部')||t.includes('All')){
                title.textContent = translations['全部笔记']
            }else if(t.includes('最近删除')||t.includes('Recently')){
                title.textContent = translations['最近删除']
            }else if(t.includes('未分类')||t.includes('Uncategorized')){
                title.textContent = translations['最近删除']
            }
        }
    },

    // 更新笔记列表空白状态
    updateListBlank(translations){
        const blanktip = document.querySelector('.empty-state p')
        console.log(blanktip)
        if(blanktip){
            const t = blanktip.textContent
            if(t.includes('当前分类中没有笔记')||t.includes('No notes in this category')){
                blanktip.textContent = translations['当前分类中没有笔记']
            }else if(t.includes('没有未分类的笔记')||t.includes('No uncategorized notes')){
                blanktip.textContent = translations['没有未分类的笔记']
            }else if(t.includes('还没有任何笔记')||t.includes('No notes yet')){
                blanktip.textContent = translations['还没有任何笔记']
            }else if(t.includes('没有找到匹配的笔记')||t.includes('No matching notes found')){
                blanktip.textContent = translations['没有找到匹配的笔记']
            }
        }

        const setbutton = document.getElementById('add-first-note')
        if(setbutton){
            setbutton.textContent = translations['创建第一条笔记'];
        }

        
    },


    // 更新编辑器语言
    updateEditorLanguage(translations) {
        // 标题输入框
        const titleInput = document.getElementById('note-title');
        if (titleInput) {
            titleInput.placeholder = translations['笔记标题'];
        }
        
        // 富文本编辑器占位符
        const richEditor = document.getElementById('rich-editor');
        if (richEditor) {
            richEditor.setAttribute('data-placeholder', translations['开始记录你的想法...']);
            if (!richEditor.innerHTML || richEditor.innerHTML === '<br>') {
                richEditor.innerHTML = '';
            }
        }
        
        // 工具按钮标题
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(btn => {
            const tool = btn.getAttribute('data-tool');
            let title = '';
            
            switch(tool) {
                case 'bold': title = translations['加粗']; break;
                case 'italic': title = translations['斜体']; break;
                case 'list': title = translations['列表']; break;
                case 'link': title = translations['插入链接']; break;
                case 'tab': title = translations['添加标签']; break;
                case 'output': title = translations['导出笔记']; break;
            }
            
            if (title) {
                btn.setAttribute('title', title);
                const icon = btn.querySelector('i');
                if (icon) {
                    btn.setAttribute('aria-label', title);
                }
            }
        });
    },

    // 更新模态框语言
    updateModalLanguage(translations) {
        // 分类模态框
        const categoryModal = document.getElementById('category-modal');
        if (categoryModal) {
            const inputs = categoryModal.querySelectorAll('input[placeholder]');
            inputs.forEach(input => {
                if (input.placeholder.includes('分类名称')) {
                    input.placeholder = translations['输入分类名称'];
                }
            });
            
            const labels = categoryModal.querySelectorAll('label');
            labels.forEach(label => {
                if (label.textContent.includes('分类名称')) {
                    label.textContent = translations['分类名称'];
                }
            });
        }
       
    },

    // 显示语言切换提示
    showLanguageChangedToast(langCode) {
        const languageNames = {
            'zh-CN': '中文',
            'en-US': 'English',
            'ja-JP': '日本語',
            'ko-KR': '한국어'
        };
        
        const languageName = languageNames[langCode] || langCode;
        const message = `Language changed to ${languageName}`;
        
        SidebarUI.showToast(message, 'success');
    },

    // 分发语言改变事件
    dispatchLanguageChangedEvent() {
        const language = this.currentLanguage || localStorage.getItem('noteAppLanguage') || 'zh-CN';

        const event = new CustomEvent('languageChanged', {
            detail: { language},
            bubbles: true
        });
        
        document.dispatchEvent(event);
        console.log('分发languageChanged事件:', language);
    },
}

export default languageManager;