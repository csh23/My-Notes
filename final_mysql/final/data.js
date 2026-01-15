import authManager from "./auth.js";
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
    password: null,
    // auth_token:null,
    // user:null
};

// 数据库对象
const NoteDB = {
    data:null,
    apiBase: './api/', // API地址

    // 获取请求头
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        const authHeader = authManager.getAuthHeader();
        return { ...headers, ...authHeader };
    },

    // 初始化数据库
    async init() {
        console.log('初始化数据库');
        
        // 检查用户是否登录
        const isAuthenticated = await authManager.checkAuth();
        if (!isAuthenticated) {
            console.log('用户未登录，使用本地存储模式');
            return this.loadFromStorage();
        }
        
        // 已登录，从服务器加载数据
        await this.loadFromServer();
        return this;
        
    },

    //从服务器加载
    async loadFromServer() {
        try {
            // 加载笔记
            const notesResponse = await fetch(`${this.apiBase}notes.php`, {
                headers: this.getHeaders()
            });
            
            if (!notesResponse.ok) {
                throw new Error('加载笔记失败');
            }
            
            const notesData = await notesResponse.json();
            
            // 加载分类
            const categoriesResponse = await fetch(`${this.apiBase}categories.php`, {
                headers: this.getHeaders()
            });
            if (!categoriesResponse.ok) {
                throw new Error('加载分类失败');
            }
            
            const categoriesData = await categoriesResponse.json();
            
            // 加载用户设置
            const settingsResponse = await fetch(`${this.apiBase}user_settings.php`, {
                headers: this.getHeaders()
            });
            
            const settingsData = await settingsResponse.json();
            
            this.data = {
                ...DEFAULT_DATA,
                notes: notesData.notes || [],
                categories: [
                    ...DEFAULT_DATA.categories,
                    ...(categoriesData.categories || []).filter(cat => 
                    !['all', 'uncategorized', 'private', 'deleted'].includes(cat.id))//过滤了默认分类
                ],
                settings: settingsData.settings || {},
                password: settingsData.settings.private_password||null,
            };
            
            console.log('从服务器加载数据成功', this.data);
            return true;
        } catch (error) {
            console.error('从服务器加载数据失败:', error);
            return this.loadFromStorage();
        }
    },

    // 保存数据到服务器
    async saveNoteToServer(noteData) {
        try {
            const response = await fetch(`${this.apiBase}notes.php`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(noteData)
            });
            
            if (response.ok) {
                const data = await response.json();
                return { success: true, noteId: data.note_id };
            } else {
                return { success: false, message: '保存失败' };
            }
        } catch (error) {
            console.error('保存笔记到服务器失败:', error);
            // 失败时保存到本地
            location.reload();
            return this.saveToStorage();
        }
    },


    //从localStorage加载数据，如果没有则使用默认数据
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);   //获取数据
            if (stored) {
                const parsed = JSON.parse(stored);  //字符串转换成js对象
                
                // 获取存储中的分类，排除默认分类
                const storedCategories = (parsed.categories || []).filter(cat => 
                    !['all', 'uncategorized', 'private', 'deleted'].includes(cat.id)
                );

                // 确保数据格式正确
                this.data = {
                    ...DEFAULT_DATA,
                    ...parsed,   //后面的如果有和前面的同名，会进行覆盖

                    //单独设置categories，防止重叠后丢失
                    categories: [
                        ...DEFAULT_DATA.categories,
                        ...storedCategories
                    ],
                    password: parsed.password || DEFAULT_DATA.password
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
                lastCategoryId: this.data.lastCategoryId,
                password: this.data.password
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
        
        this.data.notes.push(newNote);
        this.saveToStorage();
        
        
        console.log('创建笔记:', newNote);
        return newNote;
    },

    async createNoteToServer(noteData) {
        if (authManager.getCurrentUser()) {
            // 已登录，保存到服务器
            const noteId = `note_${Date.now()}_${++this.data.lastNoteId}`;
            const result = await this.saveNoteToServer({ ...noteData, id: noteId });
            if (result.success) {
                
                const now = new Date().toISOString();

                // 确保categoryId不是'all'
                let categoryId = noteData.categoryId || 'uncategorized';
                if (categoryId === 'all') {
                    console.warn('检测到categoryId为"all"，自动转换为"uncategorized"');
                    categoryId = 'uncategorized';
                }

                const newNote = {
                    id: result.noteId,
                    title: noteData.title || '无标题笔记',
                    content: noteData.content || '',
                    categoryId: noteData.categoryId || 'uncategorized',
                    createdAt: now,
                    updatedAt: now,
                    tags: noteData.tags || []
                };
                
                this.data.notes.push(newNote);
                return newNote;
            }
        }
        
        // 未登录或保存到服务器失败，使用本地版本
        return this.createNote(noteData);
    },


    /**
     * 更新笔记到服务器
     */
    async updateNoteToServer(noteData) {
        try {
            const response = await fetch(`${this.apiBase}notes.php`, {
                method: 'PATCH',  
                headers: this.getHeaders(),
                body: JSON.stringify(noteData)
            });
            
            if (response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                const errorData = await response.json();
                return { success: false, message: errorData.message || '更新失败' };
            }
        } catch (error) {
            console.error('更新笔记到服务器失败:', error);
            return { success: false, message: '网络错误' };
        }
    },

     /**
     * 更新笔记
     * @param {string} id 笔记ID
     * @param {Object} updates 更新内容
     * @returns {Object|null} 更新后的笔记对象或null
     */
    async updateNote(id, updates) {
        const noteIndex = this.data.notes.findIndex(note => note.id === id);
        
        if (noteIndex === -1) {
            console.warn('未找到要更新的笔记:', id);
            return null;
        }
        
        // 创建更新后的笔记对象
        const updatedNote = {
            ...this.data.notes[noteIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        // 更新本地数据
        this.data.notes[noteIndex] = updatedNote;
        
        // 保存到本地存储
        this.saveToStorage();
        
        // 如果用户已登录，尝试保存到服务器
        if (authManager.getCurrentUser()) {
            try {
                const result = await this.updateNoteToServer(updatedNote);
                if (!result.success) {
                    console.warn('保存到服务器失败:', result.message);
                    // 可以选择显示错误提示，但不阻止本地更新
                    // this.showToast?('更新已保存到本地，但同步到服务器失败', 'warning');
                }
            } catch (error) {
                console.error('保存到服务器时发生错误:', error);
            }
        }
        
        console.log('更新笔记:', updatedNote);
        return updatedNote;
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
     * 从服务器恢复笔记
     */
    async restoreNoteFromServer(noteId) {
        try {
            const response = await fetch(`${this.apiBase}notes.php`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify({ id: noteId })
            });
            
            if (response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                const errorData = await response.json();
                return { success: false, message: errorData.message || '恢复失败' };
            }
        } catch (error) {
            console.error('恢复笔记到服务器失败:', error);
            return { success: false, message: '网络错误' };
        }
    },

    /**
     * 从服务器永久删除笔记
     */
    async permanentlyDeleteNoteFromServer(noteId) {
        try {
            const response = await fetch(`${this.apiBase}notes.php`, {
                method: 'DELETE',
                headers: this.getHeaders(),
                body: JSON.stringify({ id: noteId, permanent: true })
            });
            
            if (response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                const errorData = await response.json();
                return { success: false, message: errorData.message || '永久删除失败' };
            }
        } catch (error) {
            console.error('永久删除笔记失败:', error);
            return { success: false, message: '网络错误' };
        }
    },

    /**
     * 从服务器软删除笔记
     */
    async softDeleteNoteFromServer(noteId) {
        try {
            const response = await fetch(`${this.apiBase}notes.php`, {
                method: 'DELETE',
                headers: this.getHeaders(),
                body: JSON.stringify({ id: noteId })
            });
            
            if (response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                const errorData = await response.json();
                return { success: false, message: errorData.message || '删除失败' };
            }
        } catch (error) {
            console.error('删除笔记失败:', error);
            return { success: false, message: '网络错误' };
        }
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
        console.log(this.data.notes)
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
     * 创建分类（同步到服务器）
     * @param {string} name 分类名称
     * @returns {Object} 创建结果
     */
    async createCategory(name) {
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
            notes: []
        };
        
        // 如果用户已登录，先调用服务器端创建
        if (authManager.getCurrentUser()) {
            const serverResult = await this.createCategoryOnServer(name);
            
            if (serverResult.success) {
                // 使用服务器返回的分类ID
                newCategory.id = serverResult.categoryId || categoryId;
                console.log('服务器端创建分类成功:', newCategory.id);
            } else {
                // 服务器创建失败，仍然在本地创建，但显示警告
                console.warn('服务器创建分类失败，仅在本地创建:', serverResult.message);
                // 可以显示一个警告，但不阻止本地创建
                // this.showToast?('分类仅在本地创建，服务器同步失败', 'warning');
            }
        }
        
        // 添加到分类数组
        this.data.categories.push(newCategory);
        
        // 保存到本地存储
        this.saveToStorage();
        
        console.log('创建分类:', newCategory);
        
        // 触发分类创建事件
        const createEvent = new CustomEvent('categoryCreated', {
            detail: { category: newCategory },
            bubbles: true
        });
        document.dispatchEvent(createEvent);
        
        return {
            success: true,
            category: newCategory
        };
    },

    // 创建分类的服务器端方法
    async createCategoryOnServer(name) {
        try {
            const response = await fetch(`${this.apiBase}categories.php`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ name })
            });
            
            if (response.ok) {
                const data = await response.json();
                return { 
                    success: true, 
                    categoryId: data.category?.id,
                    data 
                };
            } else {
                const errorData = await response.json();
                return { success: false, message: errorData.message || '创建分类失败' };
            }
        } catch (error) {
            console.error('创建分类到服务器失败:', error);
            return { success: false, message: '网络错误' };
        }
    },
    
    /**
     * 更新分类（重命名，同步到服务器）
     * @param {string} id 分类ID
     * @param {string} newName 新名称
     * @returns {Object} 更新结果
     */
    async updateCategory(id, newName) {
        // 检查是否是默认分类
        if (id === 'uncategorized' || id === 'private' || id === 'deleted') {
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
        
        // 如果用户已登录，先调用服务器端更新
        if (authManager.getCurrentUser()) {
            const serverResult = await this.updateCategoryOnServer(id, newName);
            
            if (!serverResult.success) {
                return {
                    success: false,
                    message: serverResult.message || '服务器更新失败'
                };
            }
            
            console.log('服务器端更新分类成功:', id);
        }
        
        // 更新分类名称
        this.data.categories[categoryIndex].name = newName;
        
        // 保存到本地存储
        this.saveToStorage();
        
        console.log('本地更新分类成功:', this.data.categories[categoryIndex]);
        return {
            success: true,
            category: this.data.categories[categoryIndex]
        };
    },

    // 更新分类的服务器端方法
    async updateCategoryOnServer(categoryId, newName) {
        try {
            const response = await fetch(`${this.apiBase}categories.php`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify({ 
                    categoryId, 
                    newName 
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                const errorData = await response.json();
                return { success: false, message: errorData.message || '更新分类失败' };
            }
        } catch (error) {
            console.error('更新分类到服务器失败:', error);
            return { success: false, message: '网络错误' };
        }
    },
    
    // 删除分类的服务器端方法
    async deleteCategoryFromServer(categoryId) {
        try {
            const response = await fetch(`${this.apiBase}categories.php`, {
                method: 'DELETE',
                headers: this.getHeaders(),
                body: JSON.stringify({ categoryId })
            });
            
            if (response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                const errorData = await response.json();
                return { success: false, message: errorData.message || '删除分类失败' };
            }
        } catch (error) {
            console.error('删除分类到服务器失败:', error);
            return { success: false, message: '网络错误' };
        }
    },

    /**
     * 删除分类（同步到服务器）
     * @param {string} id 分类ID
     * @returns {Object} 删除结果
     */
    async deleteCategory(id) {
        // 检查是否是默认分类
        if (id === 'uncategorized' || id === 'private' || id === 'deleted') {
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
        
        // 如果用户已登录，先调用服务器端删除
        if (authManager.getCurrentUser()) {
            const serverResult = await this.deleteCategoryFromServer(id);
            
            if (!serverResult.success) {
                return {
                    success: false,
                    message: serverResult.message || '服务器删除失败'
                };
            }
            
            // 服务器删除成功，继续本地删除
            console.log('服务器端删除分类成功:', id);
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
        
        console.log('本地删除分类成功:', id);
        
        // 触发分类删除事件
        const deleteEvent = new CustomEvent('categoryDeleted', {
            detail: { categoryId: id },
            bubbles: true
        });
        document.dispatchEvent(deleteEvent);
        
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
    async moveNoteToCategory(noteId, targetCategoryId) {
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
        // 如果用户已登录，尝试保存到服务器
        if (authManager.getCurrentUser()) {
            try {
                const result = await this.updateNoteToServer(note);
                if (!result.success) {
                    console.warn('保存到服务器失败:', result.message);
                    // 可以选择显示错误提示，但不阻止本地更新
                    // this.showToast?('更新已保存到本地，但同步到服务器失败', 'warning');
                }
            } catch (error) {
                console.error('保存到服务器时发生错误:', error);
            }
        }
        
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

        // 先更新引用关系
        this.updateCategoryNoteReferences();

        console.log(this.data.categories)
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
    async setPrivatePassword(password) {
        if (!/^\d{4}$/.test(password)) {
            return { success: false, message: '密码必须是4位数字' };
        }
        
        this.data.password = password;
        this.saveToStorage();
        // 如果用户已登录，同步到服务器
        if (authManager.getCurrentUser()) {
            const serverResult = await this.updatePrivatePasswordOnServer(password);
            
            if (!serverResult.success) {
                console.warn('同步密码到服务器失败:', serverResult.message);
                // 可以显示提示但不阻止本地设置
                // this.showToast?.('密码已保存到本地，但同步到服务器失败', 'warning');
            } else {
                console.log('私密密码已同步到服务器');
            }
        }
        console.log('私密笔记密码已设置');
        return { success: true };
    },

    // 更新私密密码到服务器
    async updatePrivatePasswordOnServer(password) {
        try {
            const response = await fetch(`${this.apiBase}user_settings.php`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ 
                    private_password: password || null 
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                const errorData = await response.json();
                return { success: false, message: errorData.message || '更新密码失败' };
            }
        } catch (error) {
            console.error('更新私密密码到服务器失败:', error);
            return { success: false, message: '网络错误' };
        }
    },

    // 从服务器获取私密密码设置
    async getPrivatePasswordFromServer() {
        try {
            const response = await fetch(`${this.apiBase}user_settings.php`, {
                headers: this.getHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.settings && data.settings.private_password) {
                    return { 
                        success: true, 
                        password: data.settings.private_password 
                    };
                }
                return { success: true, password: null };
            }
            return { success: false, message: '获取密码设置失败' };
        } catch (error) {
            console.error('从服务器获取私密密码失败:', error);
            return { success: false, message: '网络错误' };
        }
    },

    /**
     * 验证私密笔记密码
     * @param {string} password 待验证的密码
     * @returns {boolean} 是否验证通过
     */
    verifyPrivatePassword(password) {
        if (this.data.password===null) {
            return true; // 没有设置密码，直接通过
        }
        return this.data.password === password;
    },

    /**
     * 清除私密笔记密码
     * @returns {boolean} 是否清除成功
     */
   async clearPrivatePassword() {
        DEFAULT_DATA.password = null;
        this.data.password = null;
        this.saveToStorage();
        // 如果用户已登录，同步到服务器
        if (authManager.getCurrentUser()) {
            const serverResult = await this.updatePrivatePasswordOnServer(null);
            
            if (!serverResult.success) {
                console.warn('清除服务器密码失败:', serverResult.message);
            } else {
                console.log('服务器密码已清除');
            }
        }
        console.log('私密笔记密码已清除');
        return { success: true };
    },

    /**
     * 获取私密笔记密码状态
     * @returns {Object} 密码状态
     */
    getPasswordStatus() {
        if(this.data.password===null){
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
    const NoteDBInstance = NoteDB;
    export default NoteDBInstance;

    // 6. 添加一个异步初始化方法
    export const initNoteDB = async () => {
        await NoteDB.init();
        return NoteDB;
    };