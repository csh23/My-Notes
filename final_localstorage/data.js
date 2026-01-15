import SidebarUI from "./ui/bar.js";

const STORAGE_KEY = 'noteManagementSystemData';

// 定义默认数据结构
const DEFAULT_DATA = {
    categories: [
        { id: "uncategorized", name: "未分类", notes: [] } ,  //未分类笔记
        { id: "private", name: "私密", notes: [] },
        { id: "deleted", name: "最近删除", notes: [] }
    ],
    notes: [],
    lastNoteId: 0,
    lastCategoryId: 0,
    password: null
};

// 数据库对象
const NoteDB = {
    data:null,


    // 初始化数据库
    init() {
        console.log('初始化数据库');
        this.loadFromStorage();
        return this;

        
    },


    //从localStorage加载数据，如果没有则使用默认数据
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);   //获取数据
            if (stored) {
                const parsed = JSON.parse(stored);  //字符串转换成js对象
                
                // 确保数据格式正确
                this.data = {
                    ...DEFAULT_DATA,
                    ...parsed,   //后面的如果有和前面的同名，会进行覆盖

                    //单独设置categories，防止重叠后丢失
                    categories: [
                        ...DEFAULT_DATA.categories,
                        ...(parsed.categories || []).filter(cat => 
                            cat.id !== 'all' && cat.id !== 'uncategorized' &&cat.id !=='private' &&cat.id!=='deleted'
                        )
                    ]
                };
                console.log('从本地存储加载数据成功', this.data);
            } else {
                // 没有存储的数据，使用默认数据
                this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
                this.saveToStorage();
                console.log('使用默认数据初始化', this.data);
            }
            
            // 更新关联关系
            this.updateCategoryNoteReferences();
            return true;
        } catch (error) {
            console.error('加载数据失败:', error);
            this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
            this.saveToStorage();
            return false;
        }
    },

     /**
     * 更新分类中的笔记引用关系
     * 确保categories.notes数组包含正确的笔记ID
     */
    updateCategoryNoteReferences() {
        if (!this.data) return;
        
        //  重置所有分类的notes数组
        this.data.categories.forEach(category => {
            category.notes = [];
        });
        
        //  根据笔记的categoryId，将笔记ID添加到对应分类
        this.data.notes.forEach(note => {
            const category = this.data.categories.find(cat => cat.id === note.categoryId);
            if (category && !category.notes.includes(note.id)) {
                category.notes.push(note.id);
            }
        });
    },


    /**
     * 保存数据到localStorage
     */
    saveToStorage() {
        try {
            // 保存前更新关联关系
            this.updateCategoryNoteReferences();
            
            // 不保存默认分类的notes数组，因为它们是计算得到的
            const dataToSave = {
                categories: this.data.categories.filter(cat => 
                    cat.id !== 'all' && cat.id !== 'uncategorized'
                ),
                notes: this.data.notes,
                lastNoteId: this.data.lastNoteId,
                lastCategoryId: this.data.lastCategoryId
            };
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
            console.log('数据保存成功');
            return true;
        } catch (error) {
            console.error('保存数据失败:', error);
            return false;
        }
    },



    getAllNotes() {
        //不含私密
        return this.data.notes.filter(note => note.categoryId !== 'private'&&note.categoryId!=='deleted');
    },

    /**
     * 根据ID获取笔记
     * @param {string} id 笔记ID
     * @returns {Object|null} 笔记对象或null
     */
    getNoteById(id) {
        return this.data.notes.find(note => note.id === id) || null;
    },

    /**
     * 创建新笔记
     * @param {Object} noteData 笔记数据
     * @returns {Object} 创建的笔记对象
     */
    createNote(noteData) {
        // 生成唯一ID
        const noteId = `note_${Date.now()}_${++this.data.lastNoteId}`;
        const now = new Date().toISOString();
        
         // 确保categoryId不是'all'
        let categoryId = noteData.categoryId || 'uncategorized';
        if (categoryId === 'all') {
            console.warn('检测到categoryId为"all"，自动转换为"uncategorized"');
            categoryId = 'uncategorized';
        }
        
        // 验证分类是否存在（除非是'uncategorized'）
        if (categoryId !== 'uncategorized' && !this.getCategoryById(categoryId)) {
            console.warn(`分类 ${categoryId} 不存在，自动转换为"uncategorized"`);
            categoryId = 'uncategorized';
        }


        const newNote = {
            id: noteId,
            title: noteData.title || '无标题笔记',
            content: noteData.content || '',
            categoryId: noteData.categoryId || 'uncategorized',
            createdAt: now,
            updatedAt: now,
            tags: noteData.tags || [],
        };
        
        // 添加到notes数组
        this.data.notes.push(newNote);
        
        // 保存到本地存储
        this.saveToStorage();
        
        console.log('创建笔记:', newNote);
        return newNote;
    },

     /**
     * 更新笔记
     * @param {string} id 笔记ID
     * @param {Object} updates 更新内容
     * @returns {Object|null} 更新后的笔记对象或null
     */
    updateNote(id, updates) {
        const noteIndex = this.data.notes.findIndex(note => note.id === id);
        
        if (noteIndex === -1) {
            console.warn('未找到要更新的笔记:', id);
            return null;
        }
        
        // 更新笔记
        this.data.notes[noteIndex] = {
            ...this.data.notes[noteIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        // 保存到本地存储
        this.saveToStorage();
        
        console.log('更新笔记:', this.data.notes[noteIndex]);
        return this.data.notes[noteIndex];
    },
    
    /**
     * 删除笔记
     * @param {string} id 笔记ID
     * @returns {boolean} 是否删除成功
     */
    deleteNote(id) {
        const noteIndex = this.data.notes.findIndex(note => note.id === id);
        
        if (noteIndex === -1) {
            console.warn('未找到要删除的笔记:', id);
            return false;
        }
        
        // 从数组中移除
        this.data.notes.splice(noteIndex, 1);
        
        // 保存到本地存储
        this.saveToStorage();
        
        console.log('删除笔记成功:', id);
        return true;
    },
    


    /**
     * 根据分类ID获取笔记
     * @param {string} categoryId 分类ID
     * @returns {Array} 笔记数组
     */
    getNotesByCategory(categoryId) {

        //全部笔记单独逻辑
        if (categoryId === 'all') {
            return this.data.notes.filter(note => note.categoryId !== 'private');
        }

        if (categoryId === 'private') {
            return this.data.notes.filter(note => note.categoryId === 'private');
    }
        
        // 其他分类也不包括私密笔记
        return this.data.notes.filter(note => 
            note.categoryId === categoryId && note.categoryId !== 'private'
        );
    },
    
    /**
     * 搜索笔记
     * @param {string} query 搜索关键词
     * @returns {Array} 搜索结果数组
     */
    searchNotes(query) {
        if (!query.trim()) {
            return [];
        }
        
        //tolowcase是转为小写的方法，把所有都转为小写是为了实现区分大小写
        const q = query.toLowerCase();

        if(SidebarUI.currentCategoryId!=='private'&&SidebarUI.currentCategoryId!=='deleted'){
            return this.data.notes.filter(note => {
                // 排除私密笔记
                if (note.categoryId === 'private'||note.categoryId === 'deleted') {
                    return false;
                }
                
                // 搜索标题和内容
                return note.title.toLowerCase().includes(q) || 
                    note.content.toLowerCase().includes(q);
            });
        }else if(SidebarUI.currentCategoryId==='private'){
            return this.data.notes.filter(note => {
                if (note.categoryId === 'deleted') {
                    return false;
                }
                
                // 搜索标题和内容
                return note.title.toLowerCase().includes(q) || 
                    note.content.toLowerCase().includes(q);
            });
        }else{
            return this.data.notes.filter(note => 
                note.title.toLowerCase().includes(q) || 
                note.content.toLowerCase().includes(q)
            );
        }
        
        
    },

    /**
     * 获取所有分类
     * @returns {Array} 分类数组
     */
    getAllCategories() {
        return [...this.data.categories];
    },
    
    /**
     * 根据ID获取分类
     * @param {string} id 分类ID
     * @returns {Object|null} 分类对象或null
     */
    getCategoryById(id) {
         if (id === 'all') {
            return { id: 'all', name: '全部笔记', notes: [] };
        }

        return this.data.categories.find(category => category.id === id) || null;
    },
    
    /**
     * 创建新分类
     * @param {string} name 分类名称
     * @returns {Object} 创建结果
     */
    createCategory(name) {
        // 检查名称是否已存在
        if (this.data.categories.some(cat => cat.name === name)) {
            return {
                success: false,
                message: '分类名称已存在'
            };
        }
        
        // 生成唯一ID
        const categoryId = `cat_${Date.now()}_${++this.data.lastCategoryId}`;
        
        const newCategory = {
            id: categoryId,
            name: name,
            icon: 'fas fa-folder',
            notes: []
        };
        
        // 添加到分类数组
        this.data.categories.push(newCategory);
        
        // 保存到本地存储
        this.saveToStorage();
        
        console.log('创建分类:', newCategory);
        return {
            success: true,
            category: newCategory
        };
    },
    
    /**
     * 更新分类
     * @param {string} id 分类ID
     * @param {string} newName 新名称
     * @returns {Object} 更新结果
     */
    updateCategory(id, newName) {
        // 检查是否是默认分类
        if (id === 'uncategorized') {
            return {
                success: false,
                message: '不能修改默认分类'
            };
        }
        
        const categoryIndex = this.data.categories.findIndex(cat => cat.id === id);
        
        if (categoryIndex === -1) {
            return {
                success: false,
                message: '分类不存在'
            };
        }
        
        // 检查新名称是否已存在
        if (this.data.categories.some((cat, index) => 
            cat.name === newName && index !== categoryIndex
        )) {
            return {
                success: false,
                message: '分类名称已存在'
            };
        }
        
        // 更新分类名称
        this.data.categories[categoryIndex].name = newName;
        
        // 保存到本地存储
        this.saveToStorage();
        
        console.log('更新分类成功:', this.data.categories[categoryIndex]);
        return {
            success: true,
            category: this.data.categories[categoryIndex]
        };
    },
    
    /**
     * 删除分类
     * @param {string} id 分类ID
     * @returns {Object} 删除结果
     */
    deleteCategory(id) {
        // 检查是否是默认分类
        if (id === 'uncategorized') {
            return {
                success: false,
                message: '不能删除默认分类'
            };
        }
        
        const categoryIndex = this.data.categories.findIndex(cat => cat.id === id);
        
        if (categoryIndex === -1) {
            return {
                success: false,
                message: '分类不存在'
            };
        }
        
        // 将该分类下的笔记移动到未分类
        this.data.notes.forEach(note => {
            if (note.categoryId === id) {
                note.categoryId = 'uncategorized';
            }
        });
        
        // 从数组中移除分类
        this.data.categories.splice(categoryIndex, 1);
        
        // 保存到本地存储
        this.saveToStorage();
        
        console.log('删除分类成功:', id);
        return {
            success: true
        };
    },
    
    /**
     * 移动笔记到其他分类
     * @param {string} noteId 笔记ID
     * @param {string} targetCategoryId 目标分类ID
     * @returns {boolean} 是否移动成功
     */
    moveNoteToCategory(noteId, targetCategoryId) {
        const note = this.getNoteById(noteId);
        
        if (!note) {
            console.warn('未找到要移动的笔记:', noteId);
            return false;
        }
        
        if (!this.getCategoryById(targetCategoryId)) {
            console.warn('目标分类不存在:', targetCategoryId);
            return false;
        }
        
        // 更新笔记的分类ID
        note.categoryId = targetCategoryId;
        
        // 保存到本地存储
        this.saveToStorage();
        
        console.log(`移动笔记 ${noteId} 到分类 ${targetCategoryId}`);
        return true;
    },
    
    // ====== 统计方法 ======
    /**
     * 获取统计数据
     * @returns {Object} 统计对象
     */
    getStats() {
        const totalNotes = this.data.notes.length;
        const notesByCategory = {};
        
        // 计算每个分类的笔记数量
        notesByCategory['all'] = totalNotes; // 全部笔记数量

        this.data.categories.forEach(category => {
            notesByCategory[category.id] = category.notes.length;
        });
        
        // 计算存储大小
        const storageSize = JSON.stringify(this.data).length;
        const storageSizeKB = (storageSize / 1024).toFixed(2);
        
        return {
            totalNotes,
            notesByCategory,
            storageSize,
            storageSizeKB
        };
    },



    /**
     * 清除所有数据（重置为默认）
     * @returns {boolean} 是否清除成功
     */
    clearAllData() {
        try {
            this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
            this.saveToStorage();
            console.log('数据已清除，恢复默认');
            return true;
        } catch (error) {
            console.error('清除数据失败:', error);
            return false;
        }
    },


    /**
     * 设置私密笔记密码
     * @param {string} password 密码（4位数字）
     * @returns {boolean} 是否设置成功
     */
    setPrivatePassword(password) {
        if (!/^\d{4}$/.test(password)) {
            return { success: false, message: '密码必须是4位数字' };
        }
        
        DEFAULT_DATA.password = password;
        this.saveToStorage();
        console.log('私密笔记密码已设置');
        return { success: true };
    },

    /**
     * 验证私密笔记密码
     * @param {string} password 待验证的密码
     * @returns {boolean} 是否验证通过
     */
    verifyPrivatePassword(password) {
        if (DEFAULT_DATA.password===null) {
            return true; // 没有设置密码，直接通过
        }
        return DEFAULT_DATA.password === password;
    },

    /**
     * 清除私密笔记密码
     * @returns {boolean} 是否清除成功
     */
    clearPrivatePassword() {
        DEFAULT_DATA.password = null;
        this.saveToStorage();
        console.log('私密笔记密码已清除');
        return { success: true };
    },

    /**
     * 获取私密笔记密码状态
     * @returns {Object} 密码状态
     */
    getPasswordStatus() {
        if(DEFAULT_DATA.password===null){
            return false
        }
    },

    // 保存语言设置
    setLanguage(langCode) {
        try {
            localStorage.setItem('noteAppLanguage', langCode);
            return true;
        } catch (error) {
            console.error('保存语言设置失败:', error);
            return false;
        }
    },

    // 获取语言设置
    getLanguage() {
        const saved = localStorage.getItem('noteAppLanguage');
        const browserLang = navigator.language || 'zh-CN';
        return saved || (browserLang.startsWith('zh') ? 'zh-CN' : 'en-US');
    },

} 
    // 4. 立即初始化并导出
    NoteDB.init();

    // 5. 导出数据库实例
    export default NoteDB;